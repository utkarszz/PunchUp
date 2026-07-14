const express = require("express");
const { searchCommunity } = require("../controllers/searchController");
const protect = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protect, searchCommunity);

module.exports = router;
