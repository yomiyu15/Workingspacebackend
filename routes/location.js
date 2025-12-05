const express = require("express")
const router = express.Router()
const pool = require("../db")

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, city, address, timezone, support_phone, geo_lat, geo_lng FROM locations ORDER BY name ASC",
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Failed to fetch locations:", error)
    res.status(500).json({ message: "Server error fetching locations" })
  }
})

module.exports = router

