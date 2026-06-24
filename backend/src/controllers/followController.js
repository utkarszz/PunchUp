const Follow = require("../models/Follow");
const User = require("../models/User");
const Notification = require("../models/Notification");

const followUser = async (req, res) => {
  try {
    const targetUser = await User.findOne({
      username: req.params.username.toLowerCase(),
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      following: targetUser._id,
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: "Already following",
      });
    }

    await Follow.create({
      follower: req.user._id,
      following: targetUser._id,
    });

    // Create Notification automatically (if not self)
    if (targetUser._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: targetUser._id,
        sender: req.user._id,
        type: "follow",
      });
    }

    res.status(200).json({
      success: true,
      message: "User followed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const targetUser = await User.findOne({
      username: req.params.username.toLowerCase(),
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await Follow.findOneAndDelete({
      follower: req.user._id,
      following: targetUser._id,
    });

    res.status(200).json({
      success: true,
      message: "User unfollowed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFollowers = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalFollowers = await Follow.countDocuments({
      following: user._id,
    });

    const followers = await Follow.find({
      following: user._id,
    })
      .populate("follower", "username displayName profilePicture")
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(totalFollowers / limit),
      totalFollowers,
      count: followers.length,
      followers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFollowing = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalFollowing = await Follow.countDocuments({
      follower: user._id,
    });

    const following = await Follow.find({
      follower: user._id,
    })
      .populate("following", "username displayName profilePicture")
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(totalFollowing / limit),
      totalFollowing,
      count: following.length,
      following,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};