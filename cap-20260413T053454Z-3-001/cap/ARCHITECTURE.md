# ParkEase - Project Architecture

## File Structure & Purpose

### HTML Pages
| File | Purpose |
|------|---------|
| `index.html` | Landing page, auth check for Book/Dashboard links |
| `signup.html` | User registration, stores profile in Firebase Realtime DB |
| `login.html` | Email/password login, persistent session via Firebase Auth |
| `dashboard.html` | User dashboard, bookings, profile, receipts |
| `booking.html` | Multi-step booking flow, saves to Firebase |
| `success.html` | Booking confirmation page |
| `admin.html` | Admin panel: view users & bookings |

### Scripts
| File | Purpose |
|------|---------|
| `firebase-config.js` | Firebase init (single load, no duplicate), exposes `firebaseAuth`, `firebaseDb` |
| `auth.js` | Shared auth: `ParkEaseAuth.getCurrentUser()`, `signOut()`, `requireAuth()` |
| `script.js` | UI: hamburger menu, smooth scroll, contact form |
| `dashboard.js` | Dashboard logic: load user, bookings, receipts, filters |
| `admin.js` | Admin: check admin access, load users & bookings |

### Load Order (per page)
1. Firebase SDK (app, auth, database compat)
2. `firebase-config.js`
3. `auth.js` (where auth is needed)
4. `script.js` (where nav/UI exists)
5. Page-specific script (e.g. `dashboard.js`)

---

## Firebase Structure

### Realtime Database
```
/users/{uid}
  - email, firstName, lastName, phone, vehicleType, displayName, createdAt
  - /bookings/{bookingId}  → user's bookings

/bookings/{bookingId}
  - id, userId, location, spotNumber, date, startTime, endTime
  - vehicleNumber, amount, status, createdAt, etc.

/admins/{uid} = true     → admin UIDs
/adminEmails/{key} = "email@example.com"  → optional email-based admin
```

### Auth
- Email/password (Firebase Auth)
- Session persistence: LOCAL (default)
- `localStorage.currentUser` synced for quick access before auth ready

---

## Auth Flow

1. **Signup** → Create user in Firebase Auth → Save profile to `users/{uid}` → Sign out (if email verification required) → Redirect to login
2. **Login** → `signInWithEmailAndPassword` → Load profile from DB → Store in `localStorage.currentUser` → Redirect to dashboard
3. **Dashboard/Booking** → `onAuthStateChanged` or `localStorage.currentUser` → Require auth or redirect to login
4. **Logout** → `firebase.auth().signOut()` + clear `currentUser`

---

## Admin Setup

To enable admin access:
1. Sign up / log in as a user
2. In Firebase Console → Realtime Database:
   - Add `admins/{YOUR_UID}` = `true`
   - Or add `adminEmails/0` = `"you@example.com"`

---

## Gmail Restriction

Set `REQUIRE_GMAIL_ONLY = true` in signup.html, login.html, dashboard.js, and booking.html to restrict to Gmail domains.
