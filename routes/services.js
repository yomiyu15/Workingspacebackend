const express = require("express");
const router = express.Router();
const {
  getServices,
  createService,
  updateService,
  deleteService,
} = require("../controllers/servicesController");
const { authenticateAdmin } = require("./admin"); // middleware to check admin role

router.get("/", getServices);
router.post("/", authenticateAdmin, createService);
router.put("/:id", authenticateAdmin, updateService);
router.delete("/:id", authenticateAdmin, deleteService);

module.exports = router;
