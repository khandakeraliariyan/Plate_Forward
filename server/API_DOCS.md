# Plate Forward — API Documentation

Base path for every endpoint below: `/api/v1`

Legend: 🔓 public · 🔒 authenticated (`protect`) · 🔒*role* authenticated + role-restricted

See [README.md](README.md) for setup, environment variables, authentication mechanics, real-time events, and the testing guide.

## Table of Contents

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

## Health

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/health` | 🔓 | Health check — `{ success, message, timestamp }` |

## Auth

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

## Users

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

## Restaurants

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

## Donations

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

## Reservations

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

**Status lifecycle:** `pending` → `accepted` → `picked_up` → `delivered`/`completed`, with `rejected`/`cancelled` as terminal branches from `pending`/`accepted`.

## Notifications

All routes require 🔒 `protect`.

| Method | Path | Access | Body / Query | Description |
|---|---|---|---|---|
| GET | `/notifications` | 🔒 | `page?, limit?` | List own notifications |
| GET | `/notifications/unread-count` | 🔒 | — | Unread count |
| PATCH | `/notifications/read-all` | 🔒 | — | Mark all as read |
| PATCH | `/notifications/:id/read` | 🔒 | — | Mark one as read |
| DELETE | `/notifications/:id` | 🔒 | — | Delete a notification |
| POST | `/notifications/broadcast` | admin | `title (3-150), message (5-1000), type?, priority, roles?[]` | Broadcast a notification to users by role |

## Analytics

All routes require 🔒 `protect` + matching role.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/analytics/restaurant` | restaurant | Restaurant's donation/impact stats |
| GET | `/analytics/ngo` | ngo | NGO's reservation/impact stats |
| GET | `/analytics/volunteer` | volunteer | Volunteer's delivery stats |
| GET | `/analytics/admin` | admin | Platform-wide stats |
| GET | `/analytics/admin/heatmap` | admin | Donation heatmap data for map overlay |

## Fraud

All routes require 🔒 admin.

| Method | Path | Description |
|---|---|---|
| GET | `/fraud/report` | Suspicious NGOs (high cancellation rate), suspicious restaurants (high expiry/unclaimed rate), flagged donations |

## Maps

| Method | Path | Access | Query / Body | Description |
|---|---|---|---|---|
| GET | `/maps/nearby-donations` | 🔓 | `lat, lng, radius?, limit?` | Geospatial search for nearby donations |
| GET | `/maps/restaurants` | 🔓 | `city?` | List restaurant locations |
| GET | `/maps/ngos` | admin | — | List NGO locations (privacy-restricted) |
| POST | `/maps/distance-matrix` | 🔒 | `origins[], destinations[]` (≤25 each) | Haversine-based distance matrix |
| POST | `/maps/eta` | 🔒 | `from, to` | Estimated travel time between two points |
| POST | `/maps/optimize-route` | 🔒 | `start, stops[]` (≤25) | Greedy nearest-neighbor route ordering |
| GET | `/maps/my-route` | volunteer | — | Ordered pickup/dropoff stops for active reservations |

## Security (admin)

All routes require 🔒 admin.

| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/security/audit-logs` | `page?, limit?, action?, userId?, ip?` | Query audit log entries |
| GET | `/security/blocked-ips` | — | List currently blocked IPs |
| POST | `/security/blocked-ips` | `ip, reason?, durationMinutes?` (≤43200) | Block an IP |
| DELETE | `/security/blocked-ips/:ip` | — | Unblock an IP |

## Admin

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
