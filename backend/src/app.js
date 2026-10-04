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
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const focusRoutes = require("./routes/focusRoutes");

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

// ── Security Headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Limit body size to 2MB to prevent memory exhaustion attacks
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(passport.initialize());

// Rate limiters
const { apiLimiter, authLimiter } = require('./middlewares/rateLimitMiddleware');
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

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
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/focus", focusRoutes);
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

// ── Centralized Error Handling Middleware ────────────────────────────────────
// Suppresses stack traces and sensitive error details in production
app.use((err, req, res, next) => {
  // CORS block error
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ success: false, message: 'Forbidden: CORS origin not allowed' });
  }

  // Multer upload limit error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 5MB.' });
  }

  // Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format provided' });
  }

  // Log error internally for debugging
  console.error('[App Error]', err.message);

  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'An unexpected server error occurred.' : (err.message || 'Internal Server Error'),
  });
});

module.exports = app;
