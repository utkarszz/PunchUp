# 🥊 PunchUp

**PunchUp** is a social productivity platform built around consistency, discipline, and daily self-improvement. Track your tasks, build streaks, visualise your progress on a contribution grid, and connect with a community that holds each other accountable.

---

## ✨ Features

### Core (V1)
- 🔐 **Google OAuth** — Secure, one-click sign-in
- 👤 **User Profiles** — Display name, bio, avatar
- ✅ **Task Management** — Create, edit, complete and soft-delete daily tasks
- 🔥 **Daily Streak System** — Maintained automatically on task completion
- 📊 **Consistency Grid** — GitHub-style contribution heatmap
- 💬 **Community Posts** — Share progress updates with text and images
- 🗨️ **Comments** — Threaded discussion on posts
- 🔔 **Notifications** — In-app notification inbox
- 📈 **Analytics** — Completion history and streak insights

### V2 Upgrades
- 👥 **Follow System** — Follow and discover other users
- 🔍 **Community Search** — Debounced, categorised search (Users · Posts · Hashtags) with infinite scroll
- 🗂️ **Archived Tasks** — Tasks completed >24 h automatically move to an Archived view; permanently delete when ready
- 🏠 **Smart Landing Redirect** — Authenticated users land directly on the Community feed
- 📱 **Full Responsiveness** — Pixel-perfect layout from 300 px mobile to widescreen desktop
- 🏥 **Health Endpoint** — `/health` for uptime monitoring with zero DB overhead

### Planned (V3)
- 🤖 AI Task Planner
- 💎 Premium Subscriptions
- 👁️ Profile Viewers
- ⚡ Redis Caching
- 📬 Queue System (BullMQ)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Angular 17+, TypeScript, Vanilla CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas + Mongoose |
| **Auth** | Google OAuth 2.0, JWT |
| **Realtime** | Socket.io |
| **Storage** | Cloudinary |
| **Deployment** | Vercel (frontend) · Render (backend) |

---

## 🏗 Architecture

```
punchup/
├── frontend/          # Angular SPA
│   └── src/app/
│       ├── core/      # Services, guards, interceptors
│       ├── pages/     # Feature pages (community, tasks, analytics…)
│       └── shared/    # Reusable components (sidebar, toast, command palette…)
└── backend/           # Express REST API
    └── src/
        ├── controllers/
        ├── models/
        ├── routes/
        ├── middlewares/
        └── services/
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas URI
- Google OAuth credentials
- Cloudinary account

### Backend
```bash
cd backend
cp .env.example .env   # fill in your secrets
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run start
```

The app runs at `http://localhost:4200` with the API proxied from `http://localhost:5000`.

---

## 📄 Project Status

Actively developed — V2 feature set complete, V3 roadmap in progress.