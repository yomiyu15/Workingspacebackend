const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// Create Feature (admin)
router.post("/", authenticateAdmin, async (req, res) => {
  const { title, description, icon } = req.body;

  try {
    const insert = await pool.query(
      `INSERT INTO features (title, description, icon)
       VALUES ($1, $2, $3) RETURNING *`,
      [title, description, icon]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all features
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM features ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single feature
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM features WHERE id=$1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Feature not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Feature (admin)
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, icon } = req.body;

  try {
    const update = await pool.query(
      `UPDATE features SET
       title=$1, description=$2, icon=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [title, description, icon, id]
    );

    if (update.rows.length === 0)
      return res.status(404).json({ message: "Feature not found" });

    res.json(update.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete Feature (admin)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const del = await pool.query("DELETE FROM features WHERE id=$1 RETURNING *", [id]);

    if (del.rows.length === 0)
      return res.status(404).json({ message: "Feature not found" });

    res.json({ message: "Feature deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
