const express = require("express")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const router = express.Router()
const pool = require("../db")
const { sendBookingConfirmation, sendBookingCancellation } = require("../utils/mailer")

const DURATION_OPTIONS = new Set(["day", "week", "month"])
const ACTIVE_STATUSES = ["pending", "confirmed"]

const normalizeDuration = (value) => {
  if (typeof value !== "string") return "day"
  const lower = value.toLowerCase()
  return DURATION_OPTIONS.has(lower) ? lower : "day"
}

const ensureUser = async ({ name, email, phone }) => {
  if (!email) {
    throw new Error("Email is required to create a booking")
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email])
  if (existing.rows.length) return existing.rows[0].id

  const [firstName, ...rest] = (name || email).trim().split(" ")
  const lastName = rest.join(" ") || null
  const tempPassword = crypto.randomBytes(12).toString("hex")
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const insert = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [email, passwordHash, firstName || email, lastName, phone || null, "user"],
  )

  return insert.rows[0].id
}

const computeTotalPrice = (workspace, startDate, endDate, durationUnit) => {
  const start = new Date(startDate)
  const end = new Date(endDate || startDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0

  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)

  const perDay =
    workspace.price_day ||
    (workspace.price_hour ? workspace.price_hour * 8 : null) ||
    (workspace.price_month ? workspace.price_month / 22 : null) ||
    0

  const perWeek = perDay * 5
  const perMonth = workspace.price_month || perDay * 22

  switch (durationUnit) {
    case "week":
      return Math.max(perDay * days, perWeek)
    case "month":
      return Math.max(perDay * days, perMonth)
    default:
      return perDay * days
  }
}

const parseAddons = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const fetchBookingById = async (id) => {
  const result = await pool.query(
    `SELECT
        b.*,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
          u.email
        ) AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        jsonb_build_object(
          'id', w.id,
          'name', w.name,
          'category', w.category,
          'leadTime', w.lead_time,
          'locationName', l.name,
          'locationCity', l.city
        ) AS workspace
     FROM bookings b
     LEFT JOIN users u ON b.user_id = u.id
     LEFT JOIN workspaces w ON b.workspace_id = w.id
     LEFT JOIN locations l ON w.location_id = l.id
     WHERE b.id = $1`,
    [id],
  )

  const row = result.rows[0]
  if (!row) return null
  return {
    ...row,
    user_name: row.customer_name,
    email: row.customer_email,
    phone: row.customer_phone,
    workspace: row.workspace,
  }
}

router.post("/", async (req, res) => {
  const {
    user_name,
    email,
    phone,
    workspace_id,
    start_date,
    end_date,
    start_time,
    end_time,
    duration_unit,
    payment_status,
    source,
    addons,
    notes,
  } = req.body

  if (!user_name || !email || !workspace_id || !start_date) {
    return res.status(400).json({ message: "Name, email, workspace, and start date are required" })
  }

  try {
    const userId = await ensureUser({ name: user_name, email, phone })

    const workspaceResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspace_id])
    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ message: "Workspace not found" })
    }
    const workspace = workspaceResult.rows[0]

    const duration = normalizeDuration(duration_unit)
    const computedEndDate = end_date || start_date

    // Check overlapping bookings
    const overlap = await pool.query(
      `SELECT COUNT(*) AS count
       FROM bookings
       WHERE workspace_id = $1
       AND daterange(start_date, end_date, '[]') && daterange($2, $3, '[]')
       AND status = ANY($4)`,
      [workspace_id, start_date, computedEndDate, ACTIVE_STATUSES],
    )

    const inventory = workspace.inventory_count || 1
    if (Number(overlap.rows[0].count) >= inventory) {
      return res.status(400).json({ message: "No availability for the selected dates" })
    }

    const totalPrice = computeTotalPrice(workspace, start_date, computedEndDate, duration)

    // Only set start_time / end_time for 1-day bookings
    const timeForInsert =
      duration === "day" ? { start_time: start_time || null, end_time: end_time || null } : { start_time: null, end_time: null }

    const insert = await pool.query(
      `INSERT INTO bookings (
        user_id,
        workspace_id,
        start_date,
        end_date,
        start_time,
        end_time,
        duration_unit,
        total_price,
        currency,
        status,
        payment_status,
        source,
        addons,
        notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14
      )
      RETURNING id`,
      [
        userId,
        workspace_id,
        start_date,
        computedEndDate,
        timeForInsert.start_time,
        timeForInsert.end_time,
        duration,
        totalPrice,
        "ETB",
        "pending",
        payment_status || "manual",
        source || "website",
        JSON.stringify(parseAddons(addons)),
        notes || null,
      ],
    )

    const booking = await fetchBookingById(insert.rows[0].id)
    res.status(201).json({
      message: "Booking created. Admin will confirm after review.",
      booking,
    })
  } catch (error) {
    console.error("Failed to create booking:", error)
    res.status(500).json({ message: "Server error creating booking" })
  }
})


router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         b.*,
         COALESCE(
           NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
           u.email
         ) AS customer_name,
         u.email AS customer_email,
         u.phone AS customer_phone,
         jsonb_build_object(
           'id', w.id,
           'name', w.name,
           'category', w.category,
           'leadTime', w.lead_time,
           'locationName', l.name,
           'locationCity', l.city
         ) AS workspace
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN locations l ON w.location_id = l.id
       ORDER BY b.created_at DESC`,
    )

    const bookings = result.rows.map((row) => ({
      ...row,
      user_name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      workspace: row.workspace,
    }))

    res.json(bookings)
  } catch (error) {
    console.error("Failed to fetch bookings:", error)
    res.status(500).json({ message: "Server error fetching bookings" })
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params
  const { status, payment_status, notes } = req.body

  if (!status && !payment_status && !notes) {
    return res.status(400).json({ message: "Nothing to update" })
  }

  try {
    const fields = []
    const values = []

    if (status) {
      values.push(status)
      fields.push(`status = $${values.length}`)
    }

    if (payment_status) {
      values.push(payment_status)
      fields.push(`payment_status = $${values.length}`)
    }

    if (typeof notes === "string") {
      values.push(notes)
      fields.push(`notes = $${values.length}`)
    }

    values.push(id)

    await pool.query(
      `UPDATE bookings SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`,
      values,
    )

    const booking = await fetchBookingById(id)
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" })
    }

    if (status === "confirmed") {
      try {
        await sendBookingConfirmation(booking.email, {
          user_name: booking.user_name,
          space: booking.workspace?.name || "Workspace",
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_price: booking.total_price,
        })
      } catch (error) {
        console.error("Failed to send confirmation email:", error)
      }
    } else if (status === "cancelled") {
      try {
        await sendBookingCancellation(booking.email, {
          user_name: booking.user_name,
          space: booking.workspace?.name || "Workspace",
          start_date: booking.start_date,
          end_date: booking.end_date,
        }, notes || "Cancelled by admin")
      } catch (error) {
        console.error("Failed to send cancellation email:", error)
      }
    }

    res.json({ message: "Booking updated", booking })
  } catch (error) {
    console.error("Failed to update booking:", error)
    res.status(500).json({ message: "Server error updating booking" })
  }
})

module.exports = router
