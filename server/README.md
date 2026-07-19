# Plate Forward — Server

Backend API for **Plate Forward**, a food-rescue platform connecting restaurants (donors), NGOs, and volunteers. Built with Node.js, Express 5, MongoDB/Mongoose, Socket.IO, and Zod validation.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [API Reference](#api-reference)
  - [Health](#health)
  - [Auth](#auth)
  - [Users](#users)
  - [Restaurants](#restaurants)
  - [Donations](#donations)
  - [Reservations](#reservations)
  - [Notifications](#notifications)
  - [Analytics](#analytics)
  - [Fraud](#fraud)
  - [Maps](#maps)
  - [Security (admin)](#security-admin)
  - [Admin](#admin)
- [Real-time Events (Socket.IO)](#real-time-events-socketio)
- [Background Jobs](#background-jobs)
- [Security Measures](#security-measures)
- [Testing Guide](#testing-guide)

## Tech Stack

- **Runtime:** Node.js (CommonJS), Express 5
- **Database:** MongoDB via Mongoose 9
- **Auth:** JWT access tokens + rotating refresh tokens (httpOnly cookies) + CSRF double-submit
- **Validation:** Zod
- **Real-time:** Socket.IO (optional Redis adapter for scaling)
- **File storage:** Cloudinary (avatars, logos, donation photos, documents)
- **Email:** Nodemailer
- **Scheduling:** node-cron

## Getting Started

```bash
cd server
npm install
```

Create a `.env` file in `server/` (see [Environment Variables](#environment-variables)), then:

```bash
npm run dev     # nodemon src/server.js — auto-restart on changes
npm start       # node src/server.js — production
```

The API is served under the base path:

```
http://localhost:<PORT>/api/v1
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | no (default 5000) | HTTP port |
| `NODE_ENV` | no | `development` / `production` — affects logging format and cookie `secure` flag |
| `TRUST_PROXY` | no | Number of proxy hops to trust for `X-Forwarded-For` (set when behind a reverse proxy/load balancer) |
| `CLIENT_URL` | yes | Frontend origin — used for CORS and links in emails (verification, password reset) |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Secret used to sign/verify access tokens (and Socket.IO auth) |
| `JWT_EXPIRES_IN` | no | Fallback token expiry |
| `JWT_ACCESS_EXPIRES_IN` | no (default `15m`) | Access token lifetime |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD` | yes | SMTP transporter config |
| `EMAIL_FROM_NAME`, `EMAIL_FROM_EMAIL` | yes | "From" header on outgoing emails |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes | Cloudinary config for uploads |
| `REDIS_URL` | no | If set, enables the Socket.IO Redis adapter for multi-instance scaling; otherwise falls back to in-memory |
| `ENCRYPTION_KEY` | no | Symmetric key used for sensitive field encryption |

## Project Structure

```
server/src/
├── app.js              # Express app, global middleware, route mounting
├── server.js           # Entry point: DB connect, email verify, cron jobs, HTTP + Socket.IO server
├── config/             # db, cors, email, cloudinary, and heuristic constants (maps/shelf-life/impact)
├── routes/              # one file per resource
├── controllers/         # request handlers
├── services/            # business logic (incl. services/analytics/*)
├── models/              # Mongoose schemas
├── middlewares/         # auth, authorize, csrf, sanitize, ipBlockGuard, authLimiter, upload, validate, errorHandler
├── validations/         # Zod schemas
├── jobs/                # node-cron background jobs
├── socket/              # Socket.IO server, rooms, events
├── templates/           # email templates
└── utils/               # ApiError, catchAsync, token/QR generators, geo helpers, encryption, logger
```

## Authentication

Hybrid **JWT access token + rotating refresh token** scheme with CSRF double-submit protection:

- On register/login, the server returns an `accessToken` (JWT, default 15 min expiry) in the JSON response, and sets two cookies:
  - `refreshToken` — httpOnly, `sameSite=strict`, `secure` in production. Raw token is random; only its SHA-256 hash is stored server-side (`Session` model). Rotates on every use. Lifetime: 7 days normally, 30 days if `rememberMe: true`.
  - `csrfToken` — readable (non-httpOnly), used for double-submit verification.
- **Protected routes**: send `Authorization: Bearer <accessToken>`. Enforced by the `protect` middleware.
- **Role-restricted routes**: enforced by `authorize(...roles)` on top of `protect`. Roles: `restaurant`, `ngo`, `volunteer`, `admin`.
- **`POST /auth/refresh`** and **`POST /auth/logout`** don't require a Bearer token — they rely on the `refreshToken` cookie plus a matching `x-csrf-token` header (validated against the `csrfToken` cookie).
- **Socket.IO** connections authenticate the same JWT via `socket.handshake.auth.token` (or `Authorization` header), with support for a mid-connection `auth:refresh` event.
- Active sessions can be listed/revoked individually (`GET/DELETE /users/me/sessions`) or all at once (`POST /auth/logout-all`).

## API Reference

Base path for everything below: `/api/v1`

Legend: 🔓 public · 🔒 authenticated (`protect`) · 🔒*role* authenticated + role-restricted

### Health

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/health` | 🔓 | Health check — `{ success, message, timestamp }` |

### Auth

| Method | Path | Access | Body | Description |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 (rate-limited) | `fullName, email, password, role?` (`restaurant`\|`ngo`\|`volunteer`) | Register a new user, sets auth cookies |
| POST | `/auth/login` | 🔓 (rate-limited) | `email, password, rememberMe?` | Log in, sets auth cookies |
| POST | `/auth/refresh` | 🔓 (CSRF cookie) | — | Rotate session using `refreshToken` cookie, issues new access token |
| POST | `/auth/logout` | 🔓 (CSRF cookie) | — | Revoke current session, clear cookies |
| POST | `/auth/logout-all` | 🔒 | — | Revoke all sessions for the user |
| GET | `/auth/me` | 🔒 | — | Get current authenticated user |
| GET | `/auth/verify-email/:token` | 🔓 | — | Verify email via emailed token |
| POST | `/auth/forgot-password` | 🔓 (rate-limited) | `email` | Send password reset email |
| POST | `/auth/reset-password/:token` | 🔓 (rate-limited) | `password` | Reset password via emailed token |
| PATCH | `/auth/change-password` | 🔒 | `currentPassword, newPassword` | Change password (clears refresh cookie, forces re-login) |

### Users

All routes require 🔒 `protect`.

| Method | Path | Access | Body / Query | Description |
|---|---|---|---|---|
| GET | `/users/me` | 🔒 | — | Get own profile |
| PATCH | `/users/me` | 🔒 | `fullName?, phone?` | Update own profile |
| PATCH | `/users/me/ngo-preferences` | 🔒 ngo | `address?, latitude?, longitude?, preferredFoodTypes?[], maxDistanceKm?, minQuantity?` | Update NGO matching preferences |
| GET | `/users/me/recommendations` | 🔒 ngo | query: `limit?, page?` | Get recommended donations (heuristic matching) |
| PATCH | `/users/me/volunteer-profile` | 🔒 volunteer | `address?, latitude?, longitude?, maxDistanceKm?` | Update volunteer profile |
| PATCH | `/users/me/avatar` | 🔒 | multipart `avatar` (image ≤5MB) | Upload avatar |
| POST | `/users/me/documents` | 🔒 | multipart `document` (image/PDF ≤10MB), `label?` | Upload a verification document |
| DELETE | `/users/me/documents/:documentId` | 🔒 | — | Remove a document |
| GET | `/users/me/sessions` | 🔒 | — | List active login sessions |
| DELETE | `/users/me/sessions/:sessionId` | 🔒 | — | Revoke a specific session |

### Restaurants

All routes require 🔒 restaurant.

| Method | Path | Body / Files | Description |
|---|---|---|---|
| POST | `/restaurants` | `restaurantName, ownerName, description?, phone, email, address, city, postalCode?, latitude?, longitude?, operatingHours?{open,close}, foodCategories?[]` | Create restaurant profile |
| GET | `/restaurants/me` | — | Get own restaurant profile |
| PATCH | `/restaurants/me` | partial of create schema | Update restaurant profile |
| PATCH | `/restaurants/me/logo` | multipart `logo` | Update logo |
| PATCH | `/restaurants/me/cover` | multipart `cover` | Update cover image |
| POST | `/restaurants/me/gallery` | multipart `images` (≤6) | Add gallery images |
| DELETE | `/restaurants/me/gallery/:imageId` | — | Remove a gallery image |

### Donations

| Method | Path | Access | Query / Body | Description |
|---|---|---|---|---|
| GET | `/donations` | 🔓 | `search?, city?, foodType?, status?, restaurant?, lat?, lng?, radius?, minQuantity?, maxQuantity?, expiryBefore?, expiryAfter?, availableNow?, sort?, page?, limit?` | Browse/search donations |
| GET | `/donations/:id/quality` | 🔓 | — | Heuristic freshness/risk score for a donation |
| GET | `/donations/me` | 🔒 restaurant | — | List own donations |
| POST | `/donations` | 🔒 restaurant | `title, description?, foodType, quantity, unit, expiryTime, pickupStartTime, pickupEndTime, pickupAddress, city, latitude?, longitude?, notes?` + multipart `images` (≤5) | Create a donation listing |
| PATCH | `/donations/:id` | 🔒 restaurant | partial fields | Update a donation |
| DELETE | `/donations/:id` | 🔒 restaurant | — | Delete a donation |
| POST | `/donations/:id/images` | 🔒 restaurant | multipart `images` (≤5) | Add images |
| DELETE | `/donations/:id/images/:imageId` | 🔒 restaurant | — | Remove an image |
| GET | `/donations/:id` | 🔒 restaurant | — | Get a single donation by id |

> Note: `/donations` and `/donations/:id/quality` are the only public donation routes; all others require an authenticated restaurant.

### Reservations

All routes require 🔒 `protect`.

| Method | Path | Access | Body | Description |
|---|---|---|---|---|
| POST | `/reservations/:donationId` | ngo | `notes?` | Reserve a donation |
| PATCH | `/reservations/:reservationId/cancel` | ngo | `cancellationReason` (5–300 chars) | Cancel a reservation |
| GET | `/reservations/my` | ngo | — | List own reservations |
| GET | `/reservations/restaurant` | restaurant | — | List reservations for own restaurant |
| PATCH | `/reservations/:reservationId/accept` | restaurant | — | Accept a reservation |
| PATCH | `/reservations/:reservationId/reject` | restaurant | `reason?` | Reject a reservation |
| PATCH | `/reservations/:reservationId/complete` | restaurant, admin | — | Mark completed |
| PATCH | `/reservations/:reservationId/pickup` | volunteer | — | Mark picked up |
| PATCH | `/reservations/:reservationId/deliver` | volunteer | — | Mark delivered |
| POST | `/reservations/:reservationId/rating` | ngo | `score` (1–5), `comment?` | Rate a completed reservation |
| GET | `/reservations/:reservationId/suggested-volunteers` | restaurant, admin | — | Suggested volunteers (heuristic matching) |
| GET | `/reservations/:reservationId` | any participant | — | Get reservation details |

### Notifications

All routes require 🔒 `protect`.

| Method | Path | Access | Body / Query | Description |
|---|---|---|---|---|
| GET | `/notifications` | 🔒 | `page?, limit?` | List own notifications |
| GET | `/notifications/unread-count` | 🔒 | — | Unread count |
| PATCH | `/notifications/read-all` | 🔒 | — | Mark all as read |
| PATCH | `/notifications/:id/read` | 🔒 | — | Mark one as read |
| DELETE | `/notifications/:id` | 🔒 | — | Delete a notification |
| POST | `/notifications/broadcast` | admin | `title (3-150), message (5-1000), type?, priority, roles?[]` | Broadcast a notification to users by role |

### Analytics

All routes require 🔒 `protect` + matching role.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/analytics/restaurant` | restaurant | Restaurant's donation/impact stats |
| GET | `/analytics/ngo` | ngo | NGO's reservation/impact stats |
| GET | `/analytics/volunteer` | volunteer | Volunteer's delivery stats |
| GET | `/analytics/admin` | admin | Platform-wide stats |
| GET | `/analytics/admin/heatmap` | admin | Donation heatmap data for map overlay |

### Fraud

All routes require 🔒 admin.

| Method | Path | Description |
|---|---|---|
| GET | `/fraud/report` | Suspicious NGOs (high cancellation rate), suspicious restaurants (high expiry/unclaimed rate), flagged donations |

### Maps

| Method | Path | Access | Query / Body | Description |
|---|---|---|---|---|
| GET | `/maps/nearby-donations` | 🔓 | `lat, lng, radius?, limit?` | Geospatial search for nearby donations |
| GET | `/maps/restaurants` | 🔓 | `city?` | List restaurant locations |
| GET | `/maps/ngos` | admin | — | List NGO locations (privacy-restricted) |
| POST | `/maps/distance-matrix` | 🔒 | `origins[], destinations[]` (≤25 each) | Haversine-based distance matrix |
| POST | `/maps/eta` | 🔒 | `from, to` | Estimated travel time between two points |
| POST | `/maps/optimize-route` | 🔒 | `start, stops[]` (≤25) | Greedy nearest-neighbor route ordering |
| GET | `/maps/my-route` | volunteer | — | Ordered pickup/dropoff stops for active reservations |

### Security (admin)

All routes require 🔒 admin.

| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/security/audit-logs` | `page?, limit?, action?, userId?, ip?` | Query audit log entries |
| GET | `/security/blocked-ips` | — | List currently blocked IPs |
| POST | `/security/blocked-ips` | `ip, reason?, durationMinutes?` (≤43200) | Block an IP |
| DELETE | `/security/blocked-ips/:ip` | — | Unblock an IP |

### Admin

All routes require 🔒 admin.

| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/admin/users` | `page?, limit?, role?, isBlocked?, search?` | List/search users |
| PATCH | `/admin/users/:userId/suspend` | `isBlocked, reason?` | Suspend/unsuspend a user |
| DELETE | `/admin/users/:userId` | — | Delete a user |
| PATCH | `/admin/restaurants/:restaurantId/verify` | `isVerified?, verificationStatus?` | Verify a restaurant |
| GET | `/admin/donations` | `page?, limit?, status?, restaurant?` | List all donations |
| DELETE | `/admin/donations/:donationId` | `reason?` | Force-delete a donation |
| GET | `/admin/reservations` | `page?, limit?, status?` | List all reservations |
| PATCH | `/admin/reservations/:reservationId/force-cancel` | `reason?` | Force-cancel a reservation |

## Real-time Events (Socket.IO)

The server also runs a Socket.IO server on the same HTTP server, authenticated with the same JWT access token (`socket.handshake.auth.token`). Notable features:

- Per-user, per-role, per-restaurant, per-reservation, and per-donation rooms.
- Live volunteer location broadcasting during deliveries.
- Live admin dashboard stats/activity feed.
- Notification delivery in real time (in addition to the REST `/notifications` endpoints).
- `auth:refresh` event to update a socket's token mid-connection without reconnecting.

## Background Jobs

Run via `node-cron` (started in `server.js`, defined under `src/jobs/`):

- **Donation expiry sweep** — every minute, expires stale donation listings.
- **Reservation expiry sweep** — every minute, expires stale reservations and emits socket events/notifications.
- **Expiring-soon reminders** — hourly, emails/notifies restaurants and NGOs about donations nearing expiry.

## Security Measures

- `helmet()` for secure headers.
- Global rate limiting (200 req / 15 min per IP), with a stricter limiter (10 req / 15 min) on auth endpoints (`register`, `login`, `forgot-password`, `reset-password`).
- IP blocklist (`ipBlockGuard`) — auto-blocks an IP for 30 minutes after 5 failed logins in 15 minutes; admins can also block/unblock manually.
- Custom request sanitization against NoSQL-injection/prototype-pollution payloads (strips HTML, strips `$`/`.`-prefixed keys from body/query/params).
- CSRF double-submit cookie protection on cookie-only auth endpoints.
- Refresh tokens are never stored raw — only their SHA-256 hash — and rotate on every use.
- Audit logging of security-relevant actions (failed logins, IP blocks/unblocks, session revocations) queryable via `/security/audit-logs`.
- File upload validation: mimetype allow-lists and size caps (5MB images, 10MB documents).
- Centralized error handling — Zod validation errors normalize to `400`, stack traces never leak in responses.

## Testing Guide

There is currently **no automated test suite** in this project (no `test` script, no test files). `mongodb-memory-server` is present as a dev dependency, suggesting integration tests are planned — see the setup below if you want to add them.

### Manual API testing

1. Start the server: `npm run dev` (defaults to `http://localhost:5000/api/v1`).
2. Use Postman, Insomnia, Thunder Client, or `curl`.
3. Typical flow to test protected features end-to-end:

```bash
# 1. Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Restaurant","email":"test@example.com","password":"password123","role":"restaurant"}' \
  -c cookies.txt

# 2. Log in (if not already logged in from register)
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# The JSON response contains "accessToken" — copy it for subsequent requests.

# 3. Call a protected route
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"

# 4. Refresh the access token using the cookie jar (needs matching CSRF header)
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -b cookies.txt -c cookies.txt \
  -H "x-csrf-token: <value of csrfToken cookie>"
```

Notes for manual testing:
- Cookie-based endpoints (`/auth/refresh`, `/auth/logout`) need the `refreshToken` cookie **and** a matching `x-csrf-token` header equal to the `csrfToken` cookie value — most REST clients need this configured explicitly (Postman: enable cookie jar + add the header manually).
- Role-restricted routes return `403` if the authenticated user's role doesn't match; register separate test users per role (`restaurant`, `ngo`, `volunteer`, `admin` — admin role must currently be set directly in the database, there is no public signup path for it).
- File-upload endpoints (`multipart/form-data`) — set the field name exactly as documented above (e.g. `avatar`, `images`, `document`) or the request will be rejected before reaching the controller.
- Repeated failed logins (5 within 15 minutes) will auto-block your IP for 30 minutes — an admin can lift this early via `DELETE /security/blocked-ips/:ip`, or wait for TTL expiry.
- Use a MongoDB Compass/Atlas connection or `mongosh` against your `MONGODB_URI` to inspect state (e.g. confirm a `Donation`'s `status`, or a `Session`'s hashed token) while testing.

### Adding automated tests (recommended setup)

If you add a test suite, this stack fits the existing dependencies:

```bash
npm install --save-dev jest supertest
```

```json
// package.json
"scripts": {
  "test": "jest --runInBand"
}
```

- Use `mongodb-memory-server` (already installed) to spin up an in-memory MongoDB instance per test run instead of hitting a real database.
- Use `supertest` against the exported Express `app` (from `src/app.js`) to test routes without needing a running server or real network calls.
- Structure suggestion: `server/src/__tests__/<resource>.test.js`, one file per route group (mirrors `routes/`), plus a shared `setup.js` that boots the in-memory DB and clears collections between tests.
