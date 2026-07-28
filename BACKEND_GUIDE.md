# PunchUp Backend Engineering & Architectural Master Guide

Welcome to the definitive backend architectural guide for **PunchUp**. This document is authored from the perspective of a Senior Backend Engineer and Educator. It serves as a permanent reference for maintenance, scaling, design trade-off evaluations, and system design/technical interview preparation.

---

## 1. Project Overview & High-Level Architecture

### Modular Monolith Architecture
PunchUp’s backend is designed as a **Modular Monolith** using **Node.js, Express, and MongoDB (via Mongoose)**.

```
 Client (Angular SPA)
        │
        ▼ (HTTP / REST API with JWT Bearer Token)
 ┌─────────────────────────────────────────────────────────┐
 │                      EXPRESS APP                        │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Middlewares: CORS, Morgan, express.json, Passport │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 │                            │                            │
 │  ┌─────────────────────────▼─────────────────────────┐  │
 │  │ Middleware: authMiddleware (JWT Verification)    │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 │                            │                            │
 │  ┌─────────────────────────▼─────────────────────────┐  │
 │  │ Controllers (Business Logic & Request Handling)  │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 │                            │                            │
 │  ┌─────────────────────────▼─────────────────────────┐  │
 │  │ Services (Domain Logic: Streak Engine, Badges)   │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 │                            │                            │
 │  ┌─────────────────────────▼─────────────────────────┐  │
 │  │ Mongoose Models (ODM Data Access Layer)           │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 └────────────────────────────┼────────────────────────────┘
                              │
                              ▼
                       MongoDB Database
```

### Key Request Lifecycle
1. **HTTP Request Arrival**: Request reaches Express via `server.js`.
2. **Global Middleware Pipeline**: Processed through `cors()`, `express.json()`, `morgan()`, and `passport.initialize()`.
3. **Routing Layer**: Dispatched to route modules under `/api/*` defined in `src/routes/`.
4. **Authentication & Authorization**: Protected routes pass through `protect` (`authMiddleware.js`), which verifies the JWT `Authorization: Bearer <token>` header, decodes user ID, retrieves the user from MongoDB, checks `isBanned`, and attaches `req.user`.
5. **Controller Layer**: Controller handles validation, invokes services/models, constructs JSON responses (`{ success: true, ... }`).
6. **Persistence Layer**: Mongoose schemas execute queries against MongoDB.

### Architectural Rationale & Trade-offs
* **Express + Node.js**: Single-threaded event loop handles high I/O concurrency efficiently for social feed operations and task tracking.
* **MongoDB (Document Store)**: Flexible schema accommodates evolving social features (posts, likes, comments, activity grids) while maintaining high write throughput.
* **JWT Authentication**: Stateless authentication eliminates session storage lookup overhead across scalable app instances.

---

## 2. Directory Structure & Layer Responsibilities

```
backend/
├── src/
│   ├── config/          # Infrastructure configurations (Database, OAuth strategies)
│   ├── controllers/     # HTTP Request/Response orchestrators
│   ├── middlewares/     # Cross-cutting concerns (Auth, Admin authorization, File uploads)
│   ├── models/          # Mongoose Schemas & Data validation rules
│   ├── routes/          # API endpoint declarations and route middleware binding
│   ├── services/        # Pure domain business logic (Streak calculation, Badges)
│   ├── utils/           # Utility functions (JWT generation, formatters)
│   ├── app.js           # Express app setup and middleware configuration
│   └── server.js        # Server bootstrapping and HTTP listener
├── scripts/             # One-off maintenance & database migration scripts
├── .env                 # Environment variables configuration
└── package.json         # Dependency manifests & NPM scripts
```

| Layer | Responsibility | What it MUST NOT do |
| :--- | :--- | :--- |
| **Routes** | Map URLs & HTTP verbs to controllers and bind middleware. | Contain business logic or database queries. |
| **Controllers** | Parse HTTP params/body, invoke services/models, return HTTP responses. | Direct complex domain logic or raw data transformations. |
| **Services** | Encapsulate pure domain rules (e.g. daily streak logic). | Rely on Express `req`/`res` objects. |
| **Models** | Define DB schemas, field validation, and data constraints. | Access request context or handle HTTP concerns. |
| **Middlewares** | Intercept requests for auth, logging, file parsing, rate limiting. | Execute core business features. |

---

## 3. Comprehensive File-by-File Analysis

### Core Bootstrapping

#### `src/server.js`
* **Purpose**: Entry point of the Node.js application. Loads environment variables, connects to database, and starts HTTP server.
* **Key Operations**:
  * Calls `dotenv.config()` to load `.env`.
  * Calls `connectDB()` from `config/db.js`.
  * Listens on `process.env.PORT || 5000`.

#### `src/app.js`
* **Purpose**: Express application factory & middleware setup.
* **Key Operations**:
  * Configures `cors()`, `express.json()`, `morgan("dev")`, `passport.initialize()`.
  * Mounts API routes: `/api/auth`, `/api/users`, `/api/tasks`, `/api/posts`, `/api/comments`, `/api/follows`, `/api/notifications`, `/api/admin`, `/api/analytics`, `/api/streaks`, `/api/upload`, `/api/grid`, `/health`, `/test`.

#### `src/config/db.js`
* **Purpose**: Manages MongoDB connection life cycle using Mongoose.
* **Key Operations**: Connects to `MONGO_URI` with exception handling and process termination on fatal connection failure (`process.exit(1)`).

#### `src/config/passport.js`
* **Purpose**: Configures Google OAuth 2.0 Strategy (`passport-google-oauth20`).
* **Key Operations**: Extracts Google profile (id, emails, displayName, photos), queries user by `googleId` or `email`. Creates user record with auto-generated unique username if not found.

---

### Models (Database Schemas)

#### `src/models/User.js`
* **Fields**: `googleId`, `username` (unique, lowercase, indexed), `email` (unique, lowercase), `displayName`, `profilePicture`, `bio`, `role` (`user`|`admin`), `isOnboarded`, `isBanned`, `banReason`.
* **Timestamps**: Enabled (`createdAt`, `updatedAt`).

#### `src/models/Task.js`
* **Fields**: `user` (ref: User), `title`, `description`, `priority` (`low`|`medium`|`high`), `category`, `dueDate`, `completed` (default `false`), `completedAt`, `isDeleted` (soft deletion flag).

#### `src/models/Post.js`
* **Fields**: `user` (ref: User), `content`, `images` (`[String]`), `likes` (`[ref: User]`), `commentsCount` (default `0`), `saves` (`[ref: User]`).

#### `src/models/Comment.js`
* **Fields**: `post` (ref: Post), `user` (ref: User), `content`.

#### `src/models/Follow.js`
* **Fields**: `follower` (ref: User), `following` (ref: User).
* **Indexes**: Compound unique index `{ follower: 1, following: 1 }` prevents duplicate follow records.

#### `src/models/Notification.js`
* **Fields**: `recipient` (ref: User), `sender` (ref: User), `type` (`follow`|`like`|`comment`), `post` (ref: Post), `isRead` (default `false`).

#### `src/models/Streak.js`
* **Fields**: `user` (ref: User, unique), `currentStreak`, `longestStreak`, `lastCompletedDate`.

#### `src/models/SavedPost.js`
* **Fields**: `user` (ref: User), `post` (ref: Post).
* **Indexes**: Compound unique index `{ user: 1, post: 1 }`.

---

### Controllers & Business Logic

#### `src/controllers/authController.js`
* `googleAuthSuccess`: Triggered post-OAuth. Generates JWT token using `generateToken(user._id)` and redirects client to frontend auth callback with token (`/auth-callback?token=...`).

#### `src/controllers/taskController.js`
* `createTask`: Creates new pending task for `req.user._id`.
* `getTasks`: Retrieves non-deleted tasks (`isDeleted: false`) sorted by creation date descending.
* `completeTask`: Toggles completion status. If completed, triggers `streakService.updateStreak(req.user._id)`.
* `deleteTask`: Performs soft deletion by setting `isDeleted: true` (or hard deletion if `?permanent=true`).
* `getArchivedTasks`: Retrieves soft-deleted or completed tasks.

#### `src/controllers/postController.js`
* `createPost`: Posts content and image URLs.
* `getFeed`: Retrieves recent posts populated with user profiles (`username`, `displayName`, `profilePicture`).
* `toggleLike`: Adds/removes user ID from post `likes` array; generates `Notification` on like.
* `savePost` / `unsavePost`: Manages `SavedPost` collection documents.

#### `src/controllers/followController.js`
* `followUser`: Resolves target user by username, creates `Follow` document, increments follower/following counts, and fires `Notification`.
* `unfollowUser`: Deletes `Follow` document.

#### `src/controllers/adminController.js`
* `getAllUsers`: Fetches all registered users for admin portal.
* `adminBanUser` / `adminUnbanUser`: Sets `isBanned` status and reason.
* `adminDeleteUser`: Cascading delete: removes user record, user tasks, posts, comments, notifications, follows, and streaks.

---

### Services

#### `src/services/streakService.js`
* **Purpose**: Core gamification algorithm calculating task completion streaks.
* **Logic Breakdown**:
```js
// Streak Calculation Algorithm:
// 1. Fetch Streak record for user.
// 2. Compare currentDate with lastCompletedDate using midnight UTC normalization.
// 3. If difference == 0 days -> Already completed today; maintain current streak.
// 4. If difference == 1 day  -> Consecutive day completion; currentStreak + 1. Update longestStreak if currentStreak > longestStreak.
// 5. If difference > 1 day   -> Streak broken; reset currentStreak to 1.
```

---

### Middlewares & Utilities

#### `src/middlewares/authMiddleware.js`
* Decodes JWT token from `Authorization: Bearer <token>`. Finds user in MongoDB. Rejects with `401 Unauthorized` if token invalid, missing, or if `user.isBanned === true`.

#### `src/middlewares/adminMiddleware.js`
* Verifies `req.user.role === 'admin'` or fallback check `req.user.email === 'utkarzz1705@gmail.com'`. Rejects with `403 Forbidden` if unauthorized.

#### `src/middlewares/uploadMiddleware.js`
* Uses `multer` with memory storage (`multer.memoryStorage()`) to handle file uploads in memory buffers before streaming to Cloudinary via `streamifier`.

#### `src/utils/generateToken.js`
* Signs JWT with payload `{ id }`, secret `process.env.JWT_SECRET`, and expiration `30d`.

---

## 4. Database Design & Entity Relationships

```
┌──────────────┐         1:N         ┌──────────────┐
│     User     │────────────────────<│     Task     │
└──────┬───────┘                     └──────────────┘
       │
       │ 1:N                         ┌──────────────┐
       ├────────────────────────────<│     Post     │
       │                             └──────┬───────┘
       │                                    │ 1:N
       │ 1:N                         ┌──────▼───────┐
       ├────────────────────────────<│   Comment    │
       │                             └──────────────┘
       │
       │ 1:N                         ┌──────────────┐
       ├────────────────────────────<│ Follow (M:N) │
       │                             └──────────────┘
       │ 1:1                         ┌──────────────┐
       └────────────────────────────<│    Streak    │
                                     └──────────────┘
```

### Key Compound Indexes & Constraints
1. **Follow Collection**: `{ follower: 1, following: 1 }` (Unique) -> Prevents duplicate follow relationships at DB engine level.
2. **SavedPost Collection**: `{ user: 1, post: 1 }` (Unique) -> Guarantees a post can only be saved once per user.
3. **User Collection**: `username` (Unique, Lowercase), `email` (Unique, Lowercase).

---

## 5. API Reference & Endpoint Specifications

| Endpoint | Verb | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/google` | GET | Public | Initiates Google OAuth2 login flow |
| `/api/auth/google/callback` | GET | Public | OAuth redirect handler; issues JWT |
| `/api/users/me` | GET | Bearer Token | Fetches current user profile |
| `/api/users/me` | PUT | Bearer Token | Updates profile details |
| `/api/tasks` | GET | Bearer Token | Retrieves non-deleted user tasks |
| `/api/tasks` | POST | Bearer Token | Creates a new task |
| `/api/tasks/:id/complete` | PATCH | Bearer Token | Toggles completion & updates streak |
| `/api/posts` | GET | Public | Gets social feed posts |
| `/api/posts` | POST | Bearer Token | Creates new social post |
| `/api/posts/:id/like` | POST | Bearer Token | Toggles like status on a post |
| `/api/follows/:username` | POST | Bearer Token | Follows target user |
| `/api/admin/users` | GET | Admin Token | Fetches user management table |
| `/api/admin/users/:userId/ban`| POST | Admin Token | Bans user account |
| `/health` | GET | Public | Lightweight health check ping |

---

## 6. Detailed Design Decisions & Trade-off Analysis

### 1. Stateless JWT vs. Stateful Sessions
* **Choice**: Stateless JWT stored in `localStorage` sent via `Authorization: Bearer <token>`.
* **Trade-off**: High horizontal scalability with zero DB lookup on auth checks vs. inability to instantly revoke tokens without maintaining a JWT blacklist cache (e.g. Redis).

### 2. Embedded Likes Array vs. Dedicated Likes Collection
* **Choice**: Array of User ObjectIds stored directly inside `Post.likes`.
* **Trade-off**: Atomic `$push`/`$pull` and instant length checks vs. potential performance degradation if likes exceed 100,000+ per post due to MongoDB's 16MB document size limit.

### 3. Separate Follow Collection vs. User Document Arrays
* **Choice**: Dedicated `Follow` model storing `{ follower, following }`.
* **Trade-off**: Requires `$lookup`/populate for fetching follower lists vs. keeping `User` document lean and fast to query during standard authentication requests.

---

## 7. Production Readiness & System Optimization

1. **Rate Limiting**: Integrate `express-rate-limit` on sensitive routes (`/api/auth`, `/api/users/check-username`).
2. **Caching Strategy**: Introduce **Redis** to cache frequently queried public profiles and task analytics to reduce MongoDB CPU usage.
3. **Database Indexing**: Add explicit indexes on foreign keys (`user` field on `Task`, `Post`, and `Comment` models) to prevent full-collection scans during lookup operations.
4. **Structured Logging**: Replace `console.error` calls with structured JSON loggers like **Winston** or **Pino**.

---

## 8. Interview Preparation & System Design Q&A

### Q1: How does PunchUp calculate streaks, and how do you handle timezone boundaries?
* **Answer**: PunchUp's `streakService` normalizes completion dates to UTC midnight (`YYYY-MM-DD`). When a task is completed, it compares the date diff with the `lastCompletedDate`. If `diff == 1`, streak increments. If `diff > 1`, streak resets. To handle multi-timezone users, production setups convert timestamps using the client's local offset before calculating midnight boundaries.

### Q2: How would you scale PunchUp from 1,000 to 1,000,000 active daily users?
* **Answer**:
  1. **Stateless App Tier**: Deploy Node.js server across container auto-scaling groups behind an NGINX / AWS ALB load balancer.
  2. **Database Read Replicas**: Separate MongoDB read operations (Feed, Profiles) to secondary read replicas while keeping writes on the primary node.
  3. **Redis Caching**: Cache User sessions and trending posts in Redis.
  4. **Asynchronous Processing**: Offload notification delivery and streak evaluation to background job queues (BullMQ + Redis).

---

## 9. Quick Revision Sheets

### 5-Minute Crash Sheet
* **Tech Stack**: Express, Node.js, MongoDB, Mongoose, Passport (Google OAuth), JWT, Cloudinary.
* **Core Auth**: Passport obtains Google Profile -> DB User creation -> JWT token generation -> Bearer token passed in HTTP Headers.
* **Key Gamification**: Task completion triggers `streakService.updateStreak()`, maintaining `currentStreak` and `longestStreak`.

### 15-Minute Technical Review
* **Soft Deletes**: Tasks use `isDeleted: true` flag for data retention and soft-restore capabilities.
* **Admin Cascading Cleanup**: Admin user deletion manually triggers dependent document removal across 6 collections to maintain database integrity.
* **Compound Unique Constraints**: `Follow` and `SavedPost` schemas utilize compound indexes to prevent duplication at the storage engine level.
