/**
 * ParkEase Admin Panel
 * Requires: Firebase + firebase-config.js
 * Admin authentication via sessionStorage (set in admin-login.html)
 */
(function () {
    'use strict';

    let adminUsersCache = null;

    // ==============================
    // ADMIN SESSION CHECK
    // ==============================
    function checkAdminSession() {
        const loggedIn = sessionStorage.getItem("adminLoggedIn");
        const location = sessionStorage.getItem("adminLocation");

        if (!loggedIn || !location) {
            window.location.href = "admin-login.html";
            return null;
        }

        return location;
    }

    // ==============================
    // LOAD USERS FOR ADMIN
    // ==============================
    async function loadUsersForAdmin() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        try {
            const usersSnapshot = await firebase.database().ref('users').once('value');
            const usersData = usersSnapshot.val() || {};

            const bookingsSnapshot = await firebase.database().ref('bookings').once('value');
            const bookingsData = bookingsSnapshot.val() || {};

            const usersMap = new Map();

            // users node
            Object.entries(usersData).forEach(([uid, u]) => {
                if (!u) return;

                usersMap.set(uid, {
                    uid,
                    email: u.email || '-',
                    name:
                        u.displayName ||
                        ((u.firstName || '') + ' ' + (u.lastName || '')).trim() ||
                        '-',
                    phone: u.phone || '-',
                    vehicleType: u.vehicleType || '-',
                    createdAt: u.createdAt || null
                });
            });

            // bookings fallback
            Object.values(bookingsData).forEach(b => {
                if (!b) return;

                const uid = b.userId;
                if (!uid || usersMap.has(uid)) return;

                usersMap.set(uid, {
                    uid,
                    email: b.userEmail || '-',
                    name: b.userName || '-',
                    phone: b.phone || '-',
                    vehicleType: b.vehicleType || '-',
                    createdAt: b.createdAt || null
                });
            });

            adminUsersCache = usersMap;

            const usersArray = Array.from(usersMap.values()).sort((a, b) => {
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });

            const rows = usersArray.map(u => {
                const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-';
                return `
                <tr>
                    <td>${u.email}</td>
                    <td>${u.name}</td>
                    <td>${u.phone}</td>
                    <td>${u.vehicleType}</td>
                    <td>${created}</td>
                </tr>`;
            }).join('');

            tbody.innerHTML = rows || '<tr><td colspan="5">No users yet</td></tr>';
            document.getElementById('statUsers').textContent = usersArray.length;

        } catch (e) {
            console.error('Error loading users:', e);
            tbody.innerHTML = '<tr><td colspan="5">Error loading users</td></tr>';
        }
    }

    // ==============================
    // TIME FORMAT
    // ==============================
    function formatTime12Hour(time24) {
        if (!time24) return '-';
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    // ==============================
    // LOAD BOOKINGS
    // ==============================
    async function loadBookings() {
        const tbody = document.getElementById('bookingsTableBody');
        if (!tbody) return;

        try {
            const snapshot = await firebase.database()
                .ref(`locationBookings/${window.adminLocation}`)
                .once('value');

            const bookings = snapshot.val() || {};

            const rows = Object.values(bookings).map(b => {

                const date = b.date ? new Date(b.date).toLocaleDateString() : '-';
                const amount = b.amount ? '₹' + Number(b.amount).toFixed(2) : '-';

                const startTimeFormatted = formatTime12Hour(b.startTime);
                const endTimeFormatted = formatTime12Hour(b.endTime);

                const timePeriod =
                    startTimeFormatted !== '-' && endTimeFormatted !== '-'
                        ? `${startTimeFormatted} → ${endTimeFormatted}`
                        : '-';

                let matchedUser = null;

                if (adminUsersCache && b.userId && adminUsersCache.has(b.userId)) {
                    matchedUser = adminUsersCache.get(b.userId);
                }

                const userName =
                    b.userName ||
                    matchedUser?.name ||
                    matchedUser?.email ||
                    'Unknown User';

                return `
                <tr>
                    <td>${b.id || '-'}</td>
                    <td>${b.vehicleBrand || '-'}</td>
                    <td>${b.vehicleColor || '-'}</td>
                    <td>${b.vehicleNumber || '-'}</td>
                    <td>${b.location || '-'}</td>
                    <td>${b.spotNumber || '-'}</td>
                    <td>${date}</td>
                    <td>${amount}</td>
                    <td>${timePeriod}</td>
                </tr>
                `;
            }).join('');

            tbody.innerHTML = rows || '<tr><td colspan="10">No bookings yet</td></tr>';
            document.getElementById('statBookings').textContent = Object.keys(bookings).length;

        } catch (e) {
            console.error('Error loading bookings:', e);
            tbody.innerHTML = '<tr><td colspan="10">Error loading bookings</td></tr>';
        }
    }

    // ==============================
    // TABS
    // ==============================
    function setupTabs() {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab + 'Panel')?.classList.add('active');
            });
        });
    }

    // ==============================
    // SIGN OUT
    // ==============================
    function signOutAdmin() {
        sessionStorage.clear();
        window.location.href = "admin-login.html";
    }

    window.signOutAdmin = signOutAdmin;

    // ==============================
    // INIT
    // ==============================
    async function init() {
        const adminLocation = checkAdminSession();
        if (!adminLocation) return;

        window.adminLocation = adminLocation;

        document.getElementById('authRequired').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';

        const locationLabel = document.getElementById('adminLocationLabel');
if (locationLabel) {
    locationLabel.innerText = "Managing Location: " + adminLocation;
}

const locationText = document.getElementById('adminLocationText');
if (locationText) {
    locationText.innerText = "Location: " + adminLocation;
}


        setupTabs();
        await loadUsersForAdmin();
        await loadBookings();
        document.getElementById('bookingsPanel')?.classList.add('active');
    }

    document.addEventListener('DOMContentLoaded', init);

})();
