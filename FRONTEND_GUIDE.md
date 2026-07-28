# PunchUp Frontend Engineering & Architectural Master Guide

Welcome to the master frontend architectural guide for **PunchUp**. This document is authored from the perspective of a Senior Frontend Engineer and Technical Lead. It provides an exhaustive breakdown of the client application built with **Angular 17+**, **RxJS**, and modern CSS.

---

## 1. Project Overview & High-Level Architecture

### Modern Angular 17 Standalone Architecture
PunchUp is built using Angular 17's **Standalone Component** paradigm, eliminating legacy `NgModule` boilerplate in favor of modular, tree-shakeable components and functional routing.

```
                  ┌─────────────────────────────────────┐
                  │            AppComponent             │
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │                                                   │
  ┌────────▼────────┐                                 ┌────────▼────────┐
  │ SidebarComponent│                                 │  RouterOutlet   │
  └─────────────────┘                                 └────────┬────────┘
                                                               │
     ┌──────────────────────┬──────────────────────┬───────────┴──────────┐
     │                      │                      │                      │
┌────▼─────────────┐  ┌─────▼────────────┐  ┌──────▼────────────┐  ┌──────▼────────────┐
│ LandingComponent │  │  TasksComponent  │  │CommunityComponent │  │ AdminComponent   │
└──────────────────┘  └──────────────────┘  └───────────────────┘  └──────────────────┘
```

### Core Architecture Highlights
* **Standalone Architecture**: Components manage their own imports via `@Component({ standalone: true, imports: [...] })`.
* **Reactive State Architecture**: State flows unidirectionally through RxJS `BehaviorSubject` streams housed in singleton services (`AuthService`, `ThemeService`, `BackendWakeupService`).
* **Functional Route Protection**: Modern functional guards (`authGuard`, `adminGuard`) protect route navigation.
* **HTTP Interceptor Pipeline**: Functional interceptor (`authInterceptor`) automatically injects Bearer JWT tokens into backend API requests.

---

## 2. Directory Structure & App Organization

```
frontend/src/app/
├── core/                        # Application-wide singletons & data layer
│   ├── guards/                  # Functional route guards (auth.guard.ts, admin.guard.ts)
│   ├── interceptors/            # HTTP interceptors (auth.interceptor.ts)
│   └── services/                # State stores & API services (Auth, Task, Post, User, etc.)
├── pages/                       # Feature view routes (Smart components)
│   ├── admin/                   # Admin user management console
│   ├── analytics/               # Visual analytics dashboards
│   ├── auth-callback/           # OAuth redirect listener
│   ├── community/               # Social feed & community post interface
│   ├── dashboard/               # Main user overview
│   ├── grid/                    # Activity contribution grid
│   ├── landing/                 # Public landing page
│   ├── login/                   # User authentication landing page
│   ├── notifications/           # User notification center
│   ├── onboarding/              # New user onboarding flow
│   ├── profile/                 # Private user profile manager
│   ├── public-profile/          # Public user profile viewer
│   └── tasks/                   # Task creation & management interface
├── shared/                      # Dumb/Reusable UI components
│   └── components/              # Sidebar, Toast, Command Palette, etc.
├── app.component.ts             # Root application shell & layout engine
├── app.config.ts                # Application configuration & dependency providers
└── app.routes.ts                # Route definitions & lazy-loading configuration
```

---

## 3. Comprehensive File-by-File Analysis

### Core Bootstrapping & Configuration

#### `src/app/app.config.ts`
* **Purpose**: Defines application-wide dependency injection providers.
* **Key Configuration**:
  * `provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))`: Enables automatic scroll position reset on navigation.
  * `provideHttpClient(withInterceptors([authInterceptor]))`: Registers the authorization header interceptor globally.

#### `src/app/app.routes.ts`
* **Purpose**: Application route routing table.
* **Lazy Loading**: Uses `loadComponent: () => import('./pages/...').then(m => m.XComponent)` for code-splitting.
* **Guards Binding**:
  * Unauthenticated routes (`/login`, `/landing`): Open.
  * Authenticated routes (`/dashboard`, `/tasks`, `/profile`): Protected by `canActivate: [authGuard]`.
  * Admin route (`/admin`): Protected by `canActivate: [adminGuard]`.

---

### Core Services & Reactive Stores

#### `src/app/core/services/auth.service.ts`
* **Purpose**: User session management and OAuth token persistence.
* **Key State Streams**:
  * `currentUserSubject = new BehaviorSubject<UserProfile | null>(null)`: Emits current user object across the app.
  * `isLoadedSubject = new BehaviorSubject<boolean>(false)`: Emits `true` once initial session check finishes.
* **Session Lifecycle**:
  1. Subscribes to `BackendWakeupService.isReady$`.
  2. Reads `localStorage.getItem('token')`.
  3. If token exists, calls `loadCurrentUser()` via `GET /api/users/me`.
  4. Stores returned profile in `currentUserSubject`.

#### `src/app/core/services/backend-wakeup.service.ts`
* **Purpose**: Free-tier backend hosting resilience manager (e.g. Render/Heroku cold-starts).
* **Ping Engine**: Pings `GET /` with up to 25 retries every 2.5s using RxJS `retry()` and `timer()`. Displays loading status UI until backend returns `200 OK`.

#### `src/app/core/services/theme.service.ts`
* **Purpose**: Light/Dark theme switching engine.
* **State Management**:
  * Stores preference in `localStorage.setItem('theme', 'dark'|'light')`.
  * Toggles `.light-mode` CSS class on `document.documentElement`.

#### `src/app/core/services/task.service.ts`
* **Purpose**: HTTP wrapper for `/api/tasks`. Provides CRUD methods: `getTasks()`, `createTask()`, `updateTask()`, `deleteTask()`, `completeTask()`.

#### `src/app/core/services/toast.service.ts`
* **Purpose**: Floating toast notification dispatcher. Manages an internal RxJS state array `toastsSubject`, automatically removing toasts after standard timeout intervals (e.g., 4000ms).

---

### Route Guards & Interceptors

#### `src/app/core/guards/auth.guard.ts`
* Functional guard checking `authService.isAuthenticated()`. Navigates to `/login` if unauthenticated.

#### `src/app/core/guards/admin.guard.ts`
* Functional guard waiting for `authService.isLoaded$`, then verifying `user.email === 'utkarzz1705@gmail.com'`. Navigates unauthorized users to `/dashboard`.

#### `src/app/core/interceptors/auth.interceptor.ts`
* Clones outgoing `HttpRequest` objects matching `environment.apiUrl` and appends `Authorization: Bearer <token>` header if JWT token exists in `AuthService`.

---

## 4. Visual Viewport & Keyboard Handling Engine

`AppComponent` (`src/app/app.component.ts`) implements advanced mobile browser Visual Viewport handling to ensure seamless UX when virtual soft-keyboards expand on mobile devices.

```typescript
// 1. Visual Viewport tracking — keeps --visual-vh in sync with keyboard
const updateVh = () => {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--visual-vh', `${h}px`);
  document.body.classList.toggle('keyboard-open', window.innerHeight - h > 120);
};

// 2. Auto-scroll any focused input into center of viewport
document.addEventListener('focusin', (e: Event) => {
  if (isFormControl(e.target)) {
    requestAnimationFrame(() => centerElement(e.target as HTMLElement));
  }
}, true);
```

### Architectural Benefits
* Prevents input fields from being covered by soft keyboards on mobile devices.
* Dynamically sets custom CSS property `--visual-vh` to keep sticky elements correctly positioned.

---

## 5. Architectural Design Decisions & Trade-offs

### 1. Standalone Components vs. NgModule Modules
* **Choice**: Standalone components throughout the application.
* **Trade-off**: Cleaner tree-shaking, explicit dependency declaration, and reduced bundle size vs. manual `imports: [...]` arrays on every component.

### 2. Service-Based RxJS Stores vs. NgRx / Redux
* **Choice**: Service-based `BehaviorSubject` reactive stores (`AuthService`, `ThemeService`).
* **Trade-off**: Lightweight setup with zero external dependency overhead vs. lack of formal Redux dev tools or automated time-travel debugging.

### 3. Client-Side Backend Wakeup Ping
* **Choice**: `BackendWakeupService` blocks app interaction until `/health` returns 200 OK.
* **Trade-off**: Guarantees zero failed initial API requests during server spin-up vs. adding a 5-15 second initial loading overlay on cold starts.

---

## 6. Interview Preparation & Technical Q&A

### Q1: How does Angular 17 Standalone architecture differ from legacy NgModules?
* **Answer**: Standalone components remove the need for `@NgModule` manifest wrappers. Components directly declare their dependencies in `@Component({ imports: [CommonModule, RouterLink, ...] })`. This improves tree-shaking efficacy, simplifies component unit testing, and reduces application startup time.

### Q2: How does PunchUp maintain state reactivity without NgRx?
* **Answer**: PunchUp utilizes RxJS `BehaviorSubject` instances inside singleton Angular services (`providedIn: 'root'`). Services expose state publicly as read-only Observables (`public currentUser$ = this.currentUserSubject.asObservable()`), allowing UI components to subscribe using the Angular `async` pipe for automatic memory management.

---

## 7. Quick Revision Sheets

### 5-Minute Crash Sheet
* **Tech Stack**: Angular 17+, Standalone Components, RxJS Observables, CSS Custom Properties.
* **State Management**: `BehaviorSubject` stores in core services (`AuthService`, `ThemeService`).
* **Auth Flow**: JWT stored in `localStorage`, attached via `authInterceptor` to outgoing HTTP requests.

### 15-Minute Technical Review
* **Cold-Start Handling**: `BackendWakeupService` pings backend root `/` up to 25 times on boot before releasing `AuthService` session initialization.
* **Mobile Viewport Fix**: `AppComponent` listens to `window.visualViewport` to dynamically set `--visual-vh` and prevent soft-keyboard coverage of active input elements.
* **Route Guards**: `authGuard` verifies presence of token; `adminGuard` waits for session resolution before checking authorization.
