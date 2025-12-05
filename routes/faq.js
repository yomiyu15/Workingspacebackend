// routes/faq.js
const express = require("express");
const router = express.Router();
const pool = require("../db"); // your pg Pool
const { authenticateAdmin } = require("../middleware/authenticateAdmin");

// Helper: validate simple payload
function validatePayload(body) {
  const errors = [];
  if (!body.question || typeof body.question !== "string" || body.question.trim() === "") {
    errors.push("question is required");
  }
  if (!body.answer || typeof body.answer !== "string" || body.answer.trim() === "") {
    errors.push("answer is required");
  }
  return errors;
}

// CREATE FAQ (admin only)
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { question, answer, order_index = 0, visible = true } = req.body;
    const errors = validatePayload({ question, answer });
    if (errors.length) return res.status(400).json({ errors });

    const insert = await pool.query(
      `INSERT INTO faq (question, answer, order_index, visible)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [question.trim(), answer.trim(), order_index, visible]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("POST /api/faq error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET ALL FAQs (public) - optionally only visible ones
// supports ?visible=true|false query and ?all=true to bypass visible filter
router.get("/", async (req, res) => {
  try {
    const { visible, all } = req.query;
    if (all === "true") {
      const result = await pool.query("SELECT * FROM faq ORDER BY order_index ASC, id ASC");
      return res.json(result.rows);
    }

    // default: return only visible FAQs; if visible provided, respect it
    if (typeof visible !== "undefined") {
      const v = visible === "true";
      const result = await pool.query("SELECT * FROM faq WHERE visible=$1 ORDER BY order_index ASC, id ASC", [v]);
      return res.json(result.rows);
    }

    const result = await pool.query("SELECT * FROM faq WHERE visible=TRUE ORDER BY order_index ASC, id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/faq error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET single FAQ by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM faq WHERE id=$1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "FAQ not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/faq/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE FAQ (admin only) - full replace of fields (question & answer required)
router.put("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, order_index = 0, visible = true } = req.body;
    const errors = validatePayload({ question, answer });
    if (errors.length) return res.status(400).json({ errors });

    const update = await pool.query(
      `UPDATE faq
       SET question = $1,
           answer = $2,
           order_index = $3,
           visible = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [question.trim(), answer.trim(), order_index, visible, id]
    );

    if (update.rows.length === 0) return res.status(404).json({ message: "FAQ not found" });
    res.json(update.rows[0]);
  } catch (err) {
    console.error("PUT /api/faq/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH FAQ (admin only) - partial update
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let idx = 1;

    if (req.body.question !== undefined) {
      fields.push(`question = $${idx++}`);
      values.push(req.body.question.trim());
    }
    if (req.body.answer !== undefined) {
      fields.push(`answer = $${idx++}`);
      values.push(req.body.answer.trim());
    }
    if (req.body.order_index !== undefined) {
      fields.push(`order_index = $${idx++}`);
      values.push(req.body.order_index);
    }
    if (req.body.visible !== undefined) {
      fields.push(`visible = $${idx++}`);
      values.push(req.body.visible);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    // add updated_at and id param
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE faq SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const update = await pool.query(sql, values);

    if (update.rows.length === 0) return res.status(404).json({ message: "FAQ not found" });
    res.json(update.rows[0]);
  } catch (err) {
    console.error("PATCH /api/faq/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE FAQ (admin only)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await pool.query("DELETE FROM faq WHERE id=$1 RETURNING *", [id]);
    if (del.rows.length === 0) return res.status(404).json({ message: "FAQ not found" });
    res.json({ message: "FAQ deleted", deleted: del.rows[0] });
  } catch (err) {
    console.error("DELETE /api/faq/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
