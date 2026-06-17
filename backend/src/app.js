const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const streakRoutes = require('./routes/streakRoutes');
const gridRoutes = require("./routes/gridRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(passport.initialize());
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/streaks', streakRoutes);
app.use("/api/grid", gridRoutes);
app.use("/api/analytics", analyticsRoutes);
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message:"PunchUp API Running Successfully"
  });
});
const testRoute = require('./routes/testRoute');
app.use('/api/test', testRoute);

module.exports = app;
