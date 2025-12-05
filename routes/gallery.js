const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads folder exists in public/uploads
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });


// -------------------- Categories --------------------

// Create category
router.post("/categories", authenticateAdmin, async (req, res) => {
    const { name } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO gallery_categories (name) VALUES ($1) RETURNING *`,
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get all categories
router.get("/categories", async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM gallery_categories ORDER BY name ASC`);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// -------------------- Gallery Items --------------------

// Create gallery item
router.post("/", authenticateAdmin, upload.single("image"), async (req, res) => {
    console.log("File uploaded:", req.file); // <- Add this
    const { title, description, category_id } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const result = await pool.query(
            `INSERT INTO gallery_items (title, description, category_id, image_url) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [title, description, category_id, image_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get all gallery items
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT gi.*, gc.name as category_name
             FROM gallery_items gi
             JOIN gallery_categories gc ON gi.category_id = gc.id
             ORDER BY gi.id ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
        
    }
});

// Get single gallery item
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT gi.*, gc.name as category_name
             FROM gallery_items gi
             JOIN gallery_categories gc ON gi.category_id = gc.id
             WHERE gi.id = $1`,
            [id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ message: "Gallery item not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Update gallery item
router.put("/:id", authenticateAdmin, upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const { title, description, category_id } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const existing = await pool.query(`SELECT * FROM gallery_items WHERE id = $1`, [id]);
        if (existing.rows.length === 0)
            return res.status(404).json({ message: "Gallery item not found" });

        const updated = await pool.query(
            `UPDATE gallery_items 
             SET title=$1, description=$2, category_id=$3, 
                 image_url=COALESCE($4, image_url), updated_at=NOW() 
             WHERE id=$5 RETURNING *`,
            [title, description, category_id, image_url, id]
        );
        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete gallery item
router.delete("/:id", authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const del = await pool.query("DELETE FROM gallery_items WHERE id=$1 RETURNING *", [id]);
        if (del.rows.length === 0)
            return res.status(404).json({ message: "Gallery item not found" });
        res.json({ message: "Gallery item deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
