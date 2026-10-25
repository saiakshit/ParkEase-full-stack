# ParkEase: File Description & Authentication Functions

---

## 📁 FILE STRUCTURE & PURPOSE

### 🎨 HTML Pages (Frontend UI)

#### 1. **index.html** - Landing Page
**Purpose:** Main landing page, entry point for website
**Content:**
- Hero section with CTA buttons
- Features showcase
- How it works explanation
- Navigation bar

**Key Features:**
- Auth-aware links (if logged in: show "Book" + "Dashboard", else show "Login/Signup")
- Smooth scroll navigation
- Hamburger menu for mobile
- Links to `/booking.html` and `/login.html`

**JS Dependencies:**
- `auth.js` - Check if user logged in
- `script.js` - Hamburger menu, smooth scroll, animations

**User Flow:**
```
Landing → "Book Now" → Check auth → /booking.html (if logged) or /login.html (if not)
       → "Dashboard" → Check auth → /dashboard.html
```

---

#### 2. **signup.html** - User Registration
**Purpose:** Create new user account
**Content:**
- Email input
- Password input
- Confirm password
- First name, Last name
- Phone number
- Vehicle type (dropdown: car, bike, large)
- Terms & conditions checkbox
- "Sign Up" button

**Form Submission:**
```javascript
firebase.auth().createUserWithEmailAndPassword(email, password)
  ├─ Creates auth user
  ├─ Stores profile in users/{uid}: { email, firstName, lastName, phone, vehicleType }
  └─ Redirects to dashboard.html
```

**JS Dependencies:**
- `firebase-config.js` - Firebase initialization
- `auth.js` - Auth helpers

**Security:**
- Email/password validation
- No hardcoded credentials
- Password hashed by Firebase Auth

---

#### 3. **login.html** - User Login
**Purpose:** Sign in existing users
**Content:**
- Email input
- Password input (with show/hide toggle)
- "Login" button
- "Forgot Password" link (optional)
- "Sign Up" link

**Form Submission:**
```javascript
firebase.auth().signInWithEmailAndPassword(email, password)
  ├─ Authenticates user
  ├─ Sets Firebase session (persistent by default)
  └─ Redirects to dashboard.html
```

**Session Persistence:**
- Firebase Auth uses `LOCAL` persistence by default
- User stays logged in until `signOut()` called or cache cleared

**JS Dependencies:**
- `firebase-config.js`
- `auth.js`

---

#### 4. **booking.html** - Parking Booking Page
**Purpose:** Multi-step booking wizard
**Steps:**
1. **Step 1:** Select location
2. **Step 2:** Select date, time, parking spot
3. **Step 3:** Enter vehicle details
4. **Step 4:** Select payment method & pay

**Data Stored in Firebase:**
```
bookings/{bookingId} = {
  userId, location, spotNumber, date, startTime, endTime,
  vehicleNumber, amount, status, paymentMethod, createdAt
}
locationBookings/{location}/{bookingId} = (same)
users/{uid}/bookings/{bookingId} = (same)
```

**Key JavaScript Functions:**
- `processPayment()` - Validates & creates booking
- `loadAvailableSlots()` - Fetches available spots
- `enforceTimeBoundaries()` - Validates time range
- `selectSpot()`, `selectDate()` - User selections

**Auth Requirement:**
- User must be logged in
- If not logged in, shows "Authentication Required" modal

---

#### 5. **dashboard.html** - User Dashboard
**Purpose:** View bookings, receipts, profile settings
**Tabs:**
1. **Bookings** - All user's bookings with status (Scheduled, Active, Expired)
2. **Receipts** - Payment receipts, download option
3. **Profile** - Edit user info (name, email, phone, vehicle)

**Sections:**
- Quick stats (Total Bookings, Active, Upcoming, Total Spent)
- Upcoming booking card (with countdown)
- Quick actions (Book Again, Download Receipt, Extend Booking)
- Notifications (upcoming bookings, expiring slots)
- Saved vehicles list
- Payment methods summary

**Key Functions:**
- `loadBookingsForUser()` - Fetch from Firebase
- `renderBookings()` - Display in table
- `computeBookingStatus()` - Determine: scheduled/active/expired
- `cancelBooking()` - Cancel a booking
- `viewReceipt()` - Show receipt modal

**Auth Requirement:**
- Must be logged in
- Redirects to login if not authenticated

---

#### 6. **success.html** - Booking Confirmation
**Purpose:** Show booking confirmation after payment
**Content:**
- ✅ Booking confirmed banner
- Booking details (ID, Date, Time, Location, Spot, Vehicle)
- Amount paid breakdown
- "View in Dashboard" button
- "Book Another" button

**Data Source:**
- `sessionStorage.bookingData` (set by `processPayment()`)

**Session Data:**
```javascript
{
  bookingId: "SPK202402141234",
  location: "Downtown Mall",
  date: "2024-02-14",
  spot: "P5",
  amount: "₹41.25",
  paymentMethod: "Google Pay",
  ...
}
```

---

#### 7. **admin.html** - Admin Dashboard
**Purpose:** Admin view of bookings & users for assigned location
**Features:**
- **Bookings Tab:** All bookings for admin's location
  - Columns: ID, Vehicle, Spot, Date, Amount, Time, Status
- **Users Tab:** All users who booked at this location
  - Columns: Email, Name, Phone, Vehicle Type, Created Date
- **Location Label:** Shows "Managing: Downtown Mall"
- Sign Out button

**Data:**
```javascript
// Load only bookings for admin's location
locationBookings/{location} = fetch

// Load users data for enrichment
users/{uid} = fetch
```

**Admin Session:**
- `sessionStorage.adminLoggedIn = "true"`
- `sessionStorage.adminLocation = "Downtown Mall"`
- `sessionStorage.adminEmail = "mall_admin@gmail.com"`

**Auth Mechanism:**
- Hardcoded credentials in `admin-login.js`
- Not using Firebase Auth (separate system)

---

### 🔐 Authentication Pages

#### 8. **admin-login.html** - Admin Login Page
**Purpose:** Login for admin users (separate from user auth)
**Content:**
- Email input
- Password input
- Error message display
- Login button

**Credentials (Hardcoded):**
```javascript
{
  "mall_admin@gmail.com": { password: "mall", location: "Downtown Mall" },
  "rail_admin@gmail.com": { password: "rail", location: "Central Railway Station" },
  "hospital_admin@gmail.com": { password: "hospital", location: "City Hospital" },
  "uni_admin@gmail.com": { password: "uni", location: "University Campus" }
}
```

**Validation:**
- Check email exists in `ADMIN_CREDENTIALS`
- Check password matches
- Store in `sessionStorage`
- Redirect to `admin.html`

---

### 📱 CSS & Configuration

#### 9. **styles.css** - Global Stylesheet
**Purpose:** All styling for responsive design
**Includes:**
- Mobile-first responsive design
- Navbar, hero, cards, forms, buttons
- Animations, transitions
- Color scheme (blue primary, gray secondary)
- Booking wizard steps styling
- Dashboard layout (grid, flex)
- Admin panel table styling

**Key Classes:**
```css
.navbar, .nav-menu, .nav-link
.hero, .hero-title, .cta-button
.booking-section, .step, .btn-primary, .btn-secondary
.dashboard-container, .booking-card, .status-active/expired
.admin-panel, .admin-tab, .table-row
```

---

#### 10. **firebase-config.js** - Firebase Setup
**Purpose:** Initialize Firebase SDK & expose global references
**Responsibilities:**
1. Define Firebase project config
2. Initialize Firebase app (single instance)
3. Initialize Auth & Database
4. Expose globally: `firebase.app()`, `firebase.auth()`, `firebase.database()`

**Key Code:**
```javascript
const firebaseConfig = {
    apiKey: "...",
    authDomain: "capstoneak-b969f.firebaseapp.com",
    databaseURL: "https://capstoneak-b969f-default-rtdb.firebaseio.com",
    projectId: "capstoneak-b969f",
    // ...
};

firebase.initializeApp(firebaseConfig);
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.database();
```

**Load Order:** Must load BEFORE any auth.js or page-specific scripts

---

### 🔑 JavaScript Authentication Module

#### 11. **auth.js** - Shared Authentication Helper
**Purpose:** Centralized auth functions for all pages
**Exports:** `window.ParkEaseAuth` object with methods

**Key Functions:**
```javascript
ParkEaseAuth.isReady()                    // Check if Firebase ready
ParkEaseAuth.getAuth()                    // Get Firebase auth instance
ParkEaseAuth.getCurrentUser()             // Get current logged-in user
ParkEaseAuth.onAuthStateChanged(callback) // Listen to auth changes
ParkEaseAuth.signOut()                    // Logout user
ParkEaseAuth.setPersistence(mode)         // LOCAL or SESSION persistence
ParkEaseAuth.syncUserToStorage(user)      // Save to localStorage
ParkEaseAuth.getStoredUser()              // Retrieve from localStorage
ParkEaseAuth.requireAuth(redirectUrl)     // Redirect if not logged in
ParkEaseAuth.redirectIfAuthenticated()    // Redirect if logged in
```

**Usage Example:**
```javascript
// Protect a page
if (!ParkEaseAuth.requireAuth('login.html')) return;

// Check current user
const user = ParkEaseAuth.getCurrentUser();

// Listen to changes
ParkEaseAuth.onAuthStateChanged(user => {
    if (user) { /* Show booking interface */ }
    else { /* Show login prompt */ }
});
```

---

### 🎨 UI & Navigation

#### 12. **script.js** - Shared UI Functions
**Purpose:** Public-facing UI interactions & animations
**Functionality:**
```javascript
// Mobile hamburger menu toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', () => {
        target.scrollIntoView({ behavior: 'smooth' });
    });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    if (scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
    }
});

// Service cards animation on scroll
new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

// Typing effect for hero title
function typeWriter(element, text, speed = 100) { /* animate text */ }

// Parallax effect on hero section
window.addEventListener('scroll', () => {
    const rate = scrolled * -0.5;
    hero.style.transform = `translateY(${rate}px)`;
});
```

**Used By:** All pages with `.navbar`, `.hero`, `.service-card` elements

---

### 📊 Page-Specific Logic

#### 13. **booking.html (inline script)** - Booking Logic
**Purpose:** Manage multi-step booking wizard
**Global State Variables:**
```javascript
let currentStep = 1;              // Current wizard step (1-4)
let selectedLocation = 'Downtown Mall';
let selectedDate = 'YYYY-MM-DD';
let selectedStartTime = '09:00';
let selectedEndTime = '10:00';
let selectedSpot = '';            // e.g., 'P5'
let selectedUPIApp = '';          // e.g., 'Google Pay'
let selectedWalletOption = '';    // e.g., 'Google Pay Wallet'
```

**Key Functions:**
```javascript
// Step navigation
nextStep(step)                      // Move to next step
prevStep(step)                      // Go back to previous step

// Location selection
selectLocation(cardElement, name)   // User picks location
setupLocationCards()                // Initialize location cards

// Date & time selection
selectDate(dateValue)               // User picks date
initializeDatePicker()              // Load 30-day calendar
previousDates() / nextDates()       // Scroll date picker
getMinimumStartTimeForSelectedDate() // Calculate min time for today
initializeTimeSelection()           // Initialize time selectors
increaseStartTime() / decreaseStartTime()  // ±10 min buttons
increaseEndTime() / decreaseEndTime()      // ±10 min buttons

// Validation
isStartTimeValid(date, time)        // Check time is future
enforceTimeBoundaries()             // Apply min buffer & max time
updateTimeCalculations()            // Recalculate price & duration

// Spot selection
loadAvailableSlots()                // Fetch spots from Firebase
selectSpot(spotNumber)              // User picks spot

// Vehicle details
setupVehicleValidation()            // Real-time validation

// Payment
setupPaymentMethodSelection()       // Radio button listeners
selectUPIApp(appName)               // UPI selection
selectWalletOption(optionName)      // Wallet selection
processPayment()                    // MAIN: Create booking

// Utilities
combineDateAndTime(date, time)      // "2024-02-14" + "14:30" → Date
generateBookingId()                 // "SPKYYYYMMDDxxx"
formatTime12Hour(time24)            // "14:30" → "2:30 PM"
getDurationFromTimes(start, end)    // Hours between times
formatCurrency(amount)              // 41.25 → "₹41.25"
updateSummary()                     // Update booking summary
updatePaymentSummary()              // Update fee breakdown
```

**Firebase Interactions:**
- **Read:** Locations, spots, bookings for date
- **Write:** New booking to 4 paths

---

#### 14. **dashboard.js** - Dashboard Logic
**Purpose:** User dashboard, bookings, receipts, profile
**State Object:**
```javascript
const state = {
    user: null,                  // Firebase auth user
    profile: null,               // User profile data
    bookings: [],                // All user's bookings
    currentReceiptBooking: null, // For receipt modal
    bookingFilter: 'all'         // Filter: all/scheduled/active/expired
};
```

**Authentication Functions:**
```javascript
enforceGmailAccount(user)          // Validate Gmail domain
handleAuthState(user)              // Main auth handler
loadUserProfile(user)              // Load user data from Firebase
loadBookingsForUser(user)          // Load bookings from Firebase + localStorage
```

**Booking Rendering:**
```javascript
computeBookingStatus(booking)      // Calculate: scheduled/active/expired
enrichBooking(rawBooking)          // Add computed fields
renderBookings(bookingsArray)      // Generate booking card HTML
renderReceipts()                   // Generate receipt list
```

**Booking Management:**
```javascript
viewReceipt(bookingId)             // Show receipt modal
printReceipt()                     // Print receipt
cancelBooking(bookingId)           // Cancel booking
```

**Dashboard Sections:**
```javascript
renderStats()                      // Show counts (total, active, upcoming, spent)
renderUpcomingBooking()            // Show next booking with countdown
renderQuickActions()               // Enable rebook/extend/download
renderNotifications()              // Show upcoming bookings/expiry alerts
renderSavedVehicles()              // Show vehicle history
renderPaymentMethods()             // Show payment methods used
```

**UI Management:**
```javascript
showTab(tabName)                   // Switch between bookings/receipts/profile
setBookingFilter(filter)           // Filter bookings by status
attachEventHandlers()              // Attach all event listeners
```

**Data Persistence:**
```javascript
persistBookingsToLocalStorage(uid, bookings)  // Save for offline
mergeBookings(primary, secondary)            // Deduplicate arrays
```

---

#### 15. **admin.js** - Admin Panel Logic
**Purpose:** Admin view of users & bookings for a location
**Admin Session Check:**
```javascript
function checkAdminSession() {
    const loggedIn = sessionStorage.getItem("adminLoggedIn");
    const location = sessionStorage.getItem("adminLocation");
    
    if (!loggedIn || !location) {
        window.location.href = "admin-login.html";
        return null;
    }
    return location;
}
```

**Admin Functions:**
```javascript
loadUsersForAdmin()                // Fetch all users who booked at location
loadBookings()                     // Fetch all bookings for location
setupTabs()                        // Tab switching: Users / Bookings
signOutAdmin()                     // Logout, clear session
```

**Data Loading:**
```javascript
// Load users/
const usersSnapshot = await firebase.database().ref('users').once('value');

// Load bookings/
const bookingsSnapshot = await firebase.database().ref('bookings').once('value');

// Load location bookings/
const snapshot = await firebase.database()
    .ref(`locationBookings/${adminLocation}`)
    .once('value');
```

**Display:**
```javascript
// Users table: Email, Name, Phone, Vehicle, Created Date
// Bookings table: ID, Vehicle, Spot, Date, Amount, Time
```

---

#### 16. **admin-login.js** - Admin Authentication
**Purpose:** Login for admin users with hardcoded credentials
**Credentials Storage:**
```javascript
const ADMIN_CREDENTIALS = {
    "mall_admin@gmail.com": {
        password: "mall",
        location: "Downtown Mall"
    },
    // ... other admins
};
```

**Login Function:**
```javascript
async function adminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    const admin = ADMIN_CREDENTIALS[email];
    
    if (!admin || admin.password !== password) {
        document.getElementById('adminError').innerText = "Invalid admin credentials";
        return;
    }
    
    // Save admin session
    sessionStorage.setItem("adminLoggedIn", "true");
    sessionStorage.setItem("adminEmail", email);
    sessionStorage.setItem("adminLocation", admin.location);
    
    // Redirect to admin panel
    window.location.href = "admin.html";
}
```

**Session Management:**
- `sessionStorage` (not persistent across browser close)
- On page load, `admin.js` checks if `adminLoggedIn` and `adminLocation` exist

---

## 🔐 USER AUTHENTICATION FUNCTIONS

### Core Authentication (auth.js)

#### 1. **`ParkEaseAuth.isReady()`**
```javascript
isReady: function() {
    return typeof firebase !== 'undefined' && firebase.auth;
}
```
- **Purpose:** Check if Firebase is loaded
- **Returns:** Boolean
- **Usage:** Verify Firebase SDK ready before calling auth functions
- **Example:**
  ```javascript
  if (!ParkEaseAuth.isReady()) {
      console.error('Firebase not loaded yet');
      return;
  }
  ```

---

#### 2. **`ParkEaseAuth.getAuth()`**
```javascript
getAuth: function() {
    return this.isReady() ? firebase.auth() : null;
}
```
- **Purpose:** Get Firebase Auth instance
- **Returns:** Firebase auth object or null
- **Usage:** Direct Firebase auth operations
- **Example:**
  ```javascript
  const auth = ParkEaseAuth.getAuth();
  auth.currentUser  // gets current user
  ```

---

#### 3. **`ParkEaseAuth.getCurrentUser()`**
```javascript
getCurrentUser: function() {
    const auth = this.getAuth();
    return auth ? auth.currentUser : null;
}
```
- **Purpose:** Get currently logged-in user
- **Returns:** Firebase user object or null
- **User Object Properties:**
  ```javascript
  {
      uid: "firebase-uid-xyz",
      email: "user@gmail.com",
      displayName: "John Doe",
      emailVerified: true/false,
      isAnonymous: false,
      photoURL: null,
      createdAt: timestamp,
      lastSignInTime: timestamp
  }
  ```
- **Usage:** Check who is logged in
- **Example:**
  ```javascript
  const user = ParkEaseAuth.getCurrentUser();
  if (user) {
      console.log("Logged in as:", user.email);
  } else {
      console.log("Not logged in");
  }
  ```

---

#### 4. **`ParkEaseAuth.onAuthStateChanged(callback)`**
```javascript
onAuthStateChanged: function(callback) {
    const auth = this.getAuth();
    if (auth) {
        return auth.onAuthStateChanged(callback);
    }
    if (typeof callback === 'function') {
        callback(null);
    }
    return function() {};
}
```
- **Purpose:** Listen for login/logout changes in real-time
- **Input:** Callback function taking user parameter
- **Returns:** Unsubscribe function
- **How It Works:**
  ```
  Auth state changes → Firebase detects → Callback fired with new user state
  ```
- **Usage:** Update UI when user logs in/out
- **Example:**
  ```javascript
  const unsubscribe = ParkEaseAuth.onAuthStateChanged(user => {
      if (user) {
          console.log("User logged in:", user.email);
          document.getElementById('bookingSection').style.display = 'block';
      } else {
          console.log("User logged out");
          document.getElementById('authCheck').style.display = 'block';
      }
  });
  
  // Later, to stop listening:
  unsubscribe();
  ```
- **Used By:** `booking.html`, `dashboard.html` (main auth checks)

---

#### 5. **`ParkEaseAuth.signOut()`**
```javascript
signOut: function() {
    const auth = this.getAuth();
    const p = auth ? auth.signOut() : Promise.resolve();
    return p.then(() => {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('bookingData');
    });
}
```
- **Purpose:** Logout user
- **Returns:** Promise
- **Side Effects:**
  - Signs out from Firebase Auth
  - Clears `localStorage.currentUser`
  - Clears `sessionStorage.bookingData`
- **Usage:** Logout button click
- **Example:**
  ```javascript
  async function logout() {
      await ParkEaseAuth.signOut();
      window.location.href = 'login.html';  // Redirect to login
  }
  ```
- **Called By:** Dashboard, booking pages

---

#### 6. **`ParkEaseAuth.setPersistence(persistence)`**
```javascript
setPersistence: function(persistence) {
    const auth = this.getAuth();
    if (auth && firebase.auth.Auth.Persistence) {
        const mode = persistence === 'session' 
            ? firebase.auth.Auth.Persistence.SESSION 
            : firebase.auth.Auth.Persistence.LOCAL;
        return auth.setPersistence(mode);
    }
    return Promise.resolve();
}
```
- **Purpose:** Control session persistence
- **Input:** `'session'` or `'local'` (default)
- **Behavior:**
  - `'session'` → User logged out when browser closes (like bank apps)
  - `'local'` → User stays logged in until `signOut()` called
- **Default:** Firebase uses `'local'` by default (ParkEase accepts this)
- **Usage:** Optional, typically not called
- **Example:**
  ```javascript
  // After login, ensure session-only (paranoid mode)
  await ParkEaseAuth.setPersistence('session');
  ```

---

#### 7. **`ParkEaseAuth.syncUserToStorage(user)`**
```javascript
syncUserToStorage: function(user) {
    if (!user) {
        localStorage.removeItem('currentUser');
        return null;
    }
    const data = {
        id: user.uid,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0]
    };
    localStorage.setItem('currentUser', JSON.stringify(data));
    return data;
}
```
- **Purpose:** Cache user info in browser localStorage
- **Input:** Firebase user object (or null to clear)
- **Stored Data Structure:**
  ```javascript
  {
      id: "firebase-uid-xyz",
      uid: "firebase-uid-xyz",
      email: "user@gmail.com",
      displayName: "John Doe"
  }
  ```
- **Usage:** Fast offline access to user data without waiting for Firebase
- **Why?** localStorage is synchronous, Firebase is async
- **Example:**
  ```javascript
  const user = ParkEaseAuth.getCurrentUser();
  if (user) {
      ParkEaseAuth.syncUserToStorage(user);
      // Now localStorage.currentUser has user data instantly
  }
  ```
- **Called By:** `onAuthStateChanged` listeners in pages

---

#### 8. **`ParkEaseAuth.getStoredUser()`**
```javascript
getStoredUser: function() {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch {
        return null;
    }
}
```
- **Purpose:** Retrieve cached user from localStorage
- **Returns:** User object or null
- **Usage:** Fast access without Firebase (page load optimization)
- **Example:**
  ```javascript
  // Check fast using localStorage
  const storedUser = ParkEaseAuth.getStoredUser();
  if (storedUser && storedUser.id) {
      // User was recently logged in
      document.getElementById('bookingSection').style.display = 'block';
  }
  
  // Then wait for Firebase to confirm
  ParkEaseAuth.onAuthStateChanged(user => {
      if (!user && storedUser) {
          // Session expired, user not in Firebase
          window.location.href = 'login.html';
      }
  });
  ```

---

#### 9. **`ParkEaseAuth.requireAuth(redirectUrl)`**
```javascript
requireAuth: function(redirectUrl) {
    redirectUrl = redirectUrl || 'login.html';
    const user = this.getCurrentUser() || this.getStoredUser();
    if (!user || !user.id) {
        window.location.replace(redirectUrl);
        return false;
    }
    return true;
}
```
- **Purpose:** Protect pages (redirect if not logged in)
- **Input:** Optional redirect URL (default: 'login.html')
- **Returns:** Boolean (true if logged in, false if redirected)
- **Usage:** At top of protected pages
- **Example:**
  ```javascript
  // In admin.html
  function init() {
      if (!ParkEaseAuth.requireAuth('admin-login.html')) {
          return;  // Redirected, stop executing
      }
      
      // User is logged in, continue
      loadDashboard();
  }
  ```
- **Called By:** `admin.js`, `dashboard.js`

---

#### 10. **`ParkEaseAuth.redirectIfAuthenticated(destination)`**
```javascript
redirectIfAuthenticated: function(destination) {
    destination = destination || 'dashboard.html';
    const user = this.getCurrentUser() || this.getStoredUser();
    if (user && user.id) {
        window.location.replace(destination);
        return true;
    }
    return false;
}
```
- **Purpose:** Redirect if already logged in (opposite of `requireAuth`)
- **Input:** Optional destination (default: 'dashboard.html')
- **Returns:** Boolean (true if redirected, false if not logged in)
- **Usage:** Login & signup pages should skip if already logged in
- **Example:**
  ```javascript
  // In login.html
  function init() {
      // If already logged in, skip to dashboard
      if (ParkEaseAuth.redirectIfAuthenticated('dashboard.html')) {
          return;
      }
      
      // Show login form
      document.getElementById('loginForm').style.display = 'block';
  }
  ```
- **Common Pattern:** Shows "Redirecting to dashboard..." and goes there

---

### Firebase Authentication Flow (firebase-config.js)

#### 11. **`firebase.auth().createUserWithEmailAndPassword(email, password)`**
- **Purpose:** Create new user account (signup)
- **Called By:** signup.html
- **Throws Errors:**
  - "auth/weak-password" → Password too short
  - "auth/email-already-in-use" → Email already registered
  - "auth/invalid-email" → Email format invalid
- **Success:** Creates auth user, triggers `onAuthStateChanged`
- **Code Example (signup.html):**
  ```javascript
  firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
          const user = userCredential.user;
          
          // Also save profile data
          firebase.database().ref(`users/${user.uid}`).set({
              email: user.email,
              firstName: firstName,
              lastName: lastName,
              phone: phone,
              vehicleType: vehicleType,
              createdAt: new Date().toISOString()
          });
          
          window.location.href = 'dashboard.html';
      })
      .catch(error => {
          document.getElementById('error').innerText = error.message;
      });
  ```

---

#### 12. **`firebase.auth().signInWithEmailAndPassword(email, password)`**
- **Purpose:** Login with existing account
- **Called By:** login.html
- **Throws Errors:**
  - "auth/user-not-found" → No user with this email
  - "auth/wrong-password" → Incorrect password
  - "auth/too-many-requests" → Account temporarily disabled (too many login attempts)
- **Success:** Sets Firebase session, triggers `onAuthStateChanged`
- **Code Example (login.html):**
  ```javascript
  firebase.auth().signInWithEmailAndPassword(email, password)
      .then(userCredential => {
          const user = userCredential.user;
          console.log("Logged in as:", user.email);
          window.location.href = 'dashboard.html';
      })
      .catch(error => {
          document.getElementById('error').innerText = error.message;
      });
  ```

---

#### 13. **`firebase.auth().signOut()`**
- **Purpose:** Logout (called by `ParkEaseAuth.signOut()`)
- **Called By:** Dashboard logout button
- **Clears:** Firebase session, `currentUser` from localStorage
- **Code Example:**
  ```javascript
  firebase.auth().signOut()
      .then(() => {
          window.location.href = 'login.html';
      })
      .catch(error => {
          console.error("Logout failed:", error);
      });
  ```

---

#### 14. **`firebase.auth().updateProfile()`**
- **Purpose:** Update user profile (displayName, photoURL)
- **Called By:** dashboard.js profile tab
- **Code Example:**
  ```javascript
  firebase.auth().currentUser.updateProfile({
      displayName: firstName + ' ' + lastName,
      photoURL: null  // optional profile picture
  })
  .then(() => {
      console.log("Profile updated");
  })
  .catch(error => {
      console.error("Profile update failed:", error);
  });
  ```

---

#### 15. **`firebase.auth().currentUser.getIdToken()`**
- **Purpose:** Get authentication token (rarely needed in this app)
- **Usage:** Sending API requests to backend servers
- **Code Example:**
  ```javascript
  const token = await firebase.auth().currentUser.getIdToken();
  // Send token in Authorization header to your backend
  ```

---

### Dashboard Authentication (dashboard.js)

#### 16. **`enforceGmailAccount(user)`**
```javascript
function enforceGmailAccount(user) {
    if (!user || !user.email) {
        throw new Error('Authentication required. Please sign in.');
    }
    if (!REQUIRE_GMAIL_ONLY) return;  // Disabled
    
    const email = user.email.toLowerCase();
    const domain = email.split('@')[1] || '';

    if (!ALLOWED_GMAIL_DOMAINS.includes(domain)) {
        throw new Error('Please sign in with a valid Gmail account.');
    }

    if (!user.emailVerified) {
        throw new Error('Your Google email is not verified.');
    }
}
```
- **Purpose:** Validate user email domain
- **Throws:** Error if email not from allowed domain
- **Current Status:** `REQUIRE_GMAIL_ONLY = false` (disabled)
- **If Enabled:** Only Gmail/Googlemail addresses allowed
- **Usage:** Called in `handleAuthState()` when user logs in
- **Example Flow:**
  ```
  User email: john@yahoo.com → Error: Not Gmail
  User email: john@gmail.com → OK
  ```

---

#### 17. **`handleAuthState(user)`**
```javascript
async function handleAuthState(user) {
    const authOverlay = document.getElementById('authCheck');
    const dashboardContainer = document.getElementById('dashboardContainer');

    if (!user) {
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (storedUser && (storedUser.id || storedUser.uid)) {
            // Fallback to cached user
            state.user = { ...storedUser, uid: storedUser.uid || storedUser.id };
            if (authOverlay) authOverlay.style.display = 'none';
            if (dashboardContainer) dashboardContainer.style.display = 'block';
            renderProfile(storedUser);
            await loadBookingsForUser(state.user);
            return;
        }
        // No user at all, redirect
        if (authOverlay) authOverlay.style.display = 'block';
        if (dashboardContainer) dashboardContainer.style.display = 'none';
        window.location.replace('login.html');
        return;
    }

    // User exists in Firebase
    try {
        enforceGmailAccount(user);
    } catch (error) {
        showToast(error.message);
        try {
            await firebase.auth().signOut();
        } catch (signOutError) {
            console.error('Failed to sign out:', signOutError);
        }
        window.location.replace('login.html');
        return;
    }

    state.user = user;
    if (authOverlay) authOverlay.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'block';

    await loadUserProfile(user);
    await loadBookingsForUser(user);
}
```
- **Purpose:** Main authentication handler
- **Flow:**
  ```
  1. No Firebase user? → Try localStorage fallback
  2. localStorage fallback? → Use it, continue
  3. No localStorage? → Redirect to login
  4. Firebase user exists? → Validate email, load profile, load bookings
  5. Validation fails? → Logout and redirect
  ```
- **Called By:** `firebase.auth().onAuthStateChanged(handleAuthState)`
- **Example States:**
  ```
  Offline user → Use localStorage (fast load)
  Online user → Use Firebase (authoritative)
  Session expired → Redirect to login
  ```

---

#### 18. **`loadUserProfile(user)`**
```javascript
async function loadUserProfile(user) {
    let profile = null;

    // Try Firebase first
    if (user && typeof firebase !== 'undefined' && firebase?.database) {
        try {
            const snapshot = await firebase.database()
                .ref(`users/${user.uid}`)
                .once('value');
            const profileData = snapshot.val() || {};
            profile = {
                id: user.uid,
                email: user.email,
                firstName: profileData.firstName || '',
                lastName: profileData.lastName || '',
                displayName: profileData.displayName || user.displayName || user.email.split('@')[0],
                phone: profileData.phone || '',
                vehicleType: profileData.vehicleType || 'car'
            };
        } catch (error) {
            console.error('Failed to load profile from Firebase:', error);
        }
    }

    // Fallback to localStorage
    if (!profile) {
        const storedProfile = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (storedProfile) {
            profile = { ...storedProfile };
        }
    }

    // Fallback to minimal profile
    if (!profile && user) {
        profile = {
            id: user.uid,
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            displayName: user.displayName || user.email.split('@')[0],
            phone: '',
            vehicleType: 'car'
        };
    }

    state.profile = profile;
    renderProfile(profile);
    localStorage.setItem('currentUser', JSON.stringify(profile));
}
```
- **Purpose:** Load user's extended profile data
- **Load Order:** Firebase → localStorage → minimal fallback
- **Stored Fields:**
  - `firstName`, `lastName` (from signup)
  - `phone` (optional)
  - `vehicleType` (car, bike, large)
  - `displayName` (calculated from first/last name)
- **Called By:** `handleAuthState()` after user validation
- **Renders:** Profile form fields with user data

---

### Booking Page Authentication (booking.html)

#### 19. **`firebase.auth().onAuthStateChanged()` (in booking.html)**
```javascript
firebase.auth().onAuthStateChanged(async function (user) {
    const authOverlay = document.getElementById('authCheck');
    const bookingSection = document.getElementById('bookingSection');
    const userMenu = document.getElementById('userMenu');

    if (!authOverlay || !bookingSection) {
        console.error('Authentication elements are missing');
        return;
    }

    if (user) {
        try {
            enforceGmailAccount(user);

            const profileSnapshot = await firebase.database()
                .ref(`users/${user.uid}`)
                .once('value');
            const profileData = profileSnapshot.val() || {};

            const currentUserData = {
                id: user.uid,
                email: user.email,
                firstName: profileData.firstName || '',
                lastName: profileData.lastName || '',
                displayName: profileData.displayName || user.displayName || user.email.split('@')[0],
                phone: profileData.phone || '',
                vehicleType: profileData.vehicleType || 'car'
            };

            localStorage.setItem('currentUser', JSON.stringify(currentUserData));

            if (userMenu) userMenu.style.display = 'block';
            if (userNameSpan) userNameSpan.textContent = currentUserData.displayName;

            authOverlay.style.display = 'none';
            bookingSection.style.display = 'block';

            try {
                initializeBookingFeatures();
            } catch (initError) {
                console.error('Error initializing booking widgets:', initError);
            }
        } catch (validationError) {
            console.error('User validation failed:', validationError);
            alert(validationError.message);
            try {
                await firebase.auth().signOut();
            } catch (signOutError) {
                console.error('Failed to sign out after validation:', signOutError);
            }
            if (userMenu) userMenu.style.display = 'none';
            authOverlay.style.display = 'block';
            bookingSection.style.display = 'none';
        }
    } else {
        // User not logged in
        if (userMenu) userMenu.style.display = 'none';
        authOverlay.style.display = 'block';
        bookingSection.style.display = 'none';
    }
});
```
- **Purpose:** Protect booking page, validate user, load profile
- **Logic:**
  - If logged in → Load profile, show booking section
  - If not logged in → Show "Login Required" modal
  - If validation fails → Logout and show modal
- **Gmail Validation:** Optional (can be disabled)
- **UI Flow:**
  ```
  User not logged in:
    → "Authentication Required"
    → "Login" & "Sign Up" buttons
    → Clicking routes to login.html / signup.html
  
  User logged in:
    → Booking wizard appears (Step 1: Location)
    → User name shown in nav
  ```

---

### Admin Authentication (admin.js)

#### 20. **`checkAdminSession()`**
```javascript
function checkAdminSession() {
    const loggedIn = sessionStorage.getItem("adminLoggedIn");
    const location = sessionStorage.getItem("adminLocation");

    if (!loggedIn || !location) {
        window.location.href = "admin-login.html";
        return null;
    }

    return location;
}
```
- **Purpose:** Verify admin is logged in
- **Checks:** `sessionStorage` has admin credentials
- **Returns:** Admin's location or null (if redirects)
- **Called By:** `init()` at page load
- **Flow:**
  ```
  Admin not logged in? → Redirect to admin-login.html
  Admin logged in? → Use session.adminLocation for filtering
  ```

---

#### 21. **`sessionStorage` Admin Session (admin-login.js)**
- **Keys Stored:**
  - `adminLoggedIn` → "true"
  - `adminEmail` → "mall_admin@gmail.com"
  - `adminLocation` → "Downtown Mall"
- **Scope:** Session-only (cleared on browser close)
- **Set By:** `adminLogin()` in admin-login.js
- **Read By:** `checkAdminSession()` in admin.js

**Example Session Flow:**
```javascript
// Login (admin-login.html)
const ADMIN_CREDENTIALS = { "mall_admin@gmail.com": { password: "mall", location: "Downtown Mall" } };
if (admin && admin.password === password) {
    sessionStorage.setItem("adminLoggedIn", "true");
    sessionStorage.setItem("adminLocation", admin.location);
    window.location.href = "admin.html";
}

// Access (admin.html)
const location = checkAdminSession();  // "Downtown Mall"
if (!location) return;  // Redirected to login

// Use location for filtering
const snapshot = await firebase.database()
    .ref(`locationBookings/${location}`)
    .once('value');  // Only gets this location's bookings
```

---

## 📊 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   USER LOGIN/SIGNUP FLOW                    │
└─────────────────────────────────────────────────────────────┘

SIGNUP:
┌──────────────┐
│ signup.html  │
│ Email, Pass  │
└──────┬───────┘
       ↓
firebase.auth().createUserWithEmailAndPassword()
       ├─ Create auth user (Firebase Auth)
       └─ Success? Go to step 2, Fail? Show error
       ↓
firebase.database().ref('users/{uid}').set({
    email, firstName, lastName, phone, vehicleType, createdAt
})
       └─ Create user profile (Firebase RTDB)
       ↓
window.location.href = 'dashboard.html'

LOGIN:
┌──────────────┐
│ login.html   │
│ Email, Pass  │
└──────┬───────┘
       ↓
firebase.auth().signInWithEmailAndPassword()
       ├─ Authenticate with Firebase Auth
       └─ Success? Set session, Fail? Show error
       ↓
firebase.auth().onAuthStateChanged()
       ├─ Triggered automatically
       ├─ Call handleAuthState(user)
       └─ Load profile, redirect to dashboard
       ↓
window.location.href = 'dashboard.html'

DASHBOARD:
┌──────────────────┐
│ dashboard.html   │
│ onLoad: check    │
│ auth state       │
└──────┬───────────┘
       ↓
ParkEaseAuth.onAuthStateChanged() in booking.html
       ├─ No user? → Show "Authentication Required"
       ├─ User found? → Load profile & bookings
       └─ Validation fails? → Logout & redirect
       ↓
Logged in ✅ → Show bookings, receipts, profile
Not logged in ❌ → Show login/signup buttons

LOGOUT:
┌──────────────┐
│ Click logout │
│ button       │
└──────┬───────┘
       ↓
ParkEaseAuth.signOut() in dashboard.js
       ├─ firebase.auth().signOut()
       ├─ localStorage.removeItem('currentUser')
       └─ sessionStorage.removeItem('bookingData')
       ↓
window.location.href = 'login.html'

ADMIN LOGIN:
┌──────────────────┐
│ admin-login.html │
│ Email, Pass      │
└──────┬───────────┘
       ↓
Check ADMIN_CREDENTIALS (hardcoded)
       ├─ Valid? → Go to next step
       └─ Invalid? → Show error
       ↓
sessionStorage.setItem("adminLoggedIn", "true")
sessionStorage.setItem("adminLocation", "location")
       ↓
window.location.href = 'admin.html'

ADMIN DASHBOARD:
┌──────────────┐
│ admin.html   │
│ onLoad: check│
│ admin session│
└──────┬───────┘
       ↓
checkAdminSession()
       ├─ sessionStorage has adminLoggedIn & adminLocation?
       ├─ Yes? → Load bookings/users for location
       └─ No? → Redirect to admin-login.html
       ↓
Display bookings & users for assigned location only
```

---

## 🔑 Authentication Security Summary

| Layer | Mechanism | Strength |
|-------|-----------|----------|
| **User Auth** | Firebase Email/Password + Auth tokens | ✅ Industry standard |
| **User Profile** | Stored in Firebase RTDB with user isolation | ✅ Good (RTDB rules needed) |
| **Session** | firebase.auth() with local storage fallback | ✅ Good (persistent by default) |
| **Booking Access** | `users/{uid}/bookings` partitioned by UID | ✅ Good (requires RTDB rules) |
| **Admin Auth** | Hardcoded credentials in sessionStorage | ⚠️ Weak (should use service account) |
| **Admin Session** | sessionStorage (cleared on browser close) | ✅ Good (not persistent) |
| **Email Validation** | Optional Gmail domain check | ✅ Optional (currently disabled) |

---

**End of File & Authentication Reference**

