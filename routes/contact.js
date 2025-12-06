const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// GET all submissions (admin only)
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contact_submissions ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    res.status(500).json({ message: "Server error fetching submissions" });
  }
});

// POST new submission (public)
router.post("/", async (req, res) => {
  const { name, email, phone, dialingCode, message } = req.body;
  if (!name || !email || !phone || !message) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO contact_submissions (name, email, phone, dialing_code, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, phone, dialingCode || "+251", message]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to create submission:", error);
    res.status(500).json({ message: "Server error creating submission" });
  }
});

module.exports = router;
