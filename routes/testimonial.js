const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// Create testimonial (admin only)
router.post("/", authenticateAdmin, async (req, res) => {
  const { name, role, company, text, rating, image } = req.body;

  try {
    const insert = await pool.query(
      `INSERT INTO testimonials (name, role, company, text, rating, image)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, role, company, text, rating, image]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all testimonials (public)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM testimonials ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single testimonial
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM testimonials WHERE id=$1", [id]);
    if (!result.rows.length)
      return res.status(404).json({ message: "Testimonial not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update testimonial (admin only)
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, role, company, text, rating, image } = req.body;

  try {
    const update = await pool.query(
      `UPDATE testimonials SET
       name=$1, role=$2, company=$3, text=$4, rating=$5, image=$6,
       updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, role, company, text, rating, image, id]
    );

    if (!update.rows.length)
      return res.status(404).json({ message: "Testimonial not found" });

    res.json(update.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete testimonial (admin only)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const del = await pool.query("DELETE FROM testimonials WHERE id=$1 RETURNING *", [id]);
    if (!del.rows.length)
      return res.status(404).json({ message: "Testimonial not found" });

    res.json({ message: "Testimonial deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
