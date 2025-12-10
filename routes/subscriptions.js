// routes/subscriptions.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// GET all subscriptions with plan info
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const subs = await pool.query(`
      SELECT s.*, p.name AS plan_name
      FROM subscriptions s
      LEFT JOIN plans p ON p.id = s.plan_id
      ORDER BY s.created_at DESC
    `);
    res.json(subs.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET single subscription
router.get("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const sub = await pool.query(`
      SELECT s.*, p.name AS plan_name
      FROM subscriptions s
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE s.id = $1
    `, [id]);

    if (sub.rows.length === 0)
      return res.status(404).json({ message: "Subscription not found" });

    res.json(sub.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE subscription (admin)
router.post("/", authenticateAdmin, async (req, res) => {
  const {
    user_full_name,
    user_email,
    user_phone,
    user_company,
    plan_id,
    agreement_length,
    start_date,
    monthly_cost
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO subscriptions 
       (user_full_name, user_email, user_phone, user_company, plan_id, agreement_length, start_date, monthly_cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [user_full_name, user_email, user_phone, user_company, plan_id, agreement_length, start_date, monthly_cost]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE subscription (admin)
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    user_full_name,
    user_email,
    user_phone,
    user_company,
    plan_id,
    agreement_length,
    start_date,
    monthly_cost
  } = req.body;

  try {
    const update = await pool.query(
      `UPDATE subscriptions SET
         user_full_name=$1,
         user_email=$2,
         user_phone=$3,
         user_company=$4,
         plan_id=$5,
         agreement_length=$6,
         start_date=$7,
         monthly_cost=$8,
         updated_at=NOW()
       WHERE id=$9
       RETURNING *`,
      [user_full_name, user_email, user_phone, user_company, plan_id, agreement_length, start_date, monthly_cost, id]
    );

    if (update.rows.length === 0)
      return res.status(404).json({ message: "Subscription not found" });

    res.json(update.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE subscription (admin)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const del = await pool.query(
      "DELETE FROM subscriptions WHERE id=$1 RETURNING *",
      [id]
    );

    if (del.rows.length === 0)
      return res.status(404).json({ message: "Subscription not found" });

    res.json({ message: "Subscription deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
