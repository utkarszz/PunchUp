const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  getGridData,
} = require("../controllers/gridController");

const router = express.Router();

router.get("/", protect, getGridData);

module.exports = router;