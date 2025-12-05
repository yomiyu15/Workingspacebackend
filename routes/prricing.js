const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// Create pricing plan (admin only)
router.post("/", authenticateAdmin, async (req, res) => {
  const { name, price, period, description, features, popular } = req.body;

  try {
    const insert = await pool.query(
      `INSERT INTO pricing (name, price, period, description, features, popular)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, price, period, description, features, popular]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all plans (public)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pricing ORDER BY price ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single plan (public)
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM pricing WHERE id=$1", [id]);
    if (!result.rows.length)
      return res.status(404).json({ message: "Pricing plan not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update pricing plan (admin only)
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price, period, description, features, popular } = req.body;

  try {
    const update = await pool.query(
      `UPDATE pricing SET
       name=$1, price=$2, period=$3, description=$4,
       features=$5, popular=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, price, period, description, features, popular, id]
    );

    if (!update.rows.length)
      return res.status(404).json({ message: "Pricing plan not found" });

    res.json(update.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete plan (admin only)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const del = await pool.query("DELETE FROM pricing WHERE id=$1 RETURNING *", [id]);
    if (!del.rows.length)
      return res.status(404).json({ message: "Pricing plan not found" });

    res.json({ message: "Pricing plan deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
