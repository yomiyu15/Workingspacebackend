const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send booking confirmation
const sendBookingConfirmation = async (to, booking) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Booking Confirmed: ${booking.space}`,
    html: `
      <p>Hello ${booking.user_name},</p>
      <p>Your booking for <strong>${booking.space}</strong> has been <strong>confirmed</strong>.</p>
      <p><strong>Dates:</strong> ${booking.start_date} - ${booking.end_date}</p>
      <p><strong>Total:</strong> $${booking.total_price}</p>
      <p>Thank you for choosing us!</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

// Send booking cancellation
const sendBookingCancellation = async (to, booking, reason) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Booking Cancelled: ${booking.space}`,
    html: `
      <p>Hello ${booking.user_name},</p>
      <p>We regret to inform you that your booking for <strong>${booking.space}</strong> has been <strong>cancelled</strong>.</p>
      <p><strong>Dates:</strong> ${booking.start_date} - ${booking.end_date}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>We apologize for the inconvenience.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendBookingConfirmation, sendBookingCancellation };
