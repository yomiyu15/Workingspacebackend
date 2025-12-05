const pool = require("../db");

// Get all bookings (for admin)
const getAllBookings = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM bookings ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve or reject a booking
const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "approved" or "rejected"
  try {
    const result = await pool.query(
      "UPDATE bookings SET status=$1 WHERE id=$2 RETURNING *",
      [status, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Booking not found" });
    res.json({ message: `Booking ${status}`, booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a booking
const deleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM bookings WHERE id=$1 RETURNING *", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking deleted", booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
};
