# Backend folder structure

This document describes the `backend/` folder layout and explains what each file is responsible for.

- backend/
  - `package.json` — project metadata, scripts, and dependencies for the backend service.
  - src/
    - `app.js` — Express application setup: configures middleware, routes, error handling, and app-level settings.
    - `server.js` — Bootstraps the server: loads environment, connects to the database, and starts listening on a port.

    - config/
      - `cloudinary.js` — Cloudinary SDK configuration and helpers for uploads.
      - `db.js` — Database connection logic (e.g., Mongoose connection, connection options, reconnect logic).
      - `env.js` — Loads/normalizes environment variables and configuration values.
      - `passport.js` — Passport strategy configuration (e.g., JWT, OAuth), serialization and initialization.

    - controllers/
      - `analyticsController.js` — Handlers for analytics-related endpoints (collecting and returning metrics).
      - `authController.js` — Authentication logic (login, register, token exchange, callbacks).
      - `gridController.js` — Endpoints related to grid functionality used by the frontend.
      - `postController.js` — Create/read/update/delete operations for posts.
      - `streakController.js` — Endpoints to manage user streaks.
      - `taskController.js` — Handlers for task CRUD and task-related actions.
      - `uploadController.js` — Receives upload requests, delegates to the upload service/storage.
      - `userController.js` — User CRUD, profile, and account-related endpoints.

    - middlewares/
      - `authMiddleware.js` — Protects routes and enforces authentication/authorization.
      - `errorMiddleware.js` — Centralized error handling and formatting (Express error handler).
      - `rateLimitMiddleware.js` — Rate limiting for APIs (throttling clients to protect endpoints).
      - `uploadMiddleware.js` — File upload parsing (e.g., Multer configuration) and validation.

    - models/
      - `Badge.js` — Mongoose schema/model for badges earned by users.
      - `Comment.js` — Schema/model for post comments.
      - `Notification.js` — Schema/model for storing notifications.
      - `Post.js` — Schema/model for posts (content, author, timestamps, metadata).
      - `Streak.js` — Schema/model capturing streak information.
      - `Task.js` — Schema/model for user tasks.
      - `User.js` — User schema/model, authentication fields and profile info.

    - routes/
      - `analyticsRoutes.js` — Route definitions that map analytics endpoints to controller handlers.
      - `authRoutes.js` — Routes for login, logout, OAuth callbacks, token endpoints.
      - `gridRoutes.js` — Routes exposing grid-related endpoints.
      - `notificationRoutes.js` — Routes for creating/listing notifications.
      - `postRoutes.js` — Routes for post CRUD operations.
      - `streakRoutes.js` — Routes to read/update streaks.
      - `taskRoutes.js` — Routes for task operations.
      - `testRoute.js` — Development/test endpoint(s).
      - `uploadRoutes.js` — Routes that accept file uploads.
      - `userRoutes.js` — User-related routes (profile, settings, lookup).

    - services/
      - `badgeService.js` — Business logic around awarding and tracking badges.
      - `checkStreakStatus.js` — Utility/service for checking and updating streak status.
      - `notificationService.js` — Abstraction for creating and delivering notifications.
      - `streakService.js` — Business logic for streak operations and rules.

    - utils/
      - `constants.js` — Shared constants used across the backend (status codes, messages, limits).
      - `dateHelpers.js` — Utility functions for date manipulation and formatting.
      - `generateToken.js` — Utility to create authentication tokens (JWTs) for users.


Notes and usage
- Controllers contain HTTP request handlers and should remain thin: delegate heavy logic to `services/` or `models/`.
- `models/` hold Mongoose schemas and any model-level helpers or statics.
- `routes/` wire URL paths to controller functions and are mounted from `app.js`.
- `config/` centralizes third-party and environment configuration so it can be reused safely.

If you want, I can:
- add brief examples or signatures for each controller method,
- convert this into `README.md` at `backend/README.md` instead,
- or include links to the exact files in this workspace.
