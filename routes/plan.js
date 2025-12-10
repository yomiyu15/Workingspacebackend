// routes/plans.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// GET all plans with their features
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.price, COALESCE(json_agg(f.feature) FILTER (WHERE f.feature IS NOT NULL), '[]') AS features
      FROM plans p
      LEFT JOIN plan_features f ON f.plan_id = p.id
      GROUP BY p.id
      ORDER BY p.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET single plan by id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const plan = await pool.query("SELECT * FROM plans WHERE id=$1", [id]);
    if (plan.rows.length === 0) return res.status(404).json({ message: "Plan not found" });

    const features = await pool.query("SELECT feature FROM plan_features WHERE plan_id=$1", [id]);
    res.json({ ...plan.rows[0], features: features.rows.map(f => f.feature) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE plan (admin)
router.post("/", authenticateAdmin, async (req, res) => {
  const { name, price, features } = req.body;

  try {
    const planInsert = await pool.query(
      "INSERT INTO plans (name, price) VALUES ($1, $2) RETURNING *",
      [name, price]
    );
    const planId = planInsert.rows[0].id;

    if (Array.isArray(features)) {
      for (const f of features) {
        await pool.query("INSERT INTO plan_features (plan_id, feature) VALUES ($1, $2)", [planId, f]);
      }
    }

    res.status(201).json({ message: "Plan created", plan: planInsert.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE plan (admin)
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price, features } = req.body;

  try {
    const updatePlan = await pool.query(
      "UPDATE plans SET name=$1, price=$2, updated_at=NOW() WHERE id=$3 RETURNING *",
      [name, price, id]
    );

    if (updatePlan.rows.length === 0) return res.status(404).json({ message: "Plan not found" });

    // Delete old features
    await pool.query("DELETE FROM plan_features WHERE plan_id=$1", [id]);

    // Insert new features
    if (Array.isArray(features)) {
      for (const f of features) {
        await pool.query("INSERT INTO plan_features (plan_id, feature) VALUES ($1, $2)", [id, f]);
      }
    }

    res.json({ message: "Plan updated", plan: updatePlan.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE plan (admin)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const delPlan = await pool.query("DELETE FROM plans WHERE id=$1 RETURNING *", [id]);
    if (delPlan.rows.length === 0) return res.status(404).json({ message: "Plan not found" });

    // Delete related features
    await pool.query("DELETE FROM plan_features WHERE plan_id=$1", [id]);

    res.json({ message: "Plan deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
