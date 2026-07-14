require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('./config/passport');
// Health check route — no auth, no DB, responds immediately
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const streakRoutes = require('./routes/streakRoutes');
const gridRoutes = require("./routes/gridRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const postRoutes = require("./routes/postRoutes");
const commentRoutes = require("./routes/commentRoutes");
const followRoutes = require("./routes/followRoutes");
const searchRoutes = require("./routes/searchRoutes");

const app = express();
app.set('trust proxy', true);


const allowedOrigins = [
  'http://localhost:4200',
  'https://punchup.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));
app.use(passport.initialize());

// ── Health check ─────────────────────────────────────────────────────────────
// Mounted BEFORE all API routes so it is always reachable by uptime monitors.
// No authentication middleware is applied. No DB queries are made.
app.use('/health', healthRoutes);
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/streaks', streakRoutes);
app.use("/api/grid", gridRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/posts", postRoutes);
app.use(
  "/api/comments",
  commentRoutes
);
app.use(
  "/api/follows",
  followRoutes
);
app.use("/api/search", searchRoutes);
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message:"PunchUp API Running Successfully"
  });
});
const notificationRoutes = require("./routes/notificationRoutes");
const testRoute = require('./routes/testRoute');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/test', testRoute);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

module.exports = app;
