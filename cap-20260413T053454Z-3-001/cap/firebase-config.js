/**
 * ParkEase Firebase Configuration
 * Load Firebase SDK (v9 compat) ONCE before this script:
 *   - firebase-app-compat.js
 *   - firebase-auth-compat.js
 *   - firebase-database-compat.js
 */
(function() {
    'use strict';

    const firebaseConfig = {
        apiKey: "AIzaSyBHUMZA7XgxoKQ9uPOhuocM3W68ct34yWg",
        authDomain: "capstoneak-b969f.firebaseapp.com",
        databaseURL: "https://capstoneak-b969f-default-rtdb.firebaseio.com",
        projectId: "capstoneak-b969f",
        storageBucket: "capstoneak-b969f.firebasestorage.app",
        messagingSenderId: "718747619767",
        appId: "1:718747619767:web:07e24e5eac346617045832",
        measurementId: "G-P5GWG74G62"
    };

    // Initialize Firebase only if not already initialized
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        window.firebaseApp = firebase.app();
        window.firebaseAuth = firebase.auth();
        window.firebaseDb = firebase.database();
    } else {
        console.error('ParkEase: Firebase SDK not loaded. Include firebase-app-compat, firebase-auth-compat, firebase-database-compat before firebase-config.js');
    }
})();
