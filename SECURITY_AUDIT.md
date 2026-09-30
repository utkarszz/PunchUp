# PunchUp Security Audit

**Application**: PunchUp (Productivity & Gamification Platform)  
**Date**: September 30, 2026  
**Status**: Completed & Remediated  

---

## Executive Summary

A comprehensive, production-level security audit of the PunchUp application (both frontend and backend) was conducted across 18 distinct security dimensions: authentication, authorization, IDOR, input validation, NoSQL injection, task lifecycle & point integrity, community and post permissions, file upload safety, rate limiting, HTTP security headers, error handling, frontend token safety, and dependency security.

The overall architecture is well-structured with clear separation of concerns. However, the audit identified several actual vulnerabilities—most notably an unauthenticated token minting dev backdoor, private user email exposure on public profiles, mass assignment risks in task updating, point-farming velocity abuse, unconstrained file uploads, missing rate limiting, and regex injection vectors.

All identified vulnerabilities have been remediated in the codebase without breaking existing user flows or architectural patterns.

---

## Critical Issues

### 1. Unauthenticated JWT Minting / Account Takeover via Dev Route
- **File**: `backend/src/routes/testRoute.js:16-48`, `backend/src/app.js:79`
- **Severity**: **CRITICAL**
- **Description**: The `/api/test/token` route permitted anyone to request a fully valid 7-day signed JWT for any arbitrary email or username (including administrator `utkarzz1705@gmail.com`) without password or OAuth verification. This allowed instantaneous, unauthenticated account takeover of any account in the database.
- **Status**: **FIXED** (Gated behind environment check; completely blocked in production environments).

---

## High Severity

### 2. Private User Email & Internal Flag Leakage on Public Profiles
- **File**: `backend/src/controllers/userController.js:201-204`
- **Severity**: **HIGH**
- **Description**: The `GET /api/users/:username` public endpoint only excluded `-__v -googleId`. Consequently, any anonymous user could harvest the private email address, internal role, `isBanned` status, and `banReason` of all registered users.
- **Status**: **FIXED** (Explicit whitelist projection applied: only `username`, `displayName`, `profilePicture`, `bio`, `totalPoints`, and `createdAt` are returned).

### 3. Mass Assignment in Task Updates (`updateTask`)
- **File**: `backend/src/controllers/taskController.js:88-95`
- **Severity**: **HIGH**
- **Description**: While `updateTask` verified initial task ownership, it passed `req.body` uncleaned to `Task.findByIdAndUpdate`. An attacker could supply `user: "<another_user_id>"` to transfer task ownership, or `completed: true` bypassing streak/point calculation logic.
- **Status**: **FIXED** (Strict field whitelisting implemented: only `title`, `description`, `priority`, `category`, and `dueDate` are permitted).

### 4. Automated Point Farming via Uncapped Task Velocity
- **File**: `backend/src/services/pointService.js:42-78`, `backend/src/routes/taskRoutes.js`
- **Severity**: **HIGH**
- **Description**: Points were awarded (10 pts) for every completed task with idempotency per task, but there was no daily velocity limit or cap. A scripted bot could rapidly create and complete hundreds of tasks to inflate leaderboard points without limit.
- **Status**: **FIXED** (Added a daily cap of 200 points/day in `pointService.js` and applied strict rate limiting on `POST /api/tasks` and `PATCH /api/tasks/:id/complete`).

### 5. Memory Exhaustion DoS & Unrestricted MIME File Uploads
- **File**: `backend/src/middlewares/uploadMiddleware.js:1-9`
- **Severity**: **HIGH**
- **Description**: `multer.memoryStorage()` had no `fileSize` limit and no `fileFilter` MIME validation. An attacker could upload arbitrarily large files into server RAM, crashing the Node.js process with an Out-Of-Memory (OOM) error, or upload non-image executables/HTML.
- **Status**: **FIXED** (Enforced a strict 5MB file size limit and a MIME whitelist allowing only `image/jpeg`, `image/png`, `image/webp`, and `image/gif`).

---

## Medium Severity

### 6. Missing Application-Wide Rate Limiting
- **File**: `backend/src/middlewares/rateLimitMiddleware.js`
- **Severity**: **MEDIUM**
- **Description**: The rate limit middleware was an empty stub, leaving sensitive auth endpoints vulnerable to brute force and search/creation endpoints vulnerable to spam.
- **Status**: **FIXED** (Implemented `express-rate-limit` policies: 150 req/min general API limiter, 40 req/15min auth limiter, 40 req/min creation limiter, and 30 req/min task completion limiter).

### 7. ReDoS & Regex Injection in Search Endpoints
- **Files**: `backend/src/controllers/searchController.js:20-55`, `backend/src/controllers/userController.js:283-290`
- **Severity**: **MEDIUM**
- **Description**: User-provided search strings were passed raw into MongoDB `$regex` queries without escaping special characters. Special characters like `(` or `*` or repeated quantifier sequences could crash queries or cause catastrophic backtracking (ReDoS).
- **Status**: **FIXED** (Applied regex special character escaping `/[.*+?^${}()|[\]\\]/g` to all search inputs).

### 8. Unbounded Pagination & Negative Skip Manipulation
- **Files**: `backend/src/controllers/postController.js`, `backend/src/controllers/searchController.js`
- **Severity**: **MEDIUM**
- **Description**: `page` and `limit` query parameters accepted unbounded values or negative integers. Negative values caused database errors (`skip must be >= 0`), while massive limits (e.g. `limit=1000000`) caused memory spikes.
- **Status**: **FIXED** (All pagination inputs clamped: `page = Math.max(1, page)` and `limit = Math.min(50, Math.max(1, limit))`).

### 9. Missing HTTP Security Headers & Large Request Payloads
- **File**: `backend/src/app.js`
- **Severity**: **MEDIUM**
- **Description**: Express was configured with default headers (missing `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`) and unbounded JSON payload parsing.
- **Status**: **FIXED** (Configured strict security headers and bounded `express.json({ limit: '2mb' })`).

### 10. OAuth Token Query Exposure in Browser History
- **Files**: `frontend/src/app/pages/auth-callback/auth-callback.component.ts`, `frontend/src/app/core/services/auth.service.ts`
- **Severity**: **MEDIUM**
- **Description**: After OAuth login, the backend redirected to `${FRONTEND_URL}/auth/callback?token=<jwt>`. The query string persisted in browser navigation history, leaving it vulnerable to shoulder surfing and browser history inspection.
- **Status**: **FIXED** (Used `window.history.replaceState` and Angular router `{ replaceUrl: true }` to wipe the token parameter immediately upon reception).

### 11. Missing Root `.gitignore`
- **File**: Root repository directory
- **Severity**: **MEDIUM**
- **Description**: No root `.gitignore` existed. Placing `.env` or sensitive files in the repository root risked accidental commit into public version control.
- **Status**: **FIXED** (Created root `.gitignore` ignoring `.env*`, `node_modules/`, `dist/`, build artifacts).

---

## Low Severity

### 12. Unhandled ObjectId Casting Errors (Information Leakage)
- **Files**: `backend/src/controllers/postController.js`, `backend/src/app.js`
- **Severity**: **LOW**
- **Description**: Malformed IDs in parameters like `/api/posts/xyz` triggered unhandled Mongoose `CastError` exceptions, returning 500 status codes with internal schema path details.
- **Status**: **FIXED** (Added explicit `mongoose.Types.ObjectId.isValid` checks and centralized `CastError` handler returning 400 Bad Request).

### 13. Hardcoded Admin Email Disconnected from RBAC
- **Files**: `backend/src/middlewares/adminMiddleware.js`, `frontend/src/app/core/guards/admin.guard.ts`, `frontend/src/app/shared/components/sidebar/sidebar.component.ts`
- **Severity**: **LOW**
- **Description**: Admin privileges checked a hardcoded string `utkarzz1705@gmail.com` rather than the database `role: 'admin'`.
- **Status**: **FIXED** (Updated middleware and frontend guards to check `user.role === 'admin' || user.email === (process.env.ADMIN_EMAIL || 'utkarzz1705@gmail.com')`).

### 14. Broken Inline `onerror` Handler in Admin Table
- **File**: `frontend/src/app/pages/admin/admin.component.ts:67`
- **Severity**: **LOW**
- **Description**: `onerror="... + u.username"` threw a `ReferenceError: u is not defined` in global browser scope when avatars failed to load.
- **Status**: **FIXED** (Replaced with safe static fallback `assets/default-avatar.png`).

---

## Fixed Issues

1. **`backend/src/routes/testRoute.js`**: Blocked in production environments.
2. **`backend/src/controllers/userController.js`**: Whitelisted public profile projection (`username`, `displayName`, `profilePicture`, `bio`, `totalPoints`, `createdAt`). Added regex escaping in `searchUsers`.
3. **`backend/src/controllers/taskController.js`**: Whitelisted updates in `updateTask` to prevent mass assignment and ownership hijacking.
4. **`backend/src/services/pointService.js`**: Added 200 points/day cap to stop automated point farming bots.
5. **`backend/src/middlewares/uploadMiddleware.js`**: Added 5MB file size limit and strict image MIME type validation (`jpeg`, `png`, `webp`, `gif`).
6. **`backend/src/middlewares/rateLimitMiddleware.js`**: Implemented general, auth, creation, and task completion rate limiters.
7. **`backend/src/routes/taskRoutes.js`**: Attached rate limiting to task creation and completion routes.
8. **`backend/src/controllers/searchController.js`**: Added regex escaping and bounded pagination (max 50).
9. **`backend/src/controllers/postController.js`**: Added bounded pagination (max 50) and ObjectId format validation across all endpoints.
10. **`backend/src/models/User.js`**: Added `select: false` to `googleId` so third-party OAuth IDs are never exposed in user queries.
11. **`backend/src/middlewares/adminMiddleware.js`**: Supported both `role === 'admin'` and configurable `ADMIN_EMAIL`.
12. **`backend/src/app.js`**: Added security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`), limited JSON body to 2MB, mounted rate limiters, and added centralized error handling middleware.
13. **`frontend/src/app/pages/auth-callback/auth-callback.component.ts` & `auth.service.ts`**: Sanitized browser history on OAuth callback using `replaceState` and `{ replaceUrl: true }`.
14. **`frontend/src/app/core/guards/admin.guard.ts` & `sidebar.component.ts`**: Added support for database `role: 'admin'`.
15. **`frontend/src/app/pages/admin/admin.component.ts`**: Fixed inline `onerror` attribute syntax error.
16. **`e:\punchup\.gitignore`**: Created root `.gitignore` to prevent secret and artifact commits.

---

## Remaining Risks & Infrastructure Recommendations

1. **JWT Rotation & HttpOnly Cookies**: Tokens currently live in `localStorage` for 7 days. For highest enterprise security, migrate tokens to `HttpOnly`, `SameSite=Lax`, `Secure` cookies with short expiry (15m) and refresh token rotation.
2. **MongoDB Atlas IP Whitelisting**: Ensure your current IP or production server IP (e.g. Render/AWS outbound IPs) remains configured in the Atlas Security Console.
3. **Environment Secrets**: Keep production secrets (`JWT_SECRET`, `CLOUDINARY_API_SECRET`, `GOOGLE_CLIENT_SECRET`) rotated periodically and never committed to git.
4. **Third-Party Dependency Advisories**: Periodically run `npm audit` and upgrade `socket.io` and `ws` dependencies to address upstream memory exhaustion patches.

---

## Authentication Review

- **Google OAuth Flow**: Verified. Passport GoogleStrategy verifies token directly against Google OAuth2 token endpoint. Profile parsing maps `profile.id` and emails safely.
- **JWT Verification**: Verified. All protected routes enforce `protect` middleware which verifies token signature with HMAC-SHA256 and checks if the user is banned.
- **Banned User Enforcement**: Verified. Banned users are rejected immediately with 403 Forbidden across all protected endpoints.
- **Logout Behavior**: Client removes token from `localStorage` and resets reactive `BehaviorSubject` session state.

---

## Authorization Review

- **Admin Routes**: Protected by two-layer middleware: `protect` (authentication) followed by `adminOnly` (authorization).
- **Self-Admin Protection**: Admin cannot delete or ban their own account through admin controller endpoints.
- **Role Elevation**: Normal users cannot elevate their role to admin via profile update endpoints (`updateProfile` explicitly whitelists only non-privileged fields).

---

## IDOR Review

- **Tasks**: Users can only fetch, update, delete, or complete tasks matching `{ _id: taskId, user: req.user._id }`.
- **Posts**: Users can only update or delete posts where `post.user.toString() === req.user._id.toString()`.
- **Comments**: Only the comment author or the post author can delete comments.
- **Saved Posts**: Users can only view or delete their own saved posts.
- **Followers**: Users cannot force another user to follow someone (`follower: req.user._id` is enforced).

---

## Input Validation Review

- **NoSQL Operator Injection**: Express parses JSON safely. Mongoose schemas cast and validate types strictly.
- **Regex ReDoS**: All user-supplied search and query terms are escaped before passing to `$regex`.
- **Pagination**: All `limit` and `page` parameters are bounded (max 50 items/page, min page 1) to avoid server memory exhaustion.
- **Body Payloads**: JSON parser capped at 2MB.

---

## File Upload Review

- **Storage**: In-memory buffer streamed directly to Cloudinary.
- **File Size Limit**: Capped at 5MB per upload.
- **MIME Validation**: Restricted to `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Arbitrary files, HTML, and SVGs are rejected.

---

## Admin Security Review

- **Access Barrier**: `GET /api/admin/*` endpoints strictly require `req.user.role === 'admin' || req.user.email === ADMIN_EMAIL`.
- **Cascade Deletion**: When an admin deletes a user, associated tasks, streaks, posts, comments, notifications, and point events are cleanly purged.

---

## Database Security Review

- **Projections**: Sensitive fields (`googleId`) have `select: false` on the User model.
- **Indexes**: Compound unique index `{ user: 1, task: 1, reason: 1 }` on `PointEvent` ensures atomic idempotency against duplicate point awards.
- **Connection**: Encrypted TLS connection to MongoDB Atlas.

---

## Frontend Security Review

- **XSS**: Angular's template binding automatically escapes HTML. `[innerHTML]` is used exclusively for hardcoded SVG icons in `sidebar` and `command-palette`. No user input is bound to HTML.
- **Guards**: `authGuard` and `adminGuard` prevent unauthorized UI navigation.
- **Interceptors**: Auth interceptor restricts `Authorization: Bearer` headers to `environment.apiUrl` only, preventing token leakage to third-party domains.

---

## Dependency Review

- **Backend**: Express, Mongoose, Passport, Multer, Express-Rate-Limit, Cloudinary. Upstream dependencies for `ws` (Socket.IO) have upstream advisories that should be updated via standard patch maintenance.
- **Frontend**: Clean Angular 17 workspace with Chart.js.

---

## Production Checklist

[x] Test/dev backdoor routes disabled in production (`NODE_ENV === 'production'`)  
[x] Private user emails and internal flags stripped from public profile API  
[x] Mass assignment disabled on task update endpoints  
[x] Daily point farming velocity limit enforced (200 pts/day cap)  
[x] Multer file upload limited to 5MB and image MIME types  
[x] Rate limiters active on general API, auth, creation, and task completion  
[x] Regex special characters escaped across all search queries  
[x] Pagination bounded across all listing endpoints  
[x] Security headers configured (nosniff, DENY, XSS protection, Referrer-Policy)  
[x] Centralized error handler active (suppresses stack traces in production)  
[x] JWT query parameter wiped from browser history on OAuth callback  
[x] Database `role: 'admin'` recognized in admin authorization  
[x] Root `.gitignore` prevents repository secret exposure  
[ ] Rotate production secrets (`JWT_SECRET`, `CLOUDINARY_API_SECRET`) in deployment hosting dashboard  
[ ] Verify MongoDB Atlas IP Access List contains production server CIDR blocks  
