/*=============== MAIN JavaScript ===============*/

/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close');

/*===== MENU SHOW =====*/
/* Validate if constant exists */
if(navToggle){
    navToggle.addEventListener('click', () =>{
        navMenu.classList.add('show-menu');
    });
}

/*===== MENU HIDDEN =====*/
/* Validate if constant exists */
if(navClose){
    navClose.addEventListener('click', () =>{
        navMenu.classList.remove('show-menu');
    });
}

/*=============== REMOVE MENU MOBILE ===============*/
const navLink = document.querySelectorAll('.nav__link');

function linkAction(){
    const navMenu = document.getElementById('nav-menu');
    // When we click on each nav__link, we remove the show-menu class
    navMenu.classList.remove('show-menu');
}
navLink.forEach(n => n.addEventListener('click', linkAction));

/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]');

function scrollActive(){
    const scrollY = window.pageYOffset;

    sections.forEach(current =>{
        const sectionHeight = current.offsetHeight,
              sectionTop = current.offsetTop - 58,
              sectionId = current.getAttribute('id');

        if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight){
            document.querySelector('.nav__menu a[href*=' + sectionId + ']').classList.add('active-link');
        } else {
            document.querySelector('.nav__menu a[href*=' + sectionId + ']').classList.remove('active-link');
        }
    });
}
window.addEventListener('scroll', scrollActive);

/*=============== CHANGE BACKGROUND HEADER ===============*/
function scrollHeader(){
    const nav = document.getElementById('header');
    // When the scroll is greater than 80 viewport height, add the scroll-header class to the header tag
    if(this.scrollY >= 80) nav.classList.add('scroll-header'); 
    else nav.classList.remove('scroll-header');
}
window.addEventListener('scroll', scrollHeader);

/*=============== SCROLL REVEAL ANIMATION ===============*/
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe service cards
    document.querySelectorAll('.service-card').forEach(card => {
        observer.observe(card);
    });

    // Observe other elements
    document.querySelectorAll('.trust-item, .hero__rfq-card').forEach(el => {
        observer.observe(el);
    });

    // Observe alloy, capability, process cards, and service page elements
    document.querySelectorAll('.alloy-card, .capability-card, .process-step, .service-card, .application-card, .benefit-card, .quality-card').forEach(card => {
        observer.observe(card);
    });
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', observeElements);

/*=============== RFQ MODAL FUNCTIONALITY ===============*/
const rfqModal = document.getElementById('rfq-modal');
const rfqOverlay = document.getElementById('rfq-overlay');
const rfqClose = document.getElementById('rfq-close');
const rfqBtns = document.querySelectorAll('#rfq-btn, #hero-rfq-btn, #open-full-rfq');

// Open RFQ Modal
rfqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        rfqModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

// Close RFQ Modal
function closeRFQModal() {
    rfqModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

rfqClose.addEventListener('click', closeRFQModal);
rfqOverlay.addEventListener('click', closeRFQModal);

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rfqModal.classList.contains('active')) {
        closeRFQModal();
    }
});

/*=============== SMOOTH SCROLLING ===============*/
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

/*=============== VIDEO CONTROLS ===============*/
const heroVideo = document.querySelector('.hero__video');
const viewCapabilitiesBtn = document.getElementById('view-capabilities');

// Video quality optimization
if (heroVideo) {
    // Pause video when not in viewport (performance optimization)
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                heroVideo.play();
            } else {
                heroVideo.pause();
            }
        });
    }, { threshold: 0.5 });

    videoObserver.observe(heroVideo);

    // Handle video loading errors
    heroVideo.addEventListener('error', () => {
        console.log('Video failed to load, hiding video container');
        const videoContainer = document.querySelector('.hero__video-container');
        if (videoContainer) {
            videoContainer.style.display = 'none';
        }
    });
}

// View capabilities button functionality
if (viewCapabilitiesBtn) {
    viewCapabilitiesBtn.addEventListener('click', () => {
        // Scroll to services section
        const servicesSection = document.getElementById('services');
        if (servicesSection) {
            servicesSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
}

/*=============== QUICK UPLOAD FUNCTIONALITY ===============*/
const quickUpload = document.getElementById('quick-upload');

if (quickUpload) {
    // Drag and drop functionality
    quickUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        quickUpload.classList.add('dragover');
    });

    quickUpload.addEventListener('dragleave', () => {
        quickUpload.classList.remove('dragover');
    });

    quickUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        quickUpload.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Open full RFQ modal with files
            rfqModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Trigger file processing in RFQ system
            if (window.RFQSystem) {
                window.RFQSystem.handleFiles(files);
            }
        }
    });

    // Click to browse files
    quickUpload.addEventListener('click', () => {
        rfqModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
}

/*=============== SERVICE CARD INTERACTIONS ===============*/
const serviceCards = document.querySelectorAll('.service-card');

serviceCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px) scale(1.02)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
    });

    card.addEventListener('click', () => {
        const service = card.getAttribute('data-service');
        
        // Add click animation
        card.style.transform = 'scale(0.98)';
        setTimeout(() => {
            card.style.transform = 'translateY(-5px) scale(1.02)';
        }, 150);

        // Navigate to service detail (can be enhanced with routing)
        console.log(`Navigate to ${service} service page`);
    });
});

/*=============== TRUST INDICATORS ANIMATION ===============*/
function animateTrustIndicators() {
    const trustItems = document.querySelectorAll('.trust-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    trustItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'all 0.6s ease';
        observer.observe(item);
    });
}

// Initialize trust indicators animation
document.addEventListener('DOMContentLoaded', animateTrustIndicators);

/*=============== SCROLL TO TOP FUNCTIONALITY ===============*/
function createScrollToTop() {
    const scrollBtn = document.createElement('button');
    scrollBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 50px;
        height: 50px;
        background: var(--gradient-primary);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 100;
        box-shadow: var(--shadow-medium);
    `;

    document.body.appendChild(scrollBtn);

    // Show/hide scroll button
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.style.opacity = '1';
            scrollBtn.style.visibility = 'visible';
        } else {
            scrollBtn.style.opacity = '0';
            scrollBtn.style.visibility = 'hidden';
        }
    });

    // Scroll to top functionality
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Initialize scroll to top
document.addEventListener('DOMContentLoaded', createScrollToTop);

/*=============== PERFORMANCE OPTIMIZATIONS ===============*/
// Lazy load images
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading
document.addEventListener('DOMContentLoaded', initLazyLoading);

/*=============== ACCESSIBILITY IMPROVEMENTS ===============*/
// Keyboard navigation for dropdowns
document.querySelectorAll('.dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('.nav__link');
    const menu = dropdown.querySelector('.dropdown__menu');

    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
    });
});

// Focus management for modal
rfqModal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        const focusableElements = rfqModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
});

/*=============== ERROR HANDLING ===============*/
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Could send error reports to analytics service
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // Could send error reports to analytics service
});

/*=============== BROWSER SUPPORT CHECKS ===============*/
function checkBrowserSupport() {
    const requiredFeatures = [
        'IntersectionObserver',
        'fetch',
        'Promise'
    ];

    const unsupportedFeatures = requiredFeatures.filter(feature => !(feature in window));
    
    if (unsupportedFeatures.length > 0) {
        console.warn('Unsupported features:', unsupportedFeatures);
        // Could show a browser compatibility notice
    }
}

// Check browser support on load
document.addEventListener('DOMContentLoaded', checkBrowserSupport);

/*=============== SCROLL UP ===============*/
function scrollUp() {
    const scrollUp = document.getElementById('scroll-up');
    // When the scroll is higher than 560 viewport height, add the show-scroll class to the scroll-up element
    if (this.scrollY >= 560) scrollUp.classList.add('show-scroll');
    else scrollUp.classList.remove('show-scroll');
}
window.addEventListener('scroll', scrollUp);

/*=============== MOBILE NAVIGATION IMPROVEMENTS ===============*/
// Additional mobile navigation enhancements (variables already declared above)

/*=============== CHANGE BACKGROUND HEADER IMPROVEMENTS ===============*/
// Header scroll functionality already implemented above

/*=============== DROPDOWN NAVIGATION ===============*/
document.addEventListener('DOMContentLoaded', function() {
    // Handle dropdown navigation for mobile
    const dropdownItems = document.querySelectorAll('.nav__item.dropdown');
    
    dropdownItems.forEach(item => {
        const link = item.querySelector('.nav__link');
        const dropdown = item.querySelector('.nav__dropdown');
        
        if (window.innerWidth <= 968) {
            // Mobile behavior - toggle dropdown on click
            link.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav__item.dropdown')) {
            dropdownItems.forEach(item => {
                const dropdown = item.querySelector('.nav__dropdown');
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            });
        }
    });
});

/*=============== SMOOTH SCROLLING FOR ANCHOR LINKS ===============*/
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

/*=============== INTERSECTION OBSERVER FOR ANIMATIONS ===============*/
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const animationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.material-hub-card, .alloy-card, .capability-card, .process-step').forEach(el => {
        animationObserver.observe(el);
    });
}); 