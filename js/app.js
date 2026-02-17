// === SCROLL RESTORATION CONTROL ===
// Force page to always return to top on refresh/navigation
// Rationale: Portfolio sites are navigation-driven (sticky nav), not scroll-driven
// This ensures predictable UX and proper URL sharing behavior

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Reset scroll position on page load
window.addEventListener('load', () => {
    const hash = window.location.hash;

    if (hash) {
        // URL has an anchor - scroll to that section after a brief delay
        setTimeout(() => {
            const target = document.querySelector(hash);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    } else {
        // No anchor - return to top
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
});

// Ensure scroll resets before page unload
window.addEventListener('beforeunload', () => {
    if (!window.location.hash) {
        window.scrollTo(0, 0);
    }
});

// === END SCROLL RESTORATION CONTROL ===

// === INDUSTRY TEMPLATE & EMPLOYER ROUTING SYSTEM ===

// Employer profile database
const employerProfiles = {
    // Finance/Banking
    'finance': { industry: 'finance', company: '', welcome: '' },
    'goldman': { industry: 'finance', company: 'Goldman Sachs', welcome: '' },
    'goldman-sachs': { industry: 'finance', company: 'Goldman Sachs', welcome: '' },
    'jpmorgan': { industry: 'finance', company: 'JPMorgan Chase', welcome: '' },
    'wells-fargo': { industry: 'finance', company: 'Wells Fargo', welcome: '' },
    'boa': { industry: 'finance', company: 'Bank of America', welcome: '' },
    'citi': { industry: 'finance', company: 'Citigroup', welcome: '' },

    // Tech/Startups
    'tech': { industry: 'tech', company: '', welcome: '' },
    'google': { industry: 'tech', company: 'Google', welcome: '' },
    'amazon': { industry: 'tech', company: 'Amazon', welcome: '' },
    'microsoft': { industry: 'tech', company: 'Microsoft', welcome: '' },
    'meta': { industry: 'tech', company: 'Meta', welcome: '' },
    'apple': { industry: 'tech', company: 'Apple', welcome: '' },
    'salesforce': { industry: 'tech', company: 'Salesforce', welcome: '' },

    // Consulting
    'consulting': { industry: 'consulting', company: '', welcome: '' },
    'bcg': { industry: 'consulting', company: 'Boston Consulting Group', welcome: '' },
    'mckinsey': { industry: 'consulting', company: 'McKinsey & Company', welcome: '' },
    'bain': { industry: 'consulting', company: 'Bain & Company', welcome: '' },
    'deloitte': { industry: 'consulting', company: 'Deloitte', welcome: '' },
    'accenture': { industry: 'consulting', company: 'Accenture', welcome: '' },

    // Healthcare/Pharma
    'healthcare': { industry: 'healthcare', company: '', welcome: '' },
    'uhg': { industry: 'healthcare', company: 'UnitedHealth Group', welcome: '' },
    'cvs': { industry: 'healthcare', company: 'CVS Health', welcome: '' },
    'pfizer': { industry: 'healthcare', company: 'Pfizer', welcome: '' },
    'johnson-johnson': { industry: 'healthcare', company: 'Johnson & Johnson', welcome: '' },
    'kaiser': { industry: 'healthcare', company: 'Kaiser Permanente', welcome: '' }
};

// Apply industry template based on URL path or query parameter
function applyIndustryTemplate() {
    // Check URL path
    const path = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();

    // Check query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const industryParam = urlParams.get('industry');
    const companyParam = urlParams.get('company');
    const welcomeParam = urlParams.get('welcome');

    let profile = null;

    // Try to match URL path to employer profile
    if (path && employerProfiles[path]) {
        profile = employerProfiles[path];
    }
    // Fall back to query parameters
    else if (industryParam) {
        profile = {
            industry: industryParam,
            company: companyParam || '',
            welcome: welcomeParam ? decodeURIComponent(welcomeParam) : ''
        };
    }

    if (profile) {
        // Apply industry template
        if (profile.industry) {
            document.body.setAttribute('data-industry', profile.industry);
        }

        // Update company name if provided
        if (profile.company) {
            updateCompanyName(profile.company);
        }

        // Display welcome message if provided
        if (profile.welcome) {
            displayWelcomeMessage(profile.welcome);
        }

        // Store in localStorage for admin panel
        localStorage.setItem('currentProfile', JSON.stringify(profile));
    }
}

// Update company name throughout the site (sticky banner + hero + target role)
function updateCompanyName(companyName) {
    if (!companyName) return;

    // Update sticky banner
    const stickyCompanyName = document.getElementById('stickyCompanyName');
    if (stickyCompanyName) {
        stickyCompanyName.textContent = companyName;
    }

    // Update hero personalization
    const heroCompanyName = document.getElementById('heroCompanyName');
    if (heroCompanyName) {
        heroCompanyName.textContent = `Prepared for ${companyName}`;
    }

    // Update target role section (legacy location)
    const targetElement = document.querySelector('.target-role h2');
    if (targetElement) {
        targetElement.innerHTML = `Director/VP Opportunities<br><span style="font-size: 0.8em; color: var(--accent, var(--gold)); font-weight: 600;">Prepared for ${companyName}</span>`;
    }
}

// Display welcome message in hero personalization (above the fold)
function displayWelcomeMessage(message) {
    if (!message) return;

    // Update hero personalization
    const heroWelcomeMessage = document.getElementById('heroWelcomeMessage');
    if (heroWelcomeMessage) {
        heroWelcomeMessage.innerHTML = message;
    }

    // Show the hero personalization section
    const heroPersonalization = document.getElementById('heroPersonalization');
    if (heroPersonalization) {
        heroPersonalization.style.display = 'block';
    }
}

// Sticky company banner scroll detection
window.addEventListener('scroll', () => {
    const companyBanner = document.getElementById('companyBanner');
    const stickyCompanyName = document.getElementById('stickyCompanyName');

    // Only show banner if company name is set and user has scrolled
    if (companyBanner && stickyCompanyName && stickyCompanyName.textContent.trim() !== '') {
        if (window.scrollY > 100) {
            companyBanner.classList.add('visible');
        } else {
            companyBanner.classList.remove('visible');
        }
    }
});

// Initialize on page load
applyIndustryTemplate();

// === END INDUSTRY TEMPLATE & EMPLOYER ROUTING ===

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
            // Use native scrollIntoView which respects CSS scroll-margin-top
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Scroll progress indicator
window.addEventListener('scroll', () => {
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (window.scrollY / windowHeight) * 100;
    document.getElementById('scrollProgress').style.width = scrolled + '%';
});

// Nav scroll effect
let lastScroll = 0;
const nav = document.getElementById('mainNav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe cards
document.querySelectorAll('.card, .trust-card, .testimonial-card, .project-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// ========================================
// MOBILE MENU FUNCTIONALITY
// ========================================

// Create mobile menu overlay
const mobileOverlay = document.createElement('div');
mobileOverlay.className = 'mobile-menu-overlay';
document.body.appendChild(mobileOverlay);

const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const quickLinks = document.getElementById('quickLinks');
const mobileMenuLinks = quickLinks.querySelectorAll('a');

// Toggle mobile menu
function toggleMobileMenu() {
    const isOpen = quickLinks.classList.contains('mobile-menu-open');

    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

// Open mobile menu
function openMobileMenu() {
    quickLinks.classList.add('mobile-menu-open');
    mobileMenuToggle.classList.add('active');
    mobileOverlay.classList.add('active');
    mobileMenuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // Prevent scrolling

    // Update active nav link when menu opens to ensure correct highlighting
    updateActiveNavLink();
}

// Close mobile menu
function closeMobileMenu() {
    quickLinks.classList.remove('mobile-menu-open');
    mobileMenuToggle.classList.remove('active');
    mobileOverlay.classList.remove('active');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = ''; // Restore scrolling
}

// Event listeners
mobileMenuToggle?.addEventListener('click', toggleMobileMenu);

// Close menu when clicking overlay
mobileOverlay.addEventListener('click', closeMobileMenu);

// Close menu when clicking a link
mobileMenuLinks.forEach(link => {
    link.addEventListener('click', () => {
        closeMobileMenu();
    });
});

// Close menu on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && quickLinks.classList.contains('mobile-menu-open')) {
        closeMobileMenu();
    }
});

// ========================================
// GOOGLE ANALYTICS EVENT TRACKING
// ========================================

// Track PDF Downloads
document.querySelectorAll('a[href*=".pdf"]').forEach(link => {
    link.addEventListener('click', function(e) {
        const fileName = this.getAttribute('href').split('/').pop();
        if (typeof gtag !== 'undefined') {
            gtag('event', 'file_download', {
                'event_category': 'Downloads',
                'event_label': fileName,
                'file_name': fileName,
                'file_extension': 'pdf'
            });
        }
    });
});

// Track Email Link Clicks
document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener('click', function(e) {
        const email = this.getAttribute('href').replace('mailto:', '').split('?')[0];
        if (typeof gtag !== 'undefined') {
            gtag('event', 'email_click', {
                'event_category': 'Contact',
                'event_label': 'Email Click',
                'contact_method': 'email'
            });
        }
    });
});

// Track LinkedIn Profile Clicks
document.querySelectorAll('a[href*="linkedin.com"]').forEach(link => {
    link.addEventListener('click', function(e) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'social_click', {
                'event_category': 'Social Media',
                'event_label': 'LinkedIn Profile',
                'platform': 'linkedin'
            });
        }
    });
});

// Track Scroll Depth
let scrollDepthTracked = {
    '25': false,
    '50': false,
    '75': false,
    '90': false
};

window.addEventListener('scroll', () => {
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolledPercent = Math.round((window.scrollY / windowHeight) * 100);

    Object.keys(scrollDepthTracked).forEach(depth => {
        if (scrolledPercent >= parseInt(depth) && !scrollDepthTracked[depth]) {
            scrollDepthTracked[depth] = true;
            if (typeof gtag !== 'undefined') {
                gtag('event', 'scroll_depth', {
                    'event_category': 'Engagement',
                    'event_label': `${depth}% Scrolled`,
                    'value': parseInt(depth)
                });
            }
        }
    });
});

// Track CTA Button Clicks
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const buttonText = this.textContent.trim();
        const buttonHref = this.getAttribute('href');

        // Only track if not a download link (already tracked above) or anchor link
        if (!buttonHref.includes('.pdf') && !buttonHref.startsWith('#')) {
            if (typeof gtag !== 'undefined') {
                gtag('event', 'cta_click', {
                    'event_category': 'CTA',
                    'event_label': buttonText,
                    'button_location': this.closest('section')?.className || 'unknown'
                });
            }
        }
    });
});

// ========================================
// SCROLL SPY: ACTIVE NAVIGATION INDICATOR
// ========================================

// Get all navigation links and sections
const navLinks = document.querySelectorAll('.quick-links a[href^="#"]');
const sections = Array.from(navLinks).map(link => {
    const href = link.getAttribute('href');
    return document.querySelector(href);
}).filter(section => section !== null);

// Function to update active nav link based on scroll position
function updateActiveNavLink() {
    // Fixed header heights
    // Mobile (≤768px): Banner 136px + Nav 73px = 209px total
    // Desktop (>768px): Banner 68px + Nav ~72px = 140px total
    const isMobile = window.innerWidth <= 768;
    const headerHeight = isMobile ? 209 : 140;

    // Increase the offset for scroll spy detection so sections become active sooner
    // We want "How I Think" to be highlighted when the user is viewing it,
    // not when they've scrolled far past it
    // Using header height + 50% makes sections active when content is clearly visible
    const detectionOffset = Math.floor(headerHeight * 1.5);
    const triggerPoint = window.scrollY + detectionOffset;

    // Find which section is currently in view
    // We iterate in reverse to find the last section whose top has passed the trigger point
    let currentSection = null;

    for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const sectionTop = section.offsetTop;

        // A section is active when its top is at or above the trigger point
        // The larger offset means sections become active earlier as you scroll down
        if (sectionTop <= triggerPoint) {
            currentSection = section;
            break;
        }
    }

    // Update active class on nav links
    navLinks.forEach(link => {
        link.classList.remove('active');

        if (currentSection) {
            const href = link.getAttribute('href');
            if (href === `#${currentSection.id}`) {
                link.classList.add('active');
            }
        }
    });
}

// Update on scroll with debouncing for performance
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
    }
    scrollTimeout = window.requestAnimationFrame(() => {
        updateActiveNavLink();
    });
});

// Update on page load
window.addEventListener('load', updateActiveNavLink);

// Update when hash changes (direct navigation)
window.addEventListener('hashchange', () => {
    setTimeout(updateActiveNavLink, 100);
});

// Update on window resize (viewport change, device rotation)
let resizeTimeout;
window.addEventListener('resize', () => {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(updateActiveNavLink, 100);
});
