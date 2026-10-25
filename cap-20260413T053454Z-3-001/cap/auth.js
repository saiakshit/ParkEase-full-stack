/**
 * ParkEase Shared Auth Module
 * Requires: Firebase SDK + firebase-config.js loaded first
 */
(function() {
    'use strict';

    const AUTH = {
        isReady: function() {
            return typeof firebase !== 'undefined' && firebase.auth;
        },

        getAuth: function() {
            return this.isReady() ? firebase.auth() : null;
        },

        getCurrentUser: function() {
            const auth = this.getAuth();
            return auth ? auth.currentUser : null;
        },

        onAuthStateChanged: function(callback) {
            const auth = this.getAuth();
            if (auth) {
                return auth.onAuthStateChanged(callback);
            }
            if (typeof callback === 'function') {
                callback(null);
            }
            return function() {};
        },
                                        
        signOut: function() {
            const auth = this.getAuth();
            const p = auth ? auth.signOut() : Promise.resolve();
            return p.then(() => {
                localStorage.removeItem('currentUser');
                sessionStorage.removeItem('bookingData');
            });
        },

        /** Persist session - Firebase Auth uses LOCAL by default */
        setPersistence: function(persistence) {
            const auth = this.getAuth();
            if (auth && firebase.auth.Auth.Persistence) {
                const mode = persistence === 'session' 
                    ? firebase.auth.Auth.Persistence.SESSION 
                    : firebase.auth.Auth.Persistence.LOCAL;
                return auth.setPersistence(mode);
            }
            return Promise.resolve();
        },

        /** Sync Firebase user to localStorage for pages that load before auth ready */
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
        },

        /** Get stored user (from localStorage - fallback when auth not yet ready) */
        getStoredUser: function() {
            try {
                return JSON.parse(localStorage.getItem('currentUser') || 'null');
            } catch {
                return null;
            }
        },

        /** Redirect to login if not authenticated */
        requireAuth: function(redirectUrl) {
            redirectUrl = redirectUrl || 'login.html';
            const user = this.getCurrentUser() || this.getStoredUser();
            if (!user || !user.id) {
                window.location.replace(redirectUrl);
                return false;
            }
            return true;
        },

        /** Redirect to dashboard if already authenticated */
        redirectIfAuthenticated: function(destination) {
            destination = destination || 'dashboard.html';
            const user = this.getCurrentUser() || this.getStoredUser();
            if (user && user.id) {
                window.location.replace(destination);
                return true;
            }
            return false;
        }
    };

    window.ParkEaseAuth = AUTH;
})();
