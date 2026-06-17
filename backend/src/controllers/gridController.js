const Task = require("../models/Task");

const getGridData = async (req, res) => {
  try {
    const completedTasks = await Task.find({
      user: req.user._id,
      completed: true,
    }).select("completedAt");

    const contributionMap = {};

    completedTasks.forEach((task) => {
      const date = task.completedAt
        .toISOString()
        .split("T")[0];

      contributionMap[date] =
        (contributionMap[date] || 0) + 1;
    });

    const gridData = Object.entries(
      contributionMap
    ).map(([date, count]) => {
      let intensity = 0;

      if (count >= 1 && count <= 2) {
        intensity = 1;
      } else if (count >= 3 && count <= 5) {
        intensity = 2;
      } else if (count >= 6) {
        intensity = 3;
      }

      return {
        date,
        tasksCompleted: count,
        intensity,
      };
    });

    gridData.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.status(200).json({
      success: true,
      totalContributionDays: gridData.length,
      gridData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getGridData,
};