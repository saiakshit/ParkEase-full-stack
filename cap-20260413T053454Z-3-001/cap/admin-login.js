const ADMIN_CREDENTIALS = {
    "mall_admin@gmail.com": {
        password: "mall",
        location: "Downtown Mall"
    },
    "rail_admin@gmail.com": {
        password: "rail",
        location: "Central Railway Station"
    },
    "hospital_admin@gmail.com": {
        password: "hospital",
        location: "City Hospital"
    },
    "uni_admin@gmail.com": {
        password: "uni",
        location: "University Campus"
    }
};

async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('adminError');

    // Clear previous error
    errorElement.innerText = '';

    if (!email || !password) {
        errorElement.innerText = "Please enter both email and password";
        return;
    }

    const admin = ADMIN_CREDENTIALS[email];

    if (!admin || admin.password !== password) {
        errorElement.innerText = "Invalid admin credentials";
        return;
    }

    // Save admin session
    sessionStorage.setItem("adminLoggedIn", "true");
    sessionStorage.setItem("adminEmail", email);
    sessionStorage.setItem("adminLocation", admin.location);

    // Redirect to admin panel
    window.location.href = "admin.html";
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    
    if (emailInput && passwordInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                passwordInput.focus();
            }
        });
        
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                adminLogin();
            }
        });
    }
});
