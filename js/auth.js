/**
 * Simple Authentication System for TobroTech Admin Panel
 * 
 * Security Level: Basic (suitable for internal use)
 * Implementation: Client-side with localStorage
 */

class AdminAuth {
    constructor() {
        this.sessionKey = 'tobro_admin_session';
        this.passwordHash = 'b74a2e9239931cc7ae9f4832771f49f60d1f8a778be6a8924675a0b77d53145f'; // "YourSecurePassword123!"
        this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
        this.maxAttempts = 3;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutes
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const session = this.getSession();
        if (!session) return false;

        // Check if session is expired
        if (Date.now() > session.expires) {
            this.logout();
            return false;
        }

        // Extend session on activity
        this.extendSession();
        return true;
    }

    /**
     * Authenticate user with password
     */
    async authenticate(password) {
        // Check for lockout
        if (this.isLockedOut()) {
            const lockoutRemaining = this.getLockoutRemaining();
            throw new Error(`Too many failed attempts. Try again in ${Math.ceil(lockoutRemaining / 60000)} minutes.`);
        }

        const passwordHash = await this.hashPassword(password);
        
        if (passwordHash === this.passwordHash) {
            // Success - create session
            this.createSession();
            this.clearFailedAttempts();
            return true;
        } else {
            // Failed - record attempt
            this.recordFailedAttempt();
            const attempts = this.getFailedAttempts();
            const remaining = this.maxAttempts - attempts;
            
            if (remaining <= 0) {
                this.lockout();
                throw new Error('Too many failed attempts. Account locked for 15 minutes.');
            }
            
            throw new Error(`Invalid password. ${remaining} attempts remaining.`);
        }
    }

    /**
     * Create authenticated session
     */
    createSession() {
        const session = {
            authenticated: true,
            timestamp: Date.now(),
            expires: Date.now() + this.sessionTimeout,
            userAgent: navigator.userAgent,
            ip: this.getClientIP()
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }

    /**
     * Get current session
     */
    getSession() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('Error reading session:', error);
            return null;
        }
    }

    /**
     * Extend current session
     */
    extendSession() {
        const session = this.getSession();
        if (session) {
            session.expires = Date.now() + this.sessionTimeout;
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
        }
    }

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem('tobro_failed_attempts');
        localStorage.removeItem('tobro_lockout');
        
        // Redirect to login
        if (window.location.pathname.includes('admin-panel.html')) {
            window.location.href = 'admin-login.html';
        }
    }

    /**
     * Hash password using SHA-256
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Record failed login attempt
     */
    recordFailedAttempt() {
        const attempts = this.getFailedAttempts() + 1;
        localStorage.setItem('tobro_failed_attempts', attempts.toString());
        localStorage.setItem('tobro_last_attempt', Date.now().toString());
    }

    /**
     * Get number of failed attempts
     */
    getFailedAttempts() {
        const attempts = localStorage.getItem('tobro_failed_attempts');
        return attempts ? parseInt(attempts, 10) : 0;
    }

    /**
     * Clear failed attempts
     */
    clearFailedAttempts() {
        localStorage.removeItem('tobro_failed_attempts');
        localStorage.removeItem('tobro_last_attempt');
    }

    /**
     * Lock out user
     */
    lockout() {
        const lockoutUntil = Date.now() + this.lockoutTime;
        localStorage.setItem('tobro_lockout', lockoutUntil.toString());
    }

    /**
     * Check if user is locked out
     */
    isLockedOut() {
        const lockoutUntil = localStorage.getItem('tobro_lockout');
        if (!lockoutUntil) return false;
        
        const lockoutTime = parseInt(lockoutUntil, 10);
        if (Date.now() > lockoutTime) {
            localStorage.removeItem('tobro_lockout');
            return false;
        }
        
        return true;
    }

    /**
     * Get remaining lockout time in milliseconds
     */
    getLockoutRemaining() {
        const lockoutUntil = localStorage.getItem('tobro_lockout');
        if (!lockoutUntil) return 0;
        
        const lockoutTime = parseInt(lockoutUntil, 10);
        return Math.max(0, lockoutTime - Date.now());
    }

    /**
     * Get client IP (approximate)
     */
    getClientIP() {
        // This is a basic implementation
        // In production, you'd get this from your server
        return 'unknown';
    }

    /**
     * Generate new password hash (for setup)
     */
    async generatePasswordHash(password) {
        const hash = await this.hashPassword(password);
        console.log(`Password hash for "${password}": ${hash}`);
        console.log('Update the passwordHash in auth.js with this value');
        return hash;
    }

    /**
     * Security event logging
     */
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...details
        };
        
        console.log('Security Event:', logEntry);
        
        // In production, send to server for monitoring
        // this.sendSecurityLog(logEntry);
    }
}

// Global instance
window.adminAuth = new AdminAuth();

// Auto-logout on tab visibility change (security feature)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        const session = window.adminAuth.getSession();
        if (session) {
            // Set shorter timeout when tab is hidden
            setTimeout(() => {
                if (document.visibilityState === 'hidden') {
                    window.adminAuth.logout();
                }
            }, 30 * 60 * 1000); // 30 minutes
        }
    }
});

// Setup function to generate password hash
window.setupAdminPassword = async function(password) {
    await window.adminAuth.generatePasswordHash(password);
}; 