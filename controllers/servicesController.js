const pool = require("../db");

// Get all services
const getServices = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM services ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new service
const createService = async (req, res) => {
  const { title, description } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO services (title, description) VALUES ($1, $2) RETURNING *",
      [title, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a service
const updateService = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  try {
    const result = await pool.query(
      "UPDATE services SET title=$1, description=$2 WHERE id=$3 RETURNING *",
      [title, description, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Service not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a service
const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM services WHERE id=$1", [id]);
    res.json({ message: "Service deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getServices,
  createService,
  updateService,
  deleteService,
};
