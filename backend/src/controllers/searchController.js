const User = require("../models/User");
const Post = require("../models/Post");

const searchCommunity = async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query) {
      return res.status(200).json({
        success: true,
        users: [],
        posts: [],
        hashtags: []
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const cleanQuery = query.replace(/^#/, "");

    // 1. Users matching display name or username
    const users = await User.find({
      $or: [
        { username: { $regex: cleanQuery, $options: "i" } },
        { displayName: { $regex: cleanQuery, $options: "i" } }
      ]
    })
      .select("username displayName profilePicture bio")
      .limit(limit)
      .skip(skip);

    // 2. Posts matching content text
    const posts = await Post.find({
      content: { $regex: query, $options: "i" }
    })
      .populate("user", "username displayName profilePicture")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // 3. Hashtags extracted from matching post contents
    const hashtagRegex = new RegExp(`#\\w*${cleanQuery}\\w*`, "i");
    const postsWithHashtags = await Post.find({
      content: { $regex: hashtagRegex }
    }).select("content");

    const hashtagMap = {};
    postsWithHashtags.forEach(p => {
      const tags = p.content.match(/#\w+/g) || [];
      tags.forEach(tag => {
        if (tag.toLowerCase().includes(`#${cleanQuery.toLowerCase()}`)) {
          const normalized = tag.toLowerCase();
          hashtagMap[normalized] = (hashtagMap[normalized] || 0) + 1;
        }
      });
    });

    const hashtags = Object.keys(hashtagMap).map(name => ({
      name,
      count: hashtagMap[name]
    })).sort((a, b) => b.count - a.count);

    const paginatedHashtags = hashtags.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      users,
      posts,
      hashtags: paginatedHashtags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  searchCommunity
};
