# PunchUp — Master Technical Interview & System Design Guide

Welcome to the definitive, full-stack **Technical Interview Preparation Guide** for **PunchUp** (Habit, Productivity & Gamification Social Platform).

This document is engineered to help you explain every architectural decision, data model, scaling bottleneck, security fix, and system design trade-off in technical interviews (FAANG / Tier-1 Tech / Senior Full-Stack & System Design rounds).

---

## Table of Contents
1. [Project Elevator Pitch (30s & 2m Version)](#1-project-elevator-pitch)
2. [High-Level Architecture & Tech Stack](#2-high-level-architecture--tech-stack)
3. [Core Systems Deep Dive](#3-core-systems-deep-dive)
   - [A. Streak & Gamification Engine](#a-streak--gamification-engine)
   - [B. Focus Timer & Anti-Throttling Architecture](#b-focus-timer--anti-throttling-architecture)
   - [C. Web Push & Service Worker Notifications](#c-web-push--service-worker-notifications)
   - [D. Threaded Comment System & Cascading Cleanup](#d-threaded-comment-system--cascading-cleanup)
   - [E. Aggregation Pipelines & Leaderboards](#e-aggregation-pipelines--leaderboards)
4. [Critical Architectural Trade-offs](#4-critical-architectural-trade-offs)
5. [Security Hardening & Vulnerability Remediation](#5-security-hardening--vulnerability-remediation)
6. [Top 15 Technical Interview Questions & Senior Answers](#6-top-15-technical-interview-questions--senior-answers)
7. [System Design: Scaling PunchUp from 1K to 1M DAU](#7-system-design-scaling-punchup-from-1k-to-1m-dau)
8. [Quick Revision Cheat Sheets](#8-quick-revision-cheat-sheets)

---

## 1. Project Elevator Pitch

### 30-Second Pitch
> *"PunchUp is a full-stack habit tracking and productivity platform that combines task management, deep work focus timers, and social accountability mechanics. It is built with an Angular 17 standalone reactive frontend and a modular Node.js/Express monolith backed by MongoDB. Key engineering challenges solved include timezone-accurate streak calculation, resilient client-side focus session persistence across tab sleep cycles, real-time Web Push notifications, and optimized MongoDB aggregation pipelines for global leaderboards."*

### 2-Minute Pitch (Deep Dive)
> *"Most productivity apps suffer from either being too isolated or overly cluttered. PunchUp blends accountability with gamification: users maintain streaks, earn leaderboard points, run deep-focus sessions, and interact in a social feed with threaded replies and post sharing.*
>
> *On the frontend, I chose **Angular 17 Standalone Components** with a reactive architecture powered by RxJS `BehaviorSubject` stores, avoiding the runtime overhead of heavy state libraries while guaranteeing unidirectional data flow. I also engineered a custom mobile viewport synchronizer (`--visual-vh`) to eliminate virtual keyboard layout breaking on mobile devices.*
>
> *On the backend, I designed a **modular monolith** with Express, JWT authentication with strict return-URL sanitation, and MongoDB with compound indexes (e.g., `{ follower: 1, following: 1 }` and `{ user: 1, post: 1 }`). In V3, I integrated Service Worker notifications for active focus timers, implemented comment tree hierarchies with cascaded deletion, and conducted an 18-point security audit that hardened against NoSQL injection, mass assignment, and profile data leakage."*

---

## 2. High-Level Architecture & Tech Stack

```
                   ┌─────────────────────────────────────────┐
                   │        Angular 17 Standalone SPA        │
                   │  - Reactive RxJS Stores (Singletons)   │
                   │  - Functional Guards & Interceptors     │
                   │  - Service Worker (Local + Web Push)    │
                   └────────────────────┬────────────────────┘
                                        │ (HTTPS / REST + JWT Bearer)
                   ┌────────────────────▼────────────────────┐
                   │           Node.js / Express API         │
                   │  ┌───────────────────────────────────┐  │
                   │  │ Middlewares: Auth, CORS, Limiter  │  │
                   │  ├───────────────────────────────────┤  │
                   │  │ Controllers (Request & Response)  │  │
                   │  ├───────────────────────────────────┤  │
                   │  │ Domain Services (Streak Engine)   │  │
                   │  ├───────────────────────────────────┤  │
                   │  │ Mongoose Models & Compound Index  │  │
                   │  └───────────────────────────────────┘  │
                   └────────────────────┬────────────────────┘
                                        │
                   ┌────────────────────▼────────────────────┐
                   │            MongoDB Cluster              │
                   │  Collections: Users, Tasks, Posts,      │
                   │  Comments, FocusSessions, Notifications │
                   └─────────────────────────────────────────┘
```

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Frontend** | Angular 17+, TypeScript, RxJS, SCSS | Standalone components, reactive unidirectional state, Service Worker background synchronization. |
| **Backend** | Node.js, Express 4.x | Modular monolith routing, validation, token issuance, domain services. |
| **Database** | MongoDB 7.x, Mongoose ODM | Document storage, atomic operations (`$inc`, `$addToSet`), compound uniqueness indexing. |
| **Auth** | Passport.js (Google OAuth2), JWT | Stateless Bearer token auth, role-based admin gates (`user` vs `admin`). |
| **Notifications** | Web Push API, `web-push` npm, Service Worker | Background push delivery, local live focus timer notifications with tag replacement. |
| **Media** | Cloudinary & Multer | Secure cloud asset storage for user avatars and community post images. |

---

## 3. Core Systems Deep Dive

### A. Streak & Gamification Engine

- **The Problem**: Streaks must be continuous calendar days. Users operate in different timezones; a user completing a task at 11:30 PM in Tokyo must not break their streak or be judged against UTC midnight.
- **Implementation**:
  - `Task.completed` triggers `streakService.updateStreak(userId, timezone)`.
  - The completion timestamp is projected into the user's local date (`YYYY-MM-DD`).
  - Calculate `diffDays = currentDate - lastCompletedDate`:
    - `diffDays === 0`: Task completed on the same calendar day; streak count remains unchanged, but total completed tasks increment.
    - `diffDays === 1`: Consecutive calendar day; `currentStreak += 1`. If `currentStreak > longestStreak`, update `longestStreak = currentStreak`.
    - `diffDays > 1`: Missed a day; `currentStreak` resets to 1.
- **Race Condition Guard**: Atomic Mongoose `findOneAndUpdate` operations prevent concurrent requests from double-incrementing streaks.

### B. Focus Timer & Anti-Throttling Architecture

- **The Problem**: Browsers aggressively throttle `setInterval` / `setTimeout` to 1 execution per minute (or freeze execution entirely) when a tab is in the background or minimized.
- **Implementation**:
  - The timer does **not** rely on cumulative counter increments (`elapsed++`).
  - Authoritative elapsed calculation uses wall-clock timestamps:
    $$\text{elapsed} = \left\lfloor \frac{\text{Date.now()} - \text{startTime} - \text{accumulatedPausedMs}}{1000} \right\rfloor$$
  - **Local Pause/Resume**: When paused, `pausedAt = Date.now()` is recorded. On resume, `accumulatedPausedMs += Date.now() - pausedAt`.
  - **Persistence**: State is serialized into `localStorage`. On page reload, the timer instantly calculates accurate elapsed time with zero drift.
  - **Service Worker Notification**:
    - The Service Worker uses `tag: 'punchup-focus-timer'`, `renotify: false`, and `silent: true`.
    - Instead of spamming the OS notification queue every second, updates trigger every 30 seconds and immediately upon `document.visibilitychange`.

### C. Web Push & Service Worker Notifications

- **Task Reminders (Server-Initiated)**:
  - User subscribes via `PushManager.subscribe()` using public VAPID keys.
  - Subscription endpoint and keys (`p256dh`, `auth`) are persisted in MongoDB.
  - Backend scheduled cron checks tasks nearing deadline and dispatches Web Push payloads via `web-push`.
  - Service worker `push` event handles incoming payloads with tag `'punchup-task-reminder'`.
- **Focus Timer (Client-Initiated)**:
  - Uses direct Service Worker `registration.showNotification()` with tag `'punchup-focus-timer'`.
  - Independent tags ensure task reminders and timer notifications never overwrite or interfere with each other.

### D. Threaded Comment System & Cascading Cleanup

- **Schema Design**:
  ```javascript
  {
    post: { type: ObjectId, ref: 'Post', required: true, index: true },
    user: { type: ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 1000 },
    parentComment: { type: ObjectId, ref: 'Comment', default: null, index: true },
    likes: [{ type: ObjectId, ref: 'User' }]
  }
  ```
- **Validation**:
  - Prevents orphan comments: Checks that `parentComment` exists and belongs to the identical post (`parent.post.toString() === post._id.toString()`).
- **Cascaded Deletion**:
  - Deleting a parent comment recursively deletes all child replies in a single `$in` query:
    ```javascript
    await Comment.deleteMany({
      $or: [{ _id: commentId }, { parentComment: commentId }]
    });
    ```
  - Decrements `Post.commentsCount` by the actual count of deleted documents (`deletedCount`).

### E. Aggregation Pipelines & Leaderboards

- **Aggregation Pipeline**:
  - Filter active focus sessions: `{ status: 'completed', startTime: { $gte: boundaryDate } }`.
  - Group by user:
    ```javascript
    [
      { $match: { status: 'completed', startTime: { $gte: startDate } } },
      { $group: { _id: '$user', totalFocusSeconds: { $sum: '$duration' }, sessionCount: { $sum: 1 } } },
      { $sort: { totalFocusSeconds: -1 } },
      { $limit: 50 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' }
    ]
    ```
- **Performance**: Indexed with compound key `{ status: 1, startTime: -1, user: 1, duration: 1 }`, allowing the aggregation to execute almost entirely from the index.

---

## 4. Critical Architectural Trade-offs

| Decision | Alternative | Why Chosen | Trade-off / Consequence |
|---|---|---|---|
| **Stateless JWT in localStorage** | Stateful server sessions in Redis | Zero database query latency on authenticated API endpoints; simple horizontal scale. | Inability to instantly revoke individual JWTs before expiration without maintaining a token revocation blacklist. |
| **Angular Standalone Components** | Angular `NgModule`s | Tree-shakable, explicit dependency graphs, smaller bundles, faster compile times. | Requires explicit `imports: [...]` on every component declaration. |
| **Modular Monolith** | Microservices Architecture | Atomic database transactions, single deployment pipeline, zero network latency between services. | Whole service redeploys together; bounded contexts must be enforced by code structure rather than network boundaries. |
| **Embedded Likes Array** | Separate `Like` Collection | Atomic `$addToSet`/`$pull`, fast count (`likes.length`), zero `$lookup` joins. | MongoDB 16MB document size limit (acceptable up to ~100k likes per post, beyond which a separate collection would be required). |
| **Wall-Clock Timestamp Timer** | `setInterval` counter | Completely immune to background tab throttling, sleep modes, and device suspensions. | Requires tracking pause offsets (`accumulatedPausedMs`) manually. |

---

## 5. Security Hardening & Vulnerability Remediation

During the security audit, 18 distinct security vectors were evaluated and remediated:

1. **Elimination of Dev Token Minting Backdoor**:
   - *Vulnerability*: `/api/test/token` allowed unauthenticated generation of signed JWTs for any user ID or email.
   - *Fix*: Route completely disabled in production environments; enabled exclusively under strict `NODE_ENV === 'test'`.
2. **Public Profile Projection Whitelist**:
   - *Vulnerability*: `GET /api/users/:username` previously leaked user email, internal role, and ban reason.
   - *Fix*: Enforced strict projection: `.select('username displayName profilePicture bio totalPoints createdAt')`.
3. **Mass Assignment Protection**:
   - *Vulnerability*: `updateTask` permitted `req.body` directly into `findByIdAndUpdate`, allowing ownership transfer or fake completion.
   - *Fix*: Strict payload destructuring; only allowed fields (`title`, `description`, `priority`, `dueDate`, `reminderInterval`) can be updated.
4. **Open Redirect Sanitization**:
   - *Vulnerability*: Login redirect parameters could redirect users to external phishing sites (`?returnUrl=https://attacker.com`).
   - *Fix*: Validated with `sanitizeReturnUrl()`: only allows relative internal paths starting with `/` followed by safe path characters.
5. **NoSQL Injection Guard**:
   - Mongoose strictly casts schema types; query parameters are sanitized to prevent operator injection (e.g. `{"$gt": ""}`).

---

## 6. Top 15 Technical Interview Questions & Senior Answers

### Q1: How do you prevent users from cheating the Focus Timer by manipulating client timestamps?
> **Answer**: The client sends a suggested duration upon stopping, but the backend treats the client duration as unauthoritative. The server computes:
> $$\text{maxAllowedDuration} = \frac{\text{Date.now()} - \text{session.startTime}}{1000} + 30\text{s buffer}$$
> If the client duration is negative or exceeds `maxAllowedDuration`, the server rejects the request with `400 Bad Request`. If the client submits nothing, the server automatically assigns `maxAllowedDuration`.

### Q2: Why choose RxJS `BehaviorSubject` stores over NgRx for state management?
> **Answer**: For PunchUp's scope, NgRx introduces heavy boilerplate (actions, reducers, effects, selectors) and runtime bundle overhead. A service-based store using `BehaviorSubject` provides:
> 1. Unidirectional data flow.
> 2. Read-only public observables (`asObservable()`).
> 3. Clean integration with Angular's `async` pipe, eliminating memory leaks through automatic subscription lifecycle management.
> 4. Fast development cycle without redundant layers.

### Q3: How do you handle mobile keyboard covering input fields in Angular?
> **Answer**: In mobile browsers, the virtual keyboard shifts the viewport without resizing `window.innerHeight`. In `AppComponent`, we track `window.visualViewport`:
> ```typescript
> const h = window.visualViewport?.height ?? window.innerHeight;
> document.documentElement.style.setProperty('--visual-vh', `${h}px`);
> document.body.classList.toggle('keyboard-open', window.innerHeight - h > 120);
> ```
> We also attach a global `focusin` listener that automatically calls `scrollIntoView({ block: 'center', behavior: 'smooth' })` for focused input elements.

### Q4: How does MongoDB compound indexing optimize the Follow relationship?
> **Answer**: We define `{ follower: 1, following: 1 }` with `{ unique: true }`.
> 1. **Data Integrity**: Enforces uniqueness at the database engine level, making duplicate follows impossible without application-level race conditions.
> 2. **Query Performance**: Any query filtering by `follower` (e.g., "Who does User A follow?") or by both `follower` and `following` (e.g., "Does User A follow User B?") executes as an index-seek ($O(\log N)$) rather than a collection scan ($O(N)$).

### Q5: How do you prevent notifications when users interact with their own content?
> **Answer**: In both `postController` and `commentController`, before creating a `Notification` document, we check:
> ```javascript
> if (post.user.toString() !== req.user._id.toString()) {
>   await Notification.create({ ... });
> }
> ```
> The same guard is applied to comment likes and comment replies. This prevents spamming the user with self-notifications.

### Q6: How do you avoid open-redirect vulnerabilities in OAuth/Login flows?
> **Answer**: An attacker can send a link: `punchup.vercel.app/login?returnUrl=https://malicious-site.com`. If we blindly redirect to `returnUrl` after login, the user is phished.
> We sanitize the return URL using a regex whitelist:
> ```typescript
> function sanitizeReturnUrl(url: string): string {
>   if (!url || typeof url !== 'string') return '/dashboard';
>   // Must start with a single '/' and not '//' (protocol-relative URLs)
>   if (url.startsWith('/') && !url.startsWith('//') && /^[a-zA-Z0-9_\-\/?&=#]+$/.test(url)) {
>     return url;
>   }
>   return '/dashboard';
> }
> ```

### Q7: What is the purpose of `shareId` in the Post model instead of exposing MongoDB `_id`?
> **Answer**:
> 1. **Security**: Sequential or predictable database IDs can allow enumeration attacks.
> 2. **Clean URLs**: `p_a8f3b2c1` is concise, user-friendly, and decouples the external public reference from internal primary keys.
> 3. **Backward Compatibility**: Our `getPostById` controller queries `Post.findOne({ $or: [{ shareId: id }, { _id: isValidObjectId(id) ? id : null }] })`, auto-backfilling `shareId` on legacy posts without breaking existing bookmarks.

### Q8: How does the Angular HTTP Interceptor handle JWT authentication?
> **Answer**: The functional `authInterceptor` intercepts every outgoing HTTP request:
> 1. It checks if the request URL targets the PunchUp API origin (`environment.apiUrl`).
> 2. If a JWT token exists in `AuthService`, it clones the immutable `HttpRequest` and appends the `Authorization: Bearer <token>` header.
> 3. It intercepts HTTP 401 Unauthorized responses to trigger the session-expired logout and save the current route for redirection.

### Q9: Why use soft deletion for tasks rather than hard deletion?
> **Answer**:
> 1. **Audit & Analytics**: Analytics calculations (completion rates, weekly activity) rely on historical task data. Hard-deleting records would skew past metric computations.
> 2. **Undo / Recovery**: Allows instant undo functionality.
> 3. **Query Implementation**: Task queries apply `{ user: req.user._id, isDeleted: { $ne: true } }`.

### Q10: How do you prevent notification spam for ongoing focus timers?
> **Answer**:
> 1. We use Service Worker notifications with the fixed tag `'punchup-focus-timer'`.
> 2. We set `renotify: false` and `silent: true`, ensuring the operating system replaces the existing notification in-place without triggering new sounds, vibrations, or notification pop-up banners.
> 3. We throttle updates to every 30 seconds and update immediately on `visibilitychange`.

---

## 7. System Design: Scaling PunchUp from 1K to 1M DAU

If asked: *"How would you scale PunchUp's architecture to handle 1,000,000 Daily Active Users?"*

```
                             ┌───────────────────┐
                             │  Cloudflare / CDN │
                             └─────────┬─────────┘
                                       │
                             ┌─────────▼─────────┐
                             │   AWS ALB / NGINX │
                             └────┬─────────┬────┘
                                  │         │
                 ┌────────────────▼───┐  ┌──▼────────────────┐
                 │ Express Pod 1      │  │ Express Pod N     │
                 │ (Stateless Cluster)│  │ (Auto-scaling)    │
                 └────────┬───────────┘  └──┬────────────────┘
                          │                 │
              ┌───────────┴─────────────────┴───────────┐
              │                                         │
     ┌────────▼────────┐                       ┌────────▼────────┐
     │  Redis Cluster  │                       │ MongoDB Primary │
     │  - Session/Rate │                       │ (Writes)        │
     │  - BullMQ Queue │                       └────────┬────────┘
     │  - Leaderboard  │                                │ Replication
     └────────┬────────┘                       ┌────────▼────────┐
              │                                │ MongoDB Second. │
     ┌────────▼────────┐                       │ (Read Replicas) │
     │ Background      │                       └─────────────────┘
     │ Worker Fleet    │
     │ - Web Push      │
     │ - Streak Cron   │
     └─────────────────┘
```

1. **Stateless App Tier**:
   - Containerize Node.js instances with Docker and deploy across AWS ECS / Kubernetes behind an Application Load Balancer.
2. **Database Scaling**:
   - **Read/Write Splitting**: Route feed queries, user profile lookups, and task lists to MongoDB secondary read replicas (`readPreference: 'secondaryPreferred'`), keeping the primary replica dedicated to write traffic.
   - **Sharding**: Shard the `tasks` and `focusSessions` collections using hashed user ID (`{ user: "hashed" }`) as the shard key.
3. **Redis Caching Tier**:
   - **Leaderboards**: Replace heavy MongoDB aggregation pipelines with Redis Sorted Sets (`ZADD`, `ZREVRANGE`). Fetching top 50 users becomes an $O(\log N + M)$ in-memory operation.
   - **Rate Limiting**: Use Redis-backed rate limiting to protect auth endpoints across multiple application pods.
4. **Asynchronous Background Processing (BullMQ)**:
   - Move Web Push notification delivery and streak calculation off the main HTTP request-response cycle into a Redis BullMQ worker queue.

---

## 8. Quick Revision Cheat Sheets

### 5-Minute Pre-Interview Crash Sheet
- **Stack**: Angular 17 Standalone + RxJS + Node.js/Express + MongoDB/Mongoose.
- **Core Pattern**: Modular Monolith, stateless JWT auth, reactive service-based state.
- **Unique Highlight 1**: Mobile Visual Viewport tracking (`--visual-vh`) prevents soft-keyboard overlap.
- **Unique Highlight 2**: Focus timer anti-throttling uses wall-clock timestamps and 30s Service Worker tag updates.
- **Unique Highlight 3**: Timezone-aware streak engine with atomic MongoDB operations.
- **Security Audit**: 18 dimensions audited; fixed dev token backdoor, added projection whitelists, prevented mass assignment and open redirects.

### 15-Minute System Review
- **Mongoose Compound Indexes**:
  - `Follow`: `{ follower: 1, following: 1 }` (unique)
  - `SavedPost`: `{ user: 1, post: 1 }` (unique)
  - `FocusSession`: `{ status: 1, startTime: -1, user: 1, duration: 1 }`
- **Soft Deletion**: Tasks use `isDeleted: true` to preserve streak analytics and enable instant restore.
- **Cascaded Cleanup**: Deleting a parent comment recursively removes child replies and decrements `commentsCount` by the actual deleted count.
- **Service Worker Separation**:
  - Task reminders: Server Web Push $\rightarrow$ `punchup-task-reminder`
  - Focus timer: Client Service Worker $\rightarrow$ `punchup-focus-timer`
