const User = require("../models/User");
const Streak = require("../models/Streak");
const Task = require("../models/Task");
const Post = require("../models/Post");
const Follow = require("../models/Follow");

const migrateUsernames = require("../utils/migrateUsernames");

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    ).select("-__v");

    const streak = await Streak.findOne({
      user: user._id,
    });

    const totalTasksCompleted =
      await Task.countDocuments({
        user: user._id,
        completed: true,
      });

    const posts =
      await Post.countDocuments({
        user: user._id,
      });

    const followers =
      await Follow.countDocuments({
        following: user._id,
      });

    const following =
      await Follow.countDocuments({
        follower: user._id,
      });

    res.status(200).json({
      success: true,

      profile: {
        user,

        stats: {
          currentStreak:
            streak?.currentStreak || 0,

          longestStreak:
            streak?.longestStreak || 0,

          totalTasksCompleted,

          posts,

          followers,

          following,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      displayName,
      username,
      bio,
    } = req.body;

    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (displayName) {
      user.displayName = displayName;
    }

    if (username) {
      const normalizedUsername =
        username.toLowerCase();

      if (
        !/^[a-z0-9_]{3,20}$/.test(
          normalizedUsername
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Username must be 3-20 characters and contain only letters, numbers and underscores",
        });
      }

      const existingUser =
        await User.findOne({
          username:
            normalizedUsername,
        });

      if (
        existingUser &&
        existingUser._id.toString() !==
          user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Username already taken",
        });
      }

      user.username =
        normalizedUsername;
    }

    if (bio !== undefined) {
      user.bio = bio;
    }

    await user.save();

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "updateProfile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const checkUsername = async (
  req,
  res
) => {
  try {
    const username =
      req.params.username.toLowerCase();

    const existingUser =
      await User.findOne({
        username,
      });

    res.status(200).json({
      success: true,
      available: !existingUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserProfile = async (
  req,
  res
) => {
  try {
    const user = await User.findOne({
      username:
        req.params.username.toLowerCase(),
    }).select("-__v -googleId");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const streak = await Streak.findOne({
      user: user._id,
    });

    const totalTasksCompleted =
      await Task.countDocuments({
        user: user._id,
        completed: true,
      });

    const posts =
      await Post.countDocuments({
        user: user._id,
      });

    const followers =
      await Follow.countDocuments({
        following: user._id,
      });

    const following =
      await Follow.countDocuments({
        follower: user._id,
      });

    res.status(200).json({
      success: true,

      profile: {
        user,

        stats: {
          currentStreak:
            streak?.currentStreak || 0,

          longestStreak:
            streak?.longestStreak || 0,

          totalTasksCompleted,

          posts,

          followers,

          following,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const runMigration = async (
  req,
  res
) => {
  await migrateUsernames();

  res.status(200).json({
    success: true,
    message: "Migration completed",
  });
};
const searchUsers = async (
  req,
  res
) => {
  try {
    const query =
      req.query.q?.trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message:
          "Search query is required",
      });
    }

    const users =
      await User.find({
        username: {
          $regex: query,
          $options: "i",
        },
      })
        .select(
          "username displayName profilePicture bio"
        )
        .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getSuggestions =
  async (req, res) => {
    try {
      const follows =
        await Follow.find({
          follower:
            req.user._id,
        }).select(
          "following"
        );

      const followedIds =
        follows.map(
          (follow) =>
            follow.following
        );

      followedIds.push(
        req.user._id
      );

      const suggestions =
        await User.find({
          _id: {
            $nin:
              followedIds,
          },
        })
          .select(
            "username displayName profilePicture bio"
          )
          .limit(10);

      res.status(200).json({
        success: true,
        count:
          suggestions.length,
        users:
          suggestions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

module.exports = {
  getMyProfile,
  updateProfile,
  getUserProfile,
  searchUsers,
  getSuggestions,
  runMigration,
  checkUsername,
};