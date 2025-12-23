require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const adminRouter = require("./routes/admin");
const bookingsRouter = require("./routes/booking");
const galleryRouter = require("./routes/gallery");
const featuresRouter = require("./routes/features");
const pricingRouter = require("./routes/prricing");
const testimonialsRouter = require("./routes/testimonial");
const faqRouter = require("./routes/faq");
const workspacesRouter = require("./routes/space");
const locationsRouter = require("./routes/location");
const uploadRouter = require("./routes/upload");
const categoriesRouter = require("./routes/category")
const contact = require("./routes/contact")

const memberships = require(
"./routes/memberships"
)


const { seedDefaults } = require("./utils/seed");

const pool = require("./db");

const app = express();

// CORS
// app.use(cors({
//     origin: "http://localhost:3000",
//     credentials: true,
// }));
app.use(cors({
    origin: true,   // allow all origins
    credentials: true,
}));


app.use(express.json());

// ⚡ Serve static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));


// Test DB + seed defaults
pool.query("SELECT NOW()", async (err, res) => {
    if (err) {
        console.error("DB connection error:", err);
    } else {
        console.log("DB connected:", res.rows[0].now);
        await seedDefaults(pool);
    }
});

// Routes
app.use("/api/admin", adminRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/gallery", galleryRouter);
app.use("/api/features", featuresRouter);
app.use("/api/faq", faqRouter);
app.use("/api/pricing", pricingRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/workspaces", workspacesRouter);
app.use("/api/spaces", workspacesRouter); // legacy compatibility
app.use("/api/locations", locationsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/categories", categoriesRouter)
app.use("/api/contact",contact)
app.use("/api/memberships",memberships)

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
