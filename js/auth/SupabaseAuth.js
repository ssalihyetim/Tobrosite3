/**
 * SupabaseAuth - Authentication manager using Supabase Auth
 * Provides secure admin authentication with session management
 */

class SupabaseAuth {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.sessionCheckInterval = null;
        this.fallbackAuth = null; // Fallback to original auth system
    }

    /**
     * Initialize Supabase authentication
     */
    async init() {
        try {
            this.client = getSupabaseClient();
            if (!this.client) {
                console.warn('Supabase not available, using fallback authentication');
                // Import and use the original auth system as fallback
                if (window.adminAuth) {
                    this.fallbackAuth = window.adminAuth;
                }
                return false;
            }

            // Listen for auth state changes
            this.client.auth.onAuthStateChange((event, session) => {
                this.handleAuthStateChange(event, session);
            });

            // Check current session
            const { data: { session } } = await this.client.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                console.log('User already authenticated:', this.currentUser.email);
            }

            console.log('SupabaseAuth initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize SupabaseAuth:', error);
            if (window.adminAuth) {
                this.fallbackAuth = window.adminAuth;
            }
            return false;
        }
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(event, session) {
        if (event === 'SIGNED_IN') {
            this.currentUser = session.user;
            console.log('User signed in:', this.currentUser.email);
            this.onAuthSuccess();
        } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            console.log('User signed out');
            this.onAuthLogout();
        } else if (event === 'TOKEN_REFRESHED') {
            console.log('Token refreshed');
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        if (!this.client) {
            // Fallback to original auth
            if (this.fallbackAuth) {
                return this.fallbackAuth.login(email, password);
            }
            throw new Error('Authentication not available');
        }

        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            this.currentUser = data.user;
            this.logSecurityEvent('admin_login_success', { email });
            return true;
        } catch (error) {
            console.error('Sign in failed:', error);
            this.logSecurityEvent('admin_login_failed', { email, error: error.message });
            throw new Error('Invalid credentials');
        }
    }

    /**
     * Sign out current user
     */
    async signOut() {
        if (!this.client) {
            // Fallback to original auth
            if (this.fallbackAuth) {
                return this.fallbackAuth.logout();
            }
            return true;
        }

        try {
            const { error } = await this.client.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            this.logSecurityEvent('admin_logout');
            return true;
        } catch (error) {
            console.error('Sign out failed:', error);
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        if (!this.client) {
            // Fallback to original auth
            if (this.fallbackAuth) {
                return this.fallbackAuth.isAuthenticated();
            }
            return false;
        }

        return !!this.currentUser;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        if (!this.client) {
            // Fallback to original auth
            if (this.fallbackAuth) {
                return this.fallbackAuth.getCurrentUser();
            }
            return null;
        }

        return this.currentUser;
    }

    /**
     * Get user email
     */
    getUserEmail() {
        const user = this.getCurrentUser();
        return user ? user.email : null;
    }

    /**
     * Check if current session is valid
     */
    async validateSession() {
        if (!this.client) {
            // Fallback to original auth
            if (this.fallbackAuth) {
                return this.fallbackAuth.validateSession();
            }
            return false;
        }

        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error) throw error;

            if (session) {
                this.currentUser = session.user;
                return true;
            } else {
                this.currentUser = null;
                return false;
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            this.currentUser = null;
            return false;
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        if (!this.client) {
            return true; // Fallback doesn't need token refresh
        }

        try {
            const { data, error } = await this.client.auth.refreshSession();
            if (error) throw error;

            if (data.session) {
                this.currentUser = data.session.user;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    /**
     * Setup automatic session validation
     */
    setupSessionValidation() {
        // Check session every 5 minutes
        this.sessionCheckInterval = setInterval(async () => {
            const isValid = await this.validateSession();
            if (!isValid && window.location.pathname.includes('admin')) {
                // Redirect to login if session is invalid and user is on admin page
                window.location.href = 'admin-login.html';
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Clear session validation timer
     */
    clearSessionValidation() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    /**
     * Register new admin user (for initial setup)
     */
    async registerAdmin(email, password, adminKey) {
        if (!this.client) {
            throw new Error('Supabase authentication not available');
        }

        // Verify admin registration key (you should set this in your environment)
        const validAdminKey = 'tobro-admin-setup-2024'; // Change this!
        if (adminKey !== validAdminKey) {
            throw new Error('Invalid admin registration key');
        }

        try {
            const { data, error } = await this.client.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        role: 'admin',
                        company: 'TobroTech'
                    }
                }
            });

            if (error) throw error;

            console.log('Admin user registered successfully');
            this.logSecurityEvent('admin_user_registered', { email });
            return data;
        } catch (error) {
            console.error('Admin registration failed:', error);
            throw error;
        }
    }

    /**
     * Handle successful authentication
     */
    onAuthSuccess() {
        // Redirect to admin panel if on login page
        if (window.location.pathname.includes('admin-login')) {
            window.location.href = 'admin-panel.html';
        }
        
        // Setup automatic session validation
        this.setupSessionValidation();
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('admin-authenticated', {
            detail: { user: this.currentUser }
        }));
    }

    /**
     * Handle logout
     */
    onAuthLogout() {
        // Clear session validation
        this.clearSessionValidation();
        
        // Redirect to login page if on admin page
        if (window.location.pathname.includes('admin')) {
            window.location.href = 'admin-login.html';
        }
        
        // Clear any cached data
        if (window.adminDashboard) {
            window.adminDashboard.clearCache();
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('admin-logout'));
    }

    /**
     * Log security events
     */
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            event: event,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: 'client-side', // Server-side logging would be better
            details: details
        };

        console.log('Security Event:', logEntry);
        
        // Store in localStorage for now (in production, send to server)
        const logs = JSON.parse(localStorage.getItem('admin_security_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('admin_security_logs', JSON.stringify(logs));
    }

    /**
     * Get security logs
     */
    getSecurityLogs() {
        return JSON.parse(localStorage.getItem('admin_security_logs') || '[]');
    }

    /**
     * Reset password
     */
    async resetPassword(email) {
        if (!this.client) {
            throw new Error('Password reset not available with fallback auth');
        }

        try {
            const { error } = await this.client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/admin-login.html?reset=true`
            });

            if (error) throw error;

            console.log('Password reset email sent');
            this.logSecurityEvent('password_reset_requested', { email });
            return true;
        } catch (error) {
            console.error('Password reset failed:', error);
            throw error;
        }
    }

    /**
     * Update password
     */
    async updatePassword(newPassword) {
        if (!this.client) {
            throw new Error('Password update not available with fallback auth');
        }

        try {
            const { error } = await this.client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            console.log('Password updated successfully');
            this.logSecurityEvent('password_updated');
            return true;
        } catch (error) {
            console.error('Password update failed:', error);
            throw error;
        }
    }

    /**
     * Check if using Supabase auth
     */
    isSupabaseAuth() {
        return !!this.client;
    }

    /**
     * Get current session (for compatibility with original auth)
     */
    async getSession() {
        if (!this.client) {
            // Fallback to original auth
            if (this.fallbackAuth && this.fallbackAuth.getSession) {
                return this.fallbackAuth.getSession();
            }
            return null;
        }

        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            console.error('Get session failed:', error);
            return null;
        }
    }

    /**
     * Validate session (synchronous version for compatibility)
     */
    validateSession() {
        if (!this.client) {
            // Fallback to original auth
            if (this.fallbackAuth && this.fallbackAuth.validateSession) {
                return this.fallbackAuth.validateSession();
            }
            return false;
        }

        // For Supabase, we check if we have a current user
        return !!this.currentUser;
    }

    /**
     * Legacy compatibility methods
     */
    login(email, password) {
        return this.signIn(email, password);
    }

    logout() {
        return this.signOut();
    }
}

// Create global instance and replace the original auth
window.addEventListener('DOMContentLoaded', async function() {
    const supabaseAuth = new SupabaseAuth();
    await supabaseAuth.init();
    
    // Replace the global adminAuth instance
    window.adminAuth = supabaseAuth;
    
    console.log('SupabaseAuth ready. Supabase mode:', supabaseAuth.isSupabaseAuth());
}); 