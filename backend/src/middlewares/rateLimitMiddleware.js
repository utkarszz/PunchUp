const rateLimit = require("express-rate-limit");

// General API rate limiter — allows normal active browsing while preventing floods
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150, // limit each IP to 150 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after a minute",
  },
});

// Stricter limiter for authentication endpoints to prevent brute force / credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // limit each IP to 40 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, please try again in 15 minutes",
  },
});

// Limiter for resource creation (posts, comments, tasks) to prevent spam / bot floods
const creationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40, // max 40 creations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "You are creating resources too quickly. Please slow down.",
  },
});

// Limiter for task completion to prevent automated point farming
const completeTaskLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // max 30 task completions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many task completions in a short period. Please try again in a minute.",
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  creationLimiter,
  completeTaskLimiter,
};
