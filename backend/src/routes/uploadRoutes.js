const express = require("express");

const protect = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const {
  uploadProfilePicture,
} = require("../controllers/uploadController");

const router = express.Router();

router.post(
  "/profile-picture",
  protect,
  upload.single("image"),
  uploadProfilePicture
);

module.exports = router;