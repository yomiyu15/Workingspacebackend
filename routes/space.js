const express = require("express")
const router = express.Router()
const pool = require("../db")

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"]

const parseNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase())
  if (typeof value === "number") return value === 1
  return fallback
}

const parseArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {
      return value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return []
}

const buildWorkspaceRecord = (row) => {
  if (!row) return null
  const location =
    row.location_id && row.location_name
      ? {
          id: row.location_id,
          name: row.location_name,
          city: row.location_city,
          address: row.location_address,
          support_phone: row.location_support_phone,
        }
      : null
  delete row.location_name
  delete row.location_city
  delete row.location_address
  delete row.location_support_phone
  return { ...row, location }
}

const fetchWorkspaceById = async (id) => {
  const result = await pool.query(
    `SELECT
        w.*,
        l.name AS location_name,
        l.city AS location_city,
        l.address AS location_address,
        l.support_phone AS location_support_phone
     FROM workspaces w
     LEFT JOIN locations l ON w.location_id = l.id
     WHERE w.id = $1`,
    [id],
  )
  return buildWorkspaceRecord(result.rows[0])
}

router.get("/", async (req, res) => {
  const { status, limit } = req.query
  try {
    const filters = []
    const values = []
    if (status === "active") {
      values.push(true)
      filters.push(`w.is_active = $${values.length}`)
    }

    let query = `
      SELECT
        w.*,
        l.name AS location_name,
        l.city AS location_city,
        l.address AS location_address,
        l.support_phone AS location_support_phone
      FROM workspaces w
      LEFT JOIN locations l ON w.location_id = l.id
    `

    if (filters.length) {
      query += ` WHERE ${filters.join(" AND ")}`
    }

    query += " ORDER BY w.created_at DESC"

    if (limit) {
      values.push(Number(limit))
      query += ` LIMIT $${values.length}`
    }

    const result = await pool.query(query, values)
    res.json(result.rows.map(buildWorkspaceRecord))
  } catch (error) {
    console.error("Failed to fetch workspaces:", error)
    res.status(500).json({ message: "Server error fetching workspaces" })
  }
})

router.get("/availability", async (req, res) => {
  const { workspace_id, date, start_date, end_date } = req.query
  const rangeStart = start_date || date
  const rangeEnd = end_date || rangeStart

  if (!workspace_id || !rangeStart) {
    return res.status(400).json({ message: "workspace_id and start_date are required" })
  }

  try {
    const workspaceResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspace_id])
    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ message: "Workspace not found" })
    }

    const workspace = workspaceResult.rows[0]
    const inventory = workspace.inventory_count || 1

    const overlap = await pool.query(
      `SELECT COUNT(*) AS count
       FROM bookings
       WHERE workspace_id = $1
       AND daterange(start_date, end_date, '[]') && daterange($2, $3, '[]')
       AND status = ANY($4)`,
      [workspace_id, rangeStart, rangeEnd, ACTIVE_BOOKING_STATUSES],
    )

    const bookedCount = Number(overlap.rows[0].count)
    res.json({
      workspace: workspace.name,
      remaining: Math.max(inventory - bookedCount, 0),
      lead_time: workspace.lead_time,
      requested_start: rangeStart,
      requested_end: rangeEnd,
    })
  } catch (error) {
    console.error("Failed to check availability:", error)
    res.status(500).json({ message: "Server error checking availability" })
  }
})

router.post("/", async (req, res) => {
  const payload = req.body
  try {
    const amenities = parseArray(payload.amenities)
    const tags = parseArray(payload.tags)
    const images = parseArray(payload.images)
    const result = await pool.query(
      `INSERT INTO workspaces (
        name,
        category,
        description,
        capacity,
        price_hour,
        price_day,
        price_month,
        lead_time,
        location_id,
        amenities,
        tags,
        images,
        inventory_count,
        is_featured,
        is_active
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,$15
      )
      RETURNING id`,
      [
        payload.name,
        payload.category || "private",
        payload.description || "",
        parseNumber(payload.capacity),
        parseNumber(payload.price_hour ?? payload.priceHour),
        parseNumber(payload.price_day ?? payload.priceDay),
        parseNumber(payload.price_month ?? payload.priceMonth),
        payload.lead_time || payload.leadTime || "Instant confirmation",
        parseNumber(payload.location_id ?? payload.locationId),
        JSON.stringify(amenities),
        JSON.stringify(tags),
        JSON.stringify(images),
        parseNumber(payload.inventory_count ?? payload.inventoryCount) || 1,
        parseBoolean(payload.is_featured || payload.isFeatured, false),
        parseBoolean(payload.is_active || payload.isActive, true),
      ],
    )

    const workspace = await fetchWorkspaceById(result.rows[0].id)
    res.status(201).json(workspace)
  } catch (error) {
    console.error("Failed to create workspace:", error)
    res.status(500).json({ message: "Server error creating workspace" })
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params
  const payload = req.body
  try {
    const amenities = parseArray(payload.amenities)
    const tags = parseArray(payload.tags)
    const images = parseArray(payload.images)
    await pool.query(
      `UPDATE workspaces SET
        name = $1,
        category = $2,
        description = $3,
        capacity = $4,
        price_hour = $5,
        price_day = $6,
        price_month = $7,
        lead_time = $8,
        location_id = $9,
        amenities = $10::jsonb,
        tags = $11::jsonb,
        images = $12::jsonb,
        inventory_count = $13,
        is_featured = $14,
        is_active = $15,
        updated_at = NOW()
      WHERE id = $16`,
      [
        payload.name,
        payload.category || "private",
        payload.description || "",
        parseNumber(payload.capacity),
        parseNumber(payload.price_hour ?? payload.priceHour),
        parseNumber(payload.price_day ?? payload.priceDay),
        parseNumber(payload.price_month ?? payload.priceMonth),
        payload.lead_time || payload.leadTime || "Instant confirmation",
        parseNumber(payload.location_id ?? payload.locationId),
        JSON.stringify(amenities),
        JSON.stringify(tags),
        JSON.stringify(images),
        parseNumber(payload.inventory_count ?? payload.inventoryCount) || 1,
        parseBoolean(payload.is_featured || payload.isFeatured, false),
        parseBoolean(payload.is_active || payload.isActive, true),
        id,
      ],
    )

    const workspace = await fetchWorkspaceById(id)
    res.json(workspace)
  } catch (error) {
    console.error("Failed to update workspace:", error)
    res.status(500).json({ message: "Server error updating workspace" })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params
  try {
    await pool.query("DELETE FROM workspaces WHERE id=$1", [id])
    res.json({ message: "Workspace deleted" })
  } catch (error) {
    console.error("Failed to delete workspace:", error)
    res.status(500).json({ message: "Server error deleting workspace" })
  }
})

module.exports = router
