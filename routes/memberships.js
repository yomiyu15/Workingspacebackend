const express = require("express");
const router = express.Router();
const pool = require("../db");

// --- USER ROUTES ---

// GET all active plans for the user dropdown
router.get("/plans", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM membership_plans WHERE is_active = true ORDER BY price ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});
// GET all submitted membership forms
router.get("/submissions", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ms.id, ms.full_name, ms.email, ms.phone_number, ms.message, mp.name as plan_name, ms.created_at
       FROM membership_submissions ms
       LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
       ORDER BY ms.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// POST user inquiry form
router.post("/submit", async (req, res) => {
  const { full_name, email, phone, plan_id, message } = req.body;
  try {
    await pool.query(
      `INSERT INTO membership_submissions (full_name, email, phone_number, plan_id, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [full_name, email, phone, plan_id === "other" ? null : plan_id, message] // <- only 5 values
    );
    res.status(201).json({ message: "Success" });
  } catch (err) {
    console.error("Submission failed:", err); // log actual error
    res.status(500).json({ error: "Submission failed" });
  }
});


// --- ADMIN ROUTES ---

// POST: Admin adds a new plan
router.post("/plans", async (req, res) => {
  const { name, price, billing_unit } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO membership_plans (name, price, billing_unit) VALUES ($1, $2, $3) RETURNING *",
      [name, price, billing_unit]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add plan" });
  }
});

// DELETE: Admin removes a plan
router.delete("/plans/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM membership_plans WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;