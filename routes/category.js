// routes/categories.js
const express = require("express")
const router = express.Router()
const pool = require("../db")

const parseNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

// Get all categories
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM gallery_categories ORDER BY name")
    res.json(result.rows)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    res.status(500).json({ message: "Server error fetching categories" })
  }
})

// Get a single category by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query("SELECT * FROM gallery_categories WHERE id = $1", [id])
    if (result.rows.length === 0) return res.status(404).json({ message: "Category not found" })
    res.json(result.rows[0])
  } catch (error) {
    console.error("Failed to fetch category:", error)
    res.status(500).json({ message: "Server error fetching category" })
  }
})

// Create a new category
router.post("/", async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ message: "Name is required" })

  try {
    const result = await pool.query(
      "INSERT INTO gallery_categories (name) VALUES ($1) RETURNING *",
      [name]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Failed to create category:", error)
    res.status(500).json({ message: "Server error creating category" })
  }
})

// Update a category
router.put("/:id", async (req, res) => {
  const { id } = req.params
  const { name } = req.body
  if (!name) return res.status(400).json({ message: "Name is required" })

  try {
    const result = await pool.query(
      "UPDATE gallery_categories SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [name, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: "Category not found" })
    res.json(result.rows[0])
  } catch (error) {
    console.error("Failed to update category:", error)
    res.status(500).json({ message: "Server error updating category" })
  }
})

// Delete a category
router.delete("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query("DELETE FROM gallery_categories WHERE id = $1 RETURNING *", [id])
    if (result.rows.length === 0) return res.status(404).json({ message: "Category not found" })
    res.json({ message: "Category deleted" })
  } catch (error) {
    console.error("Failed to delete category:", error)
    res.status(500).json({ message: "Server error deleting category" })
  }
})

module.exports = router
