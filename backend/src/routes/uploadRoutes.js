const express = require("express");

const protect = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const {
  uploadProfilePicture,
  uploadImage,
} = require("../controllers/uploadController");

const router = express.Router();

router.post(
  "/profile-picture",
  protect,
  upload.single("image"),
  uploadProfilePicture
);

router.post(
  "/image",
  protect,
  upload.single("image"),
  uploadImage
);

module.exports = router;