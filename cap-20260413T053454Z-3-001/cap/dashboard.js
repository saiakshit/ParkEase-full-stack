(() => {
    const REQUIRE_GMAIL_ONLY = false;
    const ALLOWED_GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];
    const state = {
        user: null,
        profile: null,
        bookings: [],
        currentReceiptBooking: null,
        bookingFilter: 'all'
    };

    function enforceGmailAccount(user) {
        if (!user || !user.email) {
            throw new Error('Authentication required. Please sign in.');
        }
        if (!REQUIRE_GMAIL_ONLY) return;
        const email = user.email.toLowerCase();
        const domain = email.split('@')[1] || '';

        if (!ALLOWED_GMAIL_DOMAINS.includes(domain)) {
            throw new Error('Please sign in with a valid Gmail account to continue.');
        }

        if (!user.emailVerified) {
            throw new Error('Your Google email is not verified. Please verify it with Google and sign in again.');
        }
    }

    function formatCurrency(amount) {
        const value = Number(amount) || 0;
        return `₹${value.toFixed(2)}`;
    }

    function formatDuration(booking) {
        if (booking.durationLabel) {
            return booking.durationLabel;
        }

        const duration = Number(booking.duration);
        if (Number.isNaN(duration)) {
            return booking.duration || 'N/A';
        }

        if (duration < 1) {
            return `${Math.round(duration * 60)} minutes`;
        }
        if (duration === 1) {
            return '1 hour';
        }
        return `${duration.toFixed(1)} hours`;
    }

    function parseDate(dateStr) {
        if (!dateStr) {
            return null;
        }
        const parsed = new Date(dateStr);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function formatDateLabel(dateStr) {
        const date = parseDate(dateStr);
        if (!date) {
            return 'N/A';
        }
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatTimeWindow(booking) {
        if (booking.startTime && booking.endTime) {
            return `${booking.startTime} - ${booking.endTime}`;
        }
        return 'N/A';
    }

    function buildDateTime(dateStr, timeStr) {
        if (!dateStr && !timeStr) {
            return null;
        }

        if (dateStr && timeStr) {
            const isoCandidate = new Date(`${dateStr}T${timeStr}`);
            if (!Number.isNaN(isoCandidate.getTime())) {
                return isoCandidate;
            }

            const fallback = new Date(`${dateStr} ${timeStr}`);
            if (!Number.isNaN(fallback.getTime())) {
                return fallback;
            }
        }

        if (dateStr) {
            const parsed = new Date(dateStr);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        return null;
    }

    function getBookingStartDate(booking) {
        return parseDate(booking.bookingStartDateTime) || buildDateTime(booking.date, booking.startTime) || parseDate(booking.createdAt);
    }

    function getBookingEndDate(booking) {
        return parseDate(booking.bookingEndDateTime) || buildDateTime(booking.date, booking.endTime) || getBookingStartDate(booking);
    }

    function getBookingExpiryDate(booking) {
        const expiry = getExpiryInfo(booking);
        return expiry?.dateTime || null;
    }

    function getCreatedDate(booking) {
        return parseDate(booking.createdAt) || new Date();
    }

    function formatCountdown(targetDate) {
        if (!targetDate) {
            return 'Soon';
        }

        const now = new Date();
        let diff = targetDate.getTime() - now.getTime();

        if (diff <= 0) {
            return 'Now';
        }

        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        diff -= days * 24 * 60 * 60 * 1000;
        const hours = Math.floor(diff / (60 * 60 * 1000));
        diff -= hours * 60 * 60 * 1000;
        const minutes = Math.max(0, Math.round(diff / (60 * 1000)));

        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    function getUpcomingBooking() {
        if (!state.bookings.length) {
            return null;
        }

        const now = new Date();
        const candidates = state.bookings
            .map(booking => {
                const start = getBookingStartDate(booking);
                const expiry = getBookingExpiryDate(booking);
                const status = booking.status || computeBookingStatus(booking);
                return {
                    booking,
                    start,
                    expiry,
                    status
                };
            })
            .filter(entry => {
                if (!entry.start && !entry.expiry) {
                    return false;
                }
                if (entry.status === 'scheduled') {
                    return true;
                }
                if (entry.status === 'active') {
                    return (entry.expiry && entry.expiry >= now) || (entry.start && entry.start <= now);
                }
                return false;
            })
            .sort((a, b) => {
                const aTime = a.start ? a.start.getTime() : (a.expiry ? a.expiry.getTime() : Infinity);
                const bTime = b.start ? b.start.getTime() : (b.expiry ? b.expiry.getTime() : Infinity);
                return aTime - bTime;
            });

        return candidates[0] || null;
    }

    function getLatestBooking() {
        if (!state.bookings.length) {
            return null;
        }
        return state.bookings[0];
    }

    function bookingKey(booking) {
        if (!booking) {
            return `booking-${Date.now()}`;
        }
        return booking.id || booking.bookingId || `${booking.location || 'booking'}-${booking.createdAt || booking.date || Date.now()}`;
    }

    function mergeBookings(primary = [], secondary = []) {
        const map = new Map();
        primary.forEach(booking => {
            map.set(bookingKey(booking), { ...booking });
        });
        secondary.forEach(booking => {
            map.set(bookingKey(booking), { ...map.get(bookingKey(booking)), ...booking });
        });
        return Array.from(map.values());
    }

    function computeBookingStatus(booking) {
        const explicitStatus = (booking.status || '').toLowerCase();
        if (explicitStatus === 'cancelled' || explicitStatus === 'completed') {
            return explicitStatus;
        }

        const now = new Date();
        const start = parseDate(booking.bookingStartDateTime) || buildDateTime(booking.date, booking.startTime);
        const end = parseDate(booking.bookingEndDateTime) || buildDateTime(booking.date, booking.endTime);
        const expiry = parseDate(booking.expiryDateTime) || parseDate(booking.validUntil);

        if (start && now < start) {
            return 'scheduled';
        }

        if (start && end && now >= start && now <= end) {
            return 'active';
        }

        if (expiry && now <= expiry) {
            return 'active';
        }

        if (explicitStatus === 'scheduled') {
            return 'scheduled';
        }

        return 'expired';
    }

    function enrichBooking(rawBooking) {
        const booking = { ...rawBooking };
        booking.status = computeBookingStatus(booking);
        const statusLabelMap = {
            active: 'Active',
            scheduled: 'Upcoming',
            expired: 'Expired',
            cancelled: 'Cancelled',
            completed: 'Completed'
        };
        booking.statusLabel = statusLabelMap[booking.status] || booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
        booking.isActive = booking.status === 'active';
        booking.isScheduled = booking.status === 'scheduled';
        booking.isExpired = booking.status === 'expired';
        booking.isCancelled = booking.status === 'cancelled';
        return booking;
    }

    function persistBookingsToLocalStorage(userId, bookings) {
        if (!userId || !Array.isArray(bookings)) {
            return;
        }

        try {
            const sanitized = bookings.map(booking => ({ ...booking }));
            localStorage.setItem(`bookings_${userId}`, JSON.stringify(sanitized));

            const existingAll = JSON.parse(localStorage.getItem('bookings') || '[]');
            const filteredExisting = existingAll.filter(existing => {
                const bookingUserId = existing.userId || existing.user?.id || existing.user?.uid;
                return bookingUserId && bookingUserId !== userId;
            });

            const merged = mergeBookings(filteredExisting, sanitized);
            localStorage.setItem('bookings', JSON.stringify(merged));
        } catch (error) {
            console.error('Failed to persist bookings locally:', error);
        }
    }

    function getFilteredBookings() {
        const filter = state.bookingFilter || 'all';
        if (filter === 'all') {
            return state.bookings;
        }
        return state.bookings.filter(booking => booking.status === filter);
    }

    function updateFilterUI() {
        const filterButtons = document.querySelectorAll('.booking-filters .filter-button');
        filterButtons.forEach(button => {
            const filter = button.dataset.filter || 'all';
            if (filter === state.bookingFilter) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    function setBookingFilter(filter) {
        state.bookingFilter = filter || 'all';
        updateFilterUI();
        renderBookings(getFilteredBookings());
    }

    function getExpiryInfo(booking) {
        if (booking.validUntil) {
            const expiry = parseDate(booking.validUntil);
            if (expiry) {
                return {
                    date: expiry.toLocaleDateString('en-IN'),
                    time: expiry.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    dateTime: expiry
                };
            }
        }

        if (booking.expiryDate && booking.expiryTime) {
            return {
                date: booking.expiryDate,
                time: booking.expiryTime,
                dateTime: parseDate(`${booking.expiryDate} ${booking.expiryTime}`)
            };
        }

        const endDateTime = parseDate(booking.bookingEndDateTime);
        if (endDateTime) {
            const expiry = new Date(endDateTime.getTime() + 15 * 60 * 1000);
            return {
                date: expiry.toLocaleDateString('en-IN'),
                time: expiry.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                dateTime: expiry
            };
        }

        return {
            date: 'N/A',
            time: 'N/A',
            dateTime: null
        };
    }

    function showToast(message) {
        alert(message);
    }

    function renderProfile(profile) {
        if (!profile) return;

        const displayName = profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email || 'User';

        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userVehicle = document.getElementById('userVehicle');

        if (userName) userName.textContent = displayName;
        if (userEmail) userEmail.textContent = profile.email || 'Unknown';
        if (userVehicle) userVehicle.textContent = `Vehicle: ${profile.vehicleType || 'Car'}`;

        const firstNameInput = document.getElementById('profileFirstName');
        const lastNameInput = document.getElementById('profileLastName');
        const emailInput = document.getElementById('profileEmail');
        const phoneInput = document.getElementById('profilePhone');
        const vehicleInput = document.getElementById('profileVehicle');

        if (firstNameInput) firstNameInput.value = profile.firstName || '';
        if (lastNameInput) lastNameInput.value = profile.lastName || '';
        if (emailInput) emailInput.value = profile.email || '';
        if (phoneInput) phoneInput.value = profile.phone || '';
        if (vehicleInput) vehicleInput.value = profile.vehicleType || 'car';
    }

    function renderStats() {
        const totalBookingsEl = document.getElementById('totalBookings');
        const activeBookingsEl = document.getElementById('activeBookings');
        const totalSpentEl = document.getElementById('totalSpent');
        const upcomingBookingsEl = document.getElementById('upcomingBookings');

        const total = state.bookings.length;
        const active = state.bookings.filter(b => b.status === 'active').length;
        const upcoming = state.bookings.filter(b => b.status === 'scheduled').length;
        const totalSpent = state.bookings.reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0);

        if (totalBookingsEl) totalBookingsEl.textContent = total;
        if (activeBookingsEl) activeBookingsEl.textContent = active;
        if (upcomingBookingsEl) upcomingBookingsEl.textContent = upcoming;
        if (totalSpentEl) totalSpentEl.textContent = formatCurrency(totalSpent);
    }

    function renderUpcomingBooking() {
        const card = document.getElementById('upcomingBookingCard');
        if (!card) {
            return;
        }

        const upcomingEntry = getUpcomingBooking();
        if (!upcomingEntry) {
            card.innerHTML = `
                <div class="upcoming-empty">
                    <i class="fas fa-calendar-plus"></i>
                    <h4>No upcoming bookings</h4>
                    <p>Book a new spot to see it here.</p>
                    <button class="btn-primary" onclick="checkAuthAndBook()">
                        <i class="fas fa-map-marker-alt"></i> Book Parking
                    </button>
                </div>
            `;
            return;
        }

        const { booking, start, expiry, status } = upcomingEntry;
        const bookingDate = formatDateLabel(booking.date || booking.createdAt);
        const timeWindow = formatTimeWindow(booking);
        const durationLabel = formatDuration(booking);
        const vehicle = booking.vehicleNumber || 'Not specified';
        const locationLabel = booking.location || 'Parking Location';
        const spotLabel = booking.spotNumber || 'N/A';
        const statusLabel = booking.statusLabel || (status || 'active').toUpperCase();
        const countdownTarget = status === 'scheduled' ? start : (expiry || getBookingEndDate(booking));
        const countdownLabel = status === 'scheduled' ? 'Starts in' : 'Valid for';
        const countdown = formatCountdown(countdownTarget);

        card.innerHTML = `
            <div class="upcoming-booking">
                <div>
                    <div class="countdown-badge">
                        <i class="fas fa-hourglass-half"></i>
                        ${countdownLabel}: ${countdown}
                    </div>
                    <h4>${status === 'scheduled' ? 'Your next parking is booked!' : 'You have an active booking'}</h4>
                    <div class="upcoming-meta">
                        <div class="meta-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <div>
                                <div class="item-title">${locationLabel}</div>
                                <div class="item-subtitle">Spot ${spotLabel}</div>
                            </div>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar-day"></i>
                            <div>
                                <div class="item-title">${bookingDate}</div>
                                <div class="item-subtitle">${timeWindow}</div>
                            </div>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <div>
                                <div class="item-title">Duration: ${durationLabel}</div>
                                <div class="item-subtitle">Status: ${statusLabel}</div>
                            </div>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-car"></i>
                            <div>
                                <div class="item-title">${vehicle}</div>
                                <div class="item-subtitle">${booking.vehicleType || 'Vehicle'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="upcoming-actions">
                    <button class="btn-secondary" onclick="viewReceipt('${booking.id}')">
                        <i class="fas fa-file-invoice"></i> View Receipt
                    </button>
                    <button class="btn-link" onclick="checkAuthAndBook()">
                        Plan another visit →
                    </button>
                </div>
            </div>
        `;
    }

    function renderQuickActions() {
        const container = document.getElementById('quickActions');
        if (!container) {
            return;
        }

        const buttons = container.querySelectorAll('.action-chip');
        if (!buttons || !buttons.length) {
            return;
        }

        const latestBooking = getLatestBooking();
        const activeBooking = state.bookings.find(b => b.status === 'active');
        const scheduledBooking = state.bookings.find(b => b.status === 'scheduled');

        buttons.forEach(button => {
            button.disabled = true;
            button.title = 'No booking data available yet';
            button.dataset.bookingId = '';
        });

        const buttonMap = new Map();
        buttons.forEach(button => {
            buttonMap.set(button.dataset.action, button);
        });

        if (buttonMap.has('book-again') && latestBooking) {
            const btn = buttonMap.get('book-again');
            btn.disabled = false;
            btn.title = 'Rebook with your previous preferences';
            btn.dataset.bookingId = latestBooking.id;
        }

        if (buttonMap.has('download-receipt') && latestBooking) {
            const btn = buttonMap.get('download-receipt');
            btn.disabled = false;
            btn.title = 'View receipt from your latest booking';
            btn.dataset.bookingId = latestBooking.id;
        }

        if (buttonMap.has('extend-booking') && (activeBooking || scheduledBooking)) {
            const target = activeBooking || scheduledBooking;
            const btn = buttonMap.get('extend-booking');
            btn.disabled = false;
            btn.title = 'Extend or adjust this booking';
            btn.dataset.bookingId = target.id;
        }
    }

    function renderNotifications() {
        const list = document.getElementById('notificationsList');
        if (!list) {
            return;
        }

        const notifications = [];
        const now = new Date();

        state.bookings.forEach(booking => {
            const status = booking.status || computeBookingStatus(booking);
            const start = getBookingStartDate(booking);
            const expiry = getBookingExpiryDate(booking);

            if (status === 'scheduled' && start) {
                const diffHours = (start.getTime() - now.getTime()) / (60 * 60 * 1000);
                if (diffHours > 0 && diffHours <= 12) {
                    notifications.push({
                        icon: 'fa-bell',
                        title: `Upcoming booking at ${booking.location}`,
                        subtitle: `${formatDateLabel(booking.date)} • ${formatTimeWindow(booking)}`
                    });
                }
            }

            if (status === 'active' && expiry) {
                const diffMinutes = (expiry.getTime() - now.getTime()) / (60 * 1000);
                if (diffMinutes > 0 && diffMinutes <= 30) {
                    notifications.push({
                        icon: 'fa-hourglass-half',
                        title: 'Parking session ending soon',
                        subtitle: `${Math.max(1, Math.round(diffMinutes))} minutes left for ${booking.spotNumber}`
                    });
                }
            }
        });

        if (!notifications.length) {
            list.innerHTML = '<li class="empty">You&#39;re all caught up. Enjoy your day!</li>';
            return;
        }

        list.innerHTML = notifications.map(item => `
            <li>
                <span class="item-title"><i class="fas ${item.icon}"></i> ${item.title}</span>
                <span class="item-subtitle">${item.subtitle}</span>
            </li>
        `).join('');
    }

    function renderSavedVehicles() {
        const list = document.getElementById('savedVehiclesList');
        if (!list) {
            return;
        }

        const vehiclesMap = new Map();

        state.bookings.forEach(booking => {
            const vehicleNumber = (booking.vehicleNumber || '').trim();
            if (!vehicleNumber) {
                return;
            }

            const existing = vehiclesMap.get(vehicleNumber) || {
                number: vehicleNumber,
                type: booking.vehicleType || 'Car',
                color: booking.vehicleColor || '',
                brand: booking.vehicleBrand || '',
                lastUsed: getCreatedDate(booking)
            };

            const createdAt = getCreatedDate(booking);
            if (createdAt > existing.lastUsed) {
                existing.lastUsed = createdAt;
            }
            existing.type = booking.vehicleType || existing.type;
            existing.color = booking.vehicleColor || existing.color;
            existing.brand = booking.vehicleBrand || existing.brand;

            vehiclesMap.set(vehicleNumber, existing);
        });

        const vehicles = Array.from(vehiclesMap.values()).sort((a, b) => b.lastUsed - a.lastUsed);

        if (!vehicles.length) {
            list.innerHTML = '<li class="empty">Add a booking to save your vehicle automatically.</li>';
            return;
        }

        list.innerHTML = vehicles.map(vehicle => {
            const metaParts = [];
            if (vehicle.brand) metaParts.push(vehicle.brand);
            if (vehicle.color) metaParts.push(vehicle.color);
            metaParts.push(vehicle.type);
            const meta = metaParts.join(' • ');

            return `
                <li>
                    <span class="item-title">${vehicle.number}</span>
                    <span class="item-subtitle">${meta} • Last used: ${vehicle.lastUsed.toLocaleDateString('en-IN')} ${vehicle.lastUsed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
            `;
        }).join('');
    }

    function renderPaymentMethods() {
        const list = document.getElementById('paymentMethodsList');
        if (!list) {
            return;
        }

        const methodMap = new Map();

        state.bookings.forEach(booking => {
            const method = (booking.paymentProvider || booking.paymentMethod || 'Card').toString();
            const entry = methodMap.get(method) || {
                method,
                count: 0,
                total: 0
            };
            entry.count += 1;
            entry.total += Number(booking.amount) || 0;
            methodMap.set(method, entry);
        });

        const methods = Array.from(methodMap.values()).sort((a, b) => b.total - a.total);

        if (!methods.length) {
            list.innerHTML = '<li class="empty">Complete a booking to see your payment methods here.</li>';
            return;
        }

        list.innerHTML = methods.map(method => `
            <li>
                <span class="item-title">${method.method}</span>
                <span class="item-subtitle">${method.count} transaction${method.count > 1 ? 's' : ''} • ${formatCurrency(method.total)}</span>
            </li>
        `).join('');
    }

    function stashBookingForReuse(booking) {
        if (!booking) {
            return;
        }

        try {
            sessionStorage.setItem('rebookData', JSON.stringify({
                location: booking.location,
                spotNumber: booking.spotNumber,
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime,
                vehicleNumber: booking.vehicleNumber,
                vehicleType: booking.vehicleType,
                paymentMethod: booking.paymentMethod || booking.paymentProvider
            }));
        } catch (error) {
            console.warn('Failed to stash booking data for reuse:', error);
        }
    }

    function handleQuickAction(action, button) {
        if (!action) {
            return;
        }

        const bookingId = button?.dataset?.bookingId;
        const booking = bookingId ? state.bookings.find(b => b.id === bookingId) : null;

        switch (action) {
            case 'book-again':
                if (booking) {
                    stashBookingForReuse(booking);
                }
                window.location.href = 'booking.html';
                break;
            case 'download-receipt':
                if (booking) {
                    // Open the receipt modal for this booking
                    viewReceipt(booking.id);
                } else {
                    showToast('No booking receipt available yet.');
                }
                break;
            case 'extend-booking':
                if (booking) {
                    stashBookingForReuse(booking);
                    try {
                        sessionStorage.setItem('extendBookingId', booking.id);
                    } catch (error) {
                        console.warn('Failed to flag booking for extension:', error);
                    }
                    window.location.href = 'booking.html#extend';
                } else {
                    showToast('No active booking to extend right now.');
                }
                break;
            default:
                console.warn('Unknown quick action:', action);
        }
    }

    function renderBookings(bookingsToRender = state.bookings) {
        const bookingsList = document.getElementById('bookingsList');
        if (!bookingsList) return;

        if (!bookingsToRender || bookingsToRender.length === 0) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h4>No bookings yet</h4>
                    <p>Start by booking your first parking spot!</p>
                    <button class="cta-button" onclick="window.location.href='booking.html'">
                        <i class="fas fa-plus"></i> Book Now
                    </button>
                </div>
            `;
            return;
        }

        bookingsList.innerHTML = bookingsToRender.map(booking => {
            const bookingDate = formatDateLabel(booking.date || booking.createdAt);
            const timeWindow = formatTimeWindow(booking);
            const durationLabel = formatDuration(booking);
            const expiryInfo = getExpiryInfo(booking);
            const createdAt = booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-IN') : 'N/A';
            const amountText = formatCurrency(booking.amount);
            const status = (booking.status || 'active').toLowerCase();

            const statusLabel = {
                scheduled: 'Scheduled',
                active: expiryInfo.dateTime && expiryInfo.dateTime < new Date() ? 'Active (Grace Period)' : 'Active',
                expired: 'Expired',
                cancelled: 'Cancelled',
                completed: 'Completed'
            }[status] || status.charAt(0).toUpperCase() + status.slice(1);

            const statusIcon = {
                scheduled: 'fa-calendar-check',
                active: 'fa-play-circle',
                expired: 'fa-clock',
                cancelled: 'fa-times-circle',
                completed: 'fa-check-circle'
            }[status] || 'fa-info-circle';

            const canCancel = status === 'active' || status === 'scheduled';

            return `
                <div class="booking-card booking-status-${status}">
                    <div class="booking-header">
                        <span class="booking-id">${booking.id}</span>
                        <span class="booking-status status-${status}">
                            <i class="fas ${statusIcon}"></i> ${statusLabel}
                        </span>
                    </div>
                    <div class="booking-details">
                        <div class="detail-item">
                            <span class="detail-label">📍 Location</span>
                            <span class="detail-value">${booking.location}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">🅿️ Spot</span>
                            <span class="detail-value">${booking.spotNumber}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">📅 Booking Date</span>
                            <span class="detail-value">${bookingDate}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">⏰ Time Slot</span>
                            <span class="detail-value">${timeWindow}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">⏱️ Duration</span>
                            <span class="detail-value">${durationLabel}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">🚗 Vehicle</span>
                            <span class="detail-value">${booking.vehicleNumber || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">💰 Amount</span>
                            <span class="detail-value">${amountText}</span>
                        </div>
                        <div class="detail-item detail-expiry">
                            <span class="detail-label">⏰ Valid Until</span>
                            <span class="detail-value">${expiryInfo.date} ${expiryInfo.time}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">📝 Created At</span>
                            <span class="detail-value">${createdAt}</span>
                        </div>
                    </div>
                    <div class="booking-actions">
                        <button class="action-btn btn-primary" onclick="viewReceipt('${booking.id}')">
                            <i class="fas fa-receipt"></i> View Receipt
                        </button>
                        ${canCancel ? `
                        <button class="action-btn btn-danger" onclick="cancelBooking('${booking.id}')">
                            <i class="fas fa-times"></i> Cancel
                        </button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderReceipts() {
        const receiptsList = document.getElementById('receiptsList');
        if (!receiptsList) return;

        if (state.bookings.length === 0) {
            receiptsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h4>No receipts yet</h4>
                    <p>Payment receipts will appear here after your first booking.</p>
                </div>
            `;
            return;
        }

        receiptsList.innerHTML = state.bookings.map(booking => {
            const bookingDate = formatDateLabel(booking.date || booking.createdAt);
            const timeWindow = formatTimeWindow(booking);
            const expiryInfo = getExpiryInfo(booking);
            const amountText = formatCurrency(booking.amount);
            const status = (booking.status || 'active').toLowerCase();
            const statusLabel = booking.statusLabel || status.charAt(0).toUpperCase() + status.slice(1);
            const paymentProvider = booking.paymentProvider || booking.paymentMethod || 'Card';

            return `
                <div class="booking-card booking-status-${status}">
                    <div class="booking-header">
                        <span class="booking-id">Receipt #${booking.id}</span>
                        <span class="detail-value">${amountText}</span>
                    </div>
                    <div class="booking-details">
                        <div class="detail-item">
                            <span class="detail-label">📅 Booking Date</span>
                            <span class="detail-value">${bookingDate}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">⏰ Time Slot</span>
                            <span class="detail-value">${timeWindow}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">📍 Location</span>
                            <span class="detail-value">${booking.location}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">🅿️ Spot</span>
                            <span class="detail-value">${booking.spotNumber}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">💳 Payment Method</span>
                            <span class="detail-value">${paymentProvider}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">📊 Status</span>
                            <span class="detail-value status-${status}">${statusLabel}</span>
                        </div>
                        <div class="detail-item detail-expiry">
                            <span class="detail-label">⏰ Valid Until</span>
                            <span class="detail-value">${expiryInfo.date} ${expiryInfo.time}</span>
                        </div>
                    </div>
                    <div class="booking-actions">
                        <button class="action-btn btn-primary" onclick="viewReceipt('${booking.id}')">
                            <i class="fas fa-download"></i> Download Receipt
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateUi() {
        renderStats();
        renderUpcomingBooking();
        renderQuickActions();
        renderNotifications();
        renderSavedVehicles();
        renderPaymentMethods();
        updateFilterUI();
        renderBookings(getFilteredBookings());
        renderReceipts();
        window.userBookings = state.bookings;
    }

    function viewReceipt(bookingId) {
        const booking = state.bookings.find(b => b.id === bookingId);
        if (!booking) {
            showToast('Booking not found.');
            return;
        }

        state.currentReceiptBooking = booking;

        const receiptModal = document.getElementById('receiptModal');
        const receiptDate = document.getElementById('receiptDate');
        const receiptDetails = document.getElementById('receiptDetails');
        const receiptTotal = document.getElementById('receiptTotal');

        const createdAt = booking.createdAt ? new Date(booking.createdAt) : new Date();
        if (receiptDate) {
            receiptDate.textContent = `Date: ${createdAt.toLocaleDateString('en-IN')} | Time: ${createdAt.toLocaleTimeString('en-IN')}`;
        }

        if (receiptDetails) {
            const bookingDate = formatDateLabel(booking.date || booking.createdAt);
            const timeWindow = formatTimeWindow(booking);
            const durationLabel = formatDuration(booking);
            const expiryInfo = getExpiryInfo(booking);
            const amount = Number(booking.amount) || 0;
            const durationHours = Number(booking.duration);
            const ratePerHour = durationHours ? amount / durationHours : amount;

            receiptDetails.innerHTML = `
                <div class="receipt-row"><span>📋 Booking ID:</span><span>${booking.id}</span></div>
                <div class="receipt-row"><span>📅 Booking Date:</span><span>${bookingDate}</span></div>
                <div class="receipt-row"><span>⏰ Time Slot:</span><span>${timeWindow}</span></div>
                <div class="receipt-row"><span>⏱️ Duration:</span><span>${durationLabel}</span></div>
                <div class="receipt-row" style="background:#fef3c7; padding:8px; border-radius:6px; margin:4px 0;"><span style="color:#d97706; font-weight:600;">⏰ Valid Until:</span><span style="color:#d97706; font-weight:600;">${expiryInfo.date} ${expiryInfo.time}</span></div>
                <div class="receipt-row"><span>📍 Location:</span><span>${booking.location}</span></div>
                <div class="receipt-row"><span>🅿️ Spot Number:</span><span>${booking.spotNumber}</span></div>
                <div class="receipt-row"><span>🚗 Vehicle:</span><span>${booking.vehicleNumber || 'N/A'}</span></div>
                <div class="receipt-row"><span>💰 Rate per hour:</span><span>${formatCurrency(ratePerHour)}</span></div>
                <div class="receipt-row"><span>📊 Booking Status:</span><span class="status-${booking.status || 'active'}">${(booking.status || 'active').toUpperCase()}</span></div>
                <div class="receipt-row"><span>💳 Payment Method:</span><span>${booking.paymentMethod || 'Card'}</span></div>
                <div class="receipt-row"><span>💳 Payment Status:</span><span>${booking.paymentStatus || 'completed'}</span></div>
            `;
        }

        if (receiptTotal) {
            receiptTotal.textContent = `Total: ${formatCurrency(booking.amount)}`;
        }

        if (receiptModal) {
            receiptModal.style.display = 'block';
        }
    }

    function closeReceiptModal() {
        const modal = document.getElementById('receiptModal');
        if (modal) {
            modal.style.display = 'none';
        }
        state.currentReceiptBooking = null;
    }

    function printReceipt() {
        const booking = state.currentReceiptBooking;
        if (!booking) {
            showToast('No receipt available for printing.');
            return;
        }

        const details = document.getElementById('receiptDetails')?.innerHTML || '';
        const receiptDate = document.getElementById('receiptDate')?.textContent || '';
        const receiptTotal = document.getElementById('receiptTotal')?.textContent || '';

        const printWindow = window.open('', '_blank', 'width=800,height=1000');
        if (!printWindow) return;

        const html = `
            <html><head><title>ParkEase - Payment Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; background: white; color: #333; margin: 0; }
                .receipt-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .receipt-header h1 { margin: 0; color: #2563eb; font-size: 28px; }
                .receipt-details { margin: 20px 0; }
                .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .receipt-total { font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; padding: 15px; background: #f0f8ff; border: 2px solid #2563eb; border-radius: 8px; }
                .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style></head><body>
            <div class="receipt-header">
                <h1>🅿️ ParkEase</h1>
                <h2>Payment Receipt</h2>
                <div class="receipt-date">${receiptDate}</div>
            </div>
            <div class="receipt-details">${details}</div>
            <div class="receipt-total">${receiptTotal}</div>
            <div class="footer">
                <p>Thank you for using ParkEase!</p>
                <p>For support, contact: support@ParkEase.com</p>
                <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
            </div>
            <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); }<\/script>
            </body></html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    }

    async function cancelBooking(bookingId) {
         if (!bookingId) return;
         if (!confirm('Are you sure you want to cancel this booking?')) return;
 
         const user = state.user;
         if (!user) {
             showToast('Authentication required.');
             return;
         }

        const userId = user.uid || user.id;
        let remoteUpdateSucceeded = false;
 
        try {
            if (typeof firebase !== 'undefined' && firebase?.database) {
                const updates = {
                    status: 'cancelled',
                    updatedAt: new Date().toISOString()
                };

                await firebase.database().ref(`bookings/${bookingId}`).update(updates);
                await firebase.database().ref(`users/${user.uid}/bookings/${bookingId}`).update(updates);
                remoteUpdateSucceeded = true;
            }
        } catch (error) {
            console.error('Failed to cancel booking in Firebase:', error);
        }

        state.bookings = state.bookings.map(booking => {
            if (booking.id !== bookingId) {
                return enrichBooking(booking);
            }
            return enrichBooking({ ...booking, status: 'cancelled', updatedAt: new Date().toISOString() });
        });

        if (userId) {
            persistBookingsToLocalStorage(userId, state.bookings);
        }

        updateUi();
        showToast(remoteUpdateSucceeded ? 'Booking cancelled successfully.' : 'Booking cancelled locally.');
    }

    function attachEventHandlers() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabNames = ['bookings', 'receipts', 'profile'];
        tabButtons.forEach((button, index) => {
            button.dataset.tab = tabNames[index] || 'bookings';
        });

        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async event => {
                event.preventDefault();
                const firstName = document.getElementById('profileFirstName')?.value.trim() || '';
                const lastName = document.getElementById('profileLastName')?.value.trim() || '';
                const phone = document.getElementById('profilePhone')?.value.trim() || '';
                const vehicleType = document.getElementById('profileVehicle')?.value || 'car';
                const email = document.getElementById('profileEmail')?.value || state.profile?.email || state.user?.email || '';
                const displayNameCandidate = `${firstName} ${lastName}`.trim();
                const displayName = displayNameCandidate || state.profile?.displayName || email.split('@')[0] || 'User';

                let remoteUpdated = false;
                const hasFirebase = typeof firebase !== 'undefined' && firebase?.database;
                const firebaseUserId = state.user?.uid;

                if (hasFirebase && firebaseUserId) {
                    try {
                        await firebase.database().ref(`users/${firebaseUserId}`).update({
                            firstName,
                            lastName,
                            phone,
                            vehicleType,
                            displayName
                        });
                        remoteUpdated = true;
                    } catch (error) {
                        console.error('Failed to update profile in Firebase:', error);
                    }
                }

                state.profile = {
                    ...state.profile,
                    id: state.profile?.id || firebaseUserId || state.user?.id || 'local-user',
                    email,
                    firstName,
                    lastName,
                    phone,
                    vehicleType,
                    displayName
                };

                if (state.user) {
                    try {
                        if (typeof state.user.updateProfile === 'function') {
                            await state.user.updateProfile({ displayName });
                        } else {
                            state.user.displayName = displayName;
                            state.user.firstName = firstName;
                            state.user.lastName = lastName;
                            state.user.phone = phone;
                            state.user.vehicleType = vehicleType;
                        }
                    } catch (error) {
                        console.warn('Failed to update auth profile display name:', error);
                    }
                }

                const storedProfile = {
                    id: state.profile.id,
                    email: state.profile.email,
                    firstName: state.profile.firstName,
                    lastName: state.profile.lastName,
                    displayName: state.profile.displayName,
                    phone: state.profile.phone,
                    vehicleType: state.profile.vehicleType
                };

                try {
                    localStorage.setItem('currentUser', JSON.stringify(storedProfile));
                } catch (error) {
                    console.error('Failed to persist profile locally:', error);
                }

                renderProfile(state.profile);
                showToast(remoteUpdated ? 'Profile updated successfully.' : 'Profile saved locally.');
            });
        }

        window.addEventListener('click', event => {
            const receiptModal = document.getElementById('receiptModal');
            if (event.target === receiptModal) {
                closeReceiptModal();
            }
        });

        const filterButtons = document.querySelectorAll('.booking-filters .filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                setBookingFilter(button.dataset.filter || 'all');
            });
        });

        const quickActionsGrid = document.querySelector('#quickActions .quick-actions-grid');
        if (quickActionsGrid) {
            quickActionsGrid.addEventListener('click', event => {
                const button = event.target.closest('.action-chip');
                if (!button || button.disabled) {
                    return;
                }
                const action = button.dataset.action;
                handleQuickAction(action, button);
            });
        }

        window.addEventListener('storage', event => {
            if (!state.user) return;
            const userId = state.user.uid || state.user.id;
            const relevantKeys = [
                'bookings',
                userId ? `bookings_${userId}` : null
            ].filter(Boolean);

            if (relevantKeys.includes(event.key)) {
                loadBookingsForUser(state.user);
            }
        });
    }

    async function loadBookingsForUser(user) {
        let bookingArray = [];
        const userId = user?.uid || user?.id || null;

        if (userId && typeof firebase !== 'undefined' && firebase?.database) {
            try {
                const snapshot = await firebase.database().ref(`users/${userId}/bookings`).once('value');
                const bookings = snapshot.val() || {};
                bookingArray = Object.values(bookings);
            } catch (error) {
                console.error('Failed to load bookings from Firebase:', error);
            }
        }

        if (userId) {
            const userStored = JSON.parse(localStorage.getItem(`bookings_${userId}`) || '[]');
            if (userStored.length) {
                bookingArray = mergeBookings(bookingArray, userStored);
            }
        }

        const generalStored = JSON.parse(localStorage.getItem('bookings') || '[]');
        if (generalStored.length) {
            const filtered = generalStored.filter(booking => {
                if (!userId) return true;
                const bookingUserId = booking.userId || booking.user?.id || booking.user?.uid;
                return !bookingUserId || bookingUserId === userId;
            });
            bookingArray = mergeBookings(bookingArray, filtered);
        }

        bookingArray = bookingArray.map(booking => enrichBooking({
            ...booking,
            amount: Number(booking.amount) || 0
        }));

        bookingArray.sort((a, b) => {
            const aTime = parseDate(a.createdAt)?.getTime() || 0;
            const bTime = parseDate(b.createdAt)?.getTime() || 0;
            return bTime - aTime;
        });

        state.bookings = bookingArray;

        if (userId) {
            persistBookingsToLocalStorage(userId, state.bookings);
        }

        updateUi();
    }

    async function loadUserProfile(user) {
        let profile = null;

        if (user && typeof firebase !== 'undefined' && firebase?.database) {
            try {
                const snapshot = await firebase.database().ref(`users/${user.uid}`).once('value');
                const profileData = snapshot.val() || {};
                profile = {
                    id: user.uid,
                    email: user.email,
                    firstName: profileData.firstName || user.displayName?.split(' ')[0] || '',
                    lastName: profileData.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
                    displayName: profileData.displayName || user.displayName || user.email.split('@')[0],
                    phone: profileData.phone || '',
                    vehicleType: profileData.vehicleType || 'car'
                };
            } catch (error) {
                console.error('Failed to load profile from Firebase:', error);
            }
        }

        if (!profile) {
            const storedProfile = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (storedProfile) {
                profile = {
                    id: storedProfile.id || user?.uid || user?.id || 'local-user',
                    email: storedProfile.email || user?.email || '',
                    firstName: storedProfile.firstName || '',
                    lastName: storedProfile.lastName || '',
                    displayName: storedProfile.displayName || `${storedProfile.firstName || ''} ${storedProfile.lastName || ''}`.trim() || storedProfile.email || 'User',
                    phone: storedProfile.phone || '',
                    vehicleType: storedProfile.vehicleType || 'car'
                };
            } else if (user) {
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
        }

        if (!profile) {
            profile = {
                id: 'local-user',
                email: '',
                firstName: 'Guest',
                lastName: '',
                displayName: 'Guest User',
                phone: '',
                vehicleType: 'car'
            };
        }

        state.profile = profile;
        renderProfile(profile);

        localStorage.setItem('currentUser', JSON.stringify(profile));
    }

    function showTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });

        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
            }
        });

        const tab = document.getElementById(`${tabName}Tab`);
        if (tab) {
            tab.style.display = 'block';
        }
    }

    async function signOut() {
        try {
            if (window.ParkEaseAuth && window.ParkEaseAuth.signOut) {
                await window.ParkEaseAuth.signOut();
            } else if (typeof firebase !== 'undefined' && firebase?.auth) {
                await firebase.auth().signOut();
                localStorage.removeItem('currentUser');
            } else {
                localStorage.removeItem('currentUser');
            }
            window.location.replace('login.html');
        } catch (error) {
            localStorage.removeItem('currentUser');
            window.location.replace('login.html');
        }
    }

    function checkAuthAndBook() {
        let isAuthenticated = false;

        if (typeof firebase !== 'undefined' && firebase?.auth) {
            const user = firebase.auth().currentUser;
            if (user) isAuthenticated = true;
        }

        if (!isAuthenticated) {
            const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            isAuthenticated = !!(storedUser && storedUser.id);
        }

        window.location.href = isAuthenticated ? 'booking.html' : 'login.html';
    }

        async function handleAuthState(user) {
            const authOverlay = document.getElementById('authCheck');
            const dashboardContainer = document.getElementById('dashboardContainer');

            if (!user) {
                const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (storedUser && (storedUser.id || storedUser.uid)) {
                    state.user = { ...storedUser, uid: storedUser.uid || storedUser.id };
                    if (authOverlay) authOverlay.style.display = 'none';
                    if (dashboardContainer) dashboardContainer.style.display = 'block';
                    renderProfile(storedUser);
                    await loadBookingsForUser(state.user);
                    return;
                }
                if (authOverlay) authOverlay.style.display = 'block';
                if (dashboardContainer) dashboardContainer.style.display = 'none';
                window.location.replace('login.html');
                return;
            }

        try {
            enforceGmailAccount(user);
        } catch (error) {
            showToast(error.message);
            try {
                await firebase.auth().signOut();
            } catch (signOutError) {
                console.error('Failed to sign out after auth check:', signOutError);
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

    function initialiseTabs() {
        // Ensure default tab visible
        showTab('bookings');
    }

    function init() {
         attachEventHandlers();
         initialiseTabs();
         updateFilterUI();
 
         if (typeof firebase !== 'undefined' && firebase?.auth) {
             firebase.auth().onAuthStateChanged(handleAuthState);
         } else {
             const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
             if (storedUser) {
                 state.user = storedUser;
                 renderProfile(storedUser);
                 loadBookingsForUser(storedUser);
             } else {
                 showToast('Please sign in to view your dashboard.');
                 window.location.replace('login.html');
             }
         }

        setInterval(() => {
            if (!state.bookings.length) {
                return;
            }
            state.bookings = state.bookings.map(enrichBooking);
            const userId = state.user?.uid || state.user?.id;
            if (userId) {
                persistBookingsToLocalStorage(userId, state.bookings);
            }
            updateUi();
        }, 60000);
    }

    document.addEventListener('DOMContentLoaded', init);

    // Expose required functions globally for inline handlers
    window.showTab = showTab;
    window.signOut = signOut;
    window.checkAuthAndBook = checkAuthAndBook;
    window.viewReceipt = viewReceipt;
    window.closeReceiptModal = closeReceiptModal;
    window.printReceipt = printReceipt;
    window.cancelBooking = cancelBooking;
})();
