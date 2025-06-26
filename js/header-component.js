/**
 * Header Component - Reusable header for all pages
 * This ensures consistency across the entire website
 */

class HeaderComponent {
    constructor() {
        this.currentPath = window.location.pathname;
        this.isSubdirectory = this.currentPath.includes('/materials/') || this.currentPath.includes('/services/');
        this.basePath = this.isSubdirectory ? '../' : '';
    }

    // Determine active link based on current page
    getActiveLink() {
        const path = this.currentPath.toLowerCase();
        
        if (path.includes('materials')) return 'materials';
        if (path.includes('services') || path.includes('surface-finishes')) return 'services';
        if (path.includes('index.html') || path === '/' || path.endsWith('/')) return 'home';
        
        return '';
    }

    // Generate the header HTML
    generateHeaderHTML() {
        const activeLink = this.getActiveLink();
        
        return `
        <header class="header" id="header">
            <nav class="nav container">
                <a href="${this.basePath}index.html" class="nav__logo">
                    TobroTech
                </a>
                
                <div class="nav__menu" id="nav-menu">
                    <ul class="nav__list grid">
                        <li class="nav__item">
                            <a href="${this.basePath}index.html" class="nav__link ${activeLink === 'home' ? 'active-link' : ''}">Home</a>
                        </li>
                        <li class="nav__item">
                            <a href="${this.basePath}index.html#about" class="nav__link">About</a>
                        </li>
                        <li class="nav__item dropdown">
                            <a href="${this.basePath}services.html" class="nav__link ${activeLink === 'services' ? 'active-link' : ''}">Services</a>
                            <ul class="nav__dropdown">
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}services/5-axis-machining.html" class="nav__dropdown-link">
                                        <i class="fas fa-cube"></i>
                                        5-Axis Machining
                                    </a>
                                </li>
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}services/cnc-turning.html" class="nav__dropdown-link">
                                        <i class="fas fa-sync-alt"></i>
                                        CNC Turning
                                    </a>
                                </li>
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}services/cnc-milling.html" class="nav__dropdown-link">
                                        <i class="fas fa-cog"></i>
                                        CNC Milling
                                    </a>
                                </li>
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}services/outsourced-services.html" class="nav__dropdown-link">
                                        <i class="fas fa-network-wired"></i>
                                        Outsourced Services
                                    </a>
                                </li>
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}surface-finishes.html" class="nav__dropdown-link">
                                        <i class="fas fa-palette"></i>
                                        Surface Finishes
                                    </a>
                                </li>
                            </ul>
                        </li>
                        <li class="nav__item dropdown">
                            <a href="${this.basePath}materials.html" class="nav__link ${activeLink === 'materials' ? 'active-link' : ''}">Materials</a>
                            <ul class="nav__dropdown">
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}materials/aluminum.html" class="nav__dropdown-link">
                                        <i class="ri-plane-line"></i>
                                        Aluminum Alloys
                                    </a>
                                </li>
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}materials/stainless-steel.html" class="nav__dropdown-link">
                                        <i class="ri-shield-check-line"></i>
                                        Stainless Steel
                                    </a>
                                </li>
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}materials/titanium.html" class="nav__dropdown-link">
                                        <i class="ri-rocket-line"></i>
                                        Titanium Alloys
                                    </a>
                                </li>
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}materials/carbon-steel.html" class="nav__dropdown-link">
                                        <i class="ri-hammer-line"></i>
                                        Carbon Steel
                                    </a>
                                </li>
                                <li class="nav__dropdown-item">
                                    <a href="${this.basePath}materials/engineering-plastics.html" class="nav__dropdown-link">
                                        <i class="ri-flask-line"></i>
                                        Engineering Plastics
                                    </a>
                                </li>
                            </ul>
                        </li>
                        <li class="nav__item">
                            <a href="${this.basePath}index.html#contact" class="nav__link">Contact</a>
                        </li>
                    </ul>

                    <i class="ri-close-line nav__close" id="nav-close"></i>
                </div>
                
                <div class="nav__toggle" id="nav-toggle">
                    <i class="ri-menu-line"></i>
                </div>
            </nav>
        </header>
        `;
    }

    // Initialize the header
    init() {
        // Find and replace existing header
        const existingHeader = document.querySelector('header.header');
        if (existingHeader) {
            existingHeader.outerHTML = this.generateHeaderHTML();
        } else {
            // If no existing header, insert at the beginning of body
            document.body.insertAdjacentHTML('afterbegin', this.generateHeaderHTML());
        }

        // Initialize navigation functionality
        this.initNavigation();
    }

    // Initialize navigation functionality (mobile toggle, dropdowns, etc.)
    initNavigation() {
        const navMenu = document.getElementById('nav-menu');
        const navToggle = document.getElementById('nav-toggle');
        const navClose = document.getElementById('nav-close');

        // Mobile menu toggle
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.add('show-menu');
            });
        }

        if (navClose) {
            navClose.addEventListener('click', () => {
                navMenu.classList.remove('show-menu');
            });
        }

        // Close menu when clicking nav links
        document.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('show-menu');
            });
        });

        // Header scroll effect
        const header = document.getElementById('header');
        window.addEventListener('scroll', () => {
            if (window.scrollY >= 50) {
                header.classList.add('scroll-header');
            } else {
                header.classList.remove('scroll-header');
            }
        });

        // Dropdown functionality
        document.querySelectorAll('.nav__item.dropdown').forEach(dropdown => {
            dropdown.addEventListener('mouseenter', () => {
                dropdown.classList.add('show-dropdown');
            });
            
            dropdown.addEventListener('mouseleave', () => {
                dropdown.classList.remove('show-dropdown');
            });
        });
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const header = new HeaderComponent();
    header.init();
});

// Export for manual initialization if needed
window.HeaderComponent = HeaderComponent; 