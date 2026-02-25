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
        // URL has an anchor - scroll to that section after a brief delay.
        // Use navScrollTo (not scrollIntoView) to bypass Chrome's bug where
        // scrollIntoView ignores scroll-padding-top on the html element.
        setTimeout(() => {
            const target = document.querySelector(hash);
            if (target) {
                navScrollTo(target);
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
    else if (industryParam || companyParam) {
        let derivedIndustry = industryParam || '';

        // If no explicit industry param, derive from company name lookup
        if (!derivedIndustry && companyParam) {
            // Try slug match first (e.g., "Goldman Sachs" → "goldman-sachs")
            const slug = companyParam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '');
            const bySlug = employerProfiles[slug];
            // Also try matching by display name value
            const byName = !bySlug && Object.values(employerProfiles).find(
                ep => ep.company && ep.company.toLowerCase() === companyParam.toLowerCase()
            );
            if (bySlug) derivedIndustry = bySlug.industry;
            else if (byName) derivedIndustry = byName.industry;
        }

        profile = {
            industry: derivedIndustry,
            company: companyParam || '',
            welcome: welcomeParam ? decodeURIComponent(welcomeParam) : ''
        };
    }

    if (profile) {
        // Apply industry template
        if (profile.industry) {
            document.body.setAttribute('data-industry', profile.industry);
            applyResumeVersion(profile.industry);
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

// Swap resume download links to the industry-tailored version.
// The `download` attribute is always set to "Joe_Pointer_Resume.pdf" so the
// file saves with a clean name regardless of the internal filename served.
function applyResumeVersion(industry) {
    const resumeMap = {
        tech:        'resources/Joe_Pointer_Resume_Tech.pdf',
        healthcare:  'resources/Joe_Pointer_Resume_Healthcare.pdf',
        consulting:  'resources/Joe_Pointer_Resume_Consulting.pdf',
        finance:     'resources/Joe_Pointer_Resume.pdf',
    };
    const file = resumeMap[industry] || 'resources/Joe_Pointer_Resume.pdf';
    document.querySelectorAll('a[href*="Joe_Pointer_Resume"]').forEach(link => {
        // Only swap the 1-page resume button, not the Executive Brief
        if (link.href.includes('Executive_Brief')) return;
        link.setAttribute('href', file);
        link.setAttribute('download', 'Joe_Pointer_Resume.pdf');
    });
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

// navScrollTo: scroll a target element into view, clearing the live nav bottom.
// Uses window.scrollTo instead of scrollIntoView to bypass Chrome's known bug
// where scrollIntoView ignores scroll-padding-top on the html element.
// Measures nav.getBoundingClientRect().bottom at call time so it works correctly
// regardless of nav height, scroll state (compact vs full), or breakpoint.
function navScrollTo(target, delay) {
    function doScroll() {
        const nav = document.getElementById('mainNav');
        const subnav = document.getElementById('projectSubnav');
        const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;

        // Project cards sit below the sticky subnav — include subnav in the offset.
        // Use the subnav's CSS sticky-top + rendered height rather than
        // getBoundingClientRect().bottom: the latter is inaccurate mid-animation
        // (the subnav may still be scrolling into position, giving a value like
        // 900+px which inflates the offset and leaves the card too low in the
        // viewport on the first click after navigating to the projects section).
        let offset = navBottom;
        if (subnav && target.classList.contains('project-card')) {
            const subnavStickyTop    = parseFloat(getComputedStyle(subnav).top) || 0;
            const subnavHeight       = subnav.getBoundingClientRect().height;
            const subnavStickyBottom = subnavStickyTop + subnavHeight;
            if (subnavStickyBottom > navBottom) offset = subnavStickyBottom;
        }

        const targetTop = target.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: Math.max(0, targetTop - offset - 8), behavior: 'smooth' });
    }
    delay ? setTimeout(doScroll, delay) : doScroll();
}

// Smooth scrolling for anchor links
// On mobile the menu sets body.overflow:hidden while open.
// We detect whether the mobile menu is open and, if so, wait one frame after
// it closes before scrolling so the overflow lock has been released.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        const quickLinks = document.getElementById('quickLinks');
        const menuIsOpen = quickLinks && quickLinks.classList.contains('mobile-menu-open');

        // After smooth scroll settles, force-reveal any project-card that the
        // IntersectionObserver missed during programmatic scrolling.
        //
        // Why polling instead of scrollend or a fixed timeout:
        // • scrollend (Chrome 114+/Firefox 109+/Safari 17+) fires mid-animation
        //   in practice, so the card isn't in the viewport when the check runs.
        //   Setting a "done" flag at that point permanently blocks the fallback.
        // • A fixed timeout (e.g. 750ms) runs while the scroll may still be
        //   animating — the card hasn't landed yet.
        //
        // Polling every 100ms (up to 2 s) continues until at least one card
        // becomes visible, so it naturally catches the card the moment the
        // scroll animation delivers it into the viewport.
        function revealAfterScroll(delay) {
            // Reveal the target section itself immediately after a short grace period
            // (the section starts at opacity:0 and needs the IO or this nudge).
            setTimeout(() => {
                if (target.style.opacity !== '1') {
                    target.style.opacity = '1';
                    target.style.transform = 'translateY(0)';
                }
            }, delay + 350);

            // Poll every 100ms to reveal project cards that enter the viewport
            // at opacity:0. Stops after the first successful reveal or 2 seconds.
            setTimeout(() => {
                let ticks = 0;
                const poll = setInterval(() => {
                    ticks++;
                    let revealed = false;
                    document.querySelectorAll('.project-card').forEach(card => {
                        if (card.style.opacity === '1') { revealed = true; return; }
                        const r = card.getBoundingClientRect();
                        if (r.top < window.innerHeight && r.bottom > 0) {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                            revealed = true;
                        }
                    });
                    if (revealed || ticks >= 20) clearInterval(poll);
                }, 100);
            }, delay);
        }

        if (menuIsOpen) {
            // Delay scroll until after closeMobileMenu restores body overflow
            navScrollTo(target, 50);
            revealAfterScroll(50);
        } else {
            navScrollTo(target);
            revealAfterScroll(0);
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
    // Mobile (≤768px): Banner ~64px + Nav 73px = ~139px total
    // iPad (769-1024px): Banner 95px + Nav 83px = 178px total
    // Desktop (>1024px): Banner 68px + Nav 72px = 140px total
    const width = window.innerWidth;
    const headerHeight = width <= 768 ? 139 : (width <= 1024 ? 178 : 140);

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

// ============================================
// DYNAMIC SCROLL-MARGIN CALCULATOR FOR PROJECT CARDS
// scroll-padding-top (on html) and scroll-margin-top (on card) STACK.
// This measures the real subnav height and sets the exact additional
// offset needed so cards land just below the sticky subnav.
// ============================================
(function() {
    function updateProjectScrollMargins() {
        const subnav = document.getElementById('projectSubnav');
        const projectCards = document.querySelectorAll('.project-card');
        if (!subnav || !projectCards.length) return;

        // On mobile the sub-nav is position:static (not sticky).
        // In that case no extra scroll margin is needed — scroll-padding-top
        // on the html element already handles the fixed nav clearance.
        const subnavPosition = getComputedStyle(subnav).position;
        if (subnavPosition !== 'sticky') {
            projectCards.forEach(card => { card.style.scrollMarginTop = '0px'; });
            return;
        }

        // Actual scroll-padding-top already applied to the html element
        const scrollPaddingTop = parseFloat(
            getComputedStyle(document.documentElement).scrollPaddingTop
        ) || 0;

        // The subnav's CSS sticky-top value (varies by breakpoint)
        const subnavStickyTop = parseFloat(getComputedStyle(subnav).top) || 0;

        // The subnav's actual rendered height (changes on resize/wrap)
        const subnavHeight = subnav.getBoundingClientRect().height;

        // Where the subnav bottom sits in the viewport when sticky
        const subnavBottom = subnavStickyTop + subnavHeight;

        // Desired card top = subnav bottom + 20px breathing room
        // Subtract scroll-padding-top to avoid double-stacking
        const scrollMargin = Math.max(0, Math.round(subnavBottom + 20 - scrollPaddingTop));

        projectCards.forEach(card => {
            card.style.scrollMarginTop = scrollMargin + 'px';
        });
    }

    window.addEventListener('load', updateProjectScrollMargins);
    window.addEventListener('resize', () => {
        clearTimeout(window._sMarginTimeout);
        window._sMarginTimeout = setTimeout(updateProjectScrollMargins, 120);
    });
})();

// ============================================
// NAV GEOMETRY TRACKER
// Sets two CSS custom properties on <html>:
//   --banner-height : actual rendered banner height (Math.ceil)
//   --nav-bottom    : banner-height + scrolled nav height
//
// --banner-height drives .nav { top: var(--banner-height) } so the nav
// always sticks right below the banner instead of inside it.
//
// --nav-bottom drives .project-subnav { top: var(--nav-bottom) } so the
// subnav always sticks right below the nav.
//
// Both compact-block overrides (769-1219px) hardcode top values and cascade
// over these vars, so this only matters at desktop (1220px+).
// ============================================
(function () {
    function updateNavGeometry() {
        const banner = document.querySelector('.availability-banner');
        const nav    = document.getElementById('mainNav');
        const subnav = document.getElementById('projectSubnav');
        if (!banner || !nav) return;

        // --banner-height: drives .nav { top: var(--banner-height) } at desktop.
        const bannerH = Math.ceil(banner.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--banner-height', bannerH + 'px');

        // Measure the nav's bottom edge to position the subnav flush below it.
        //
        // At compact widths (769-1219px) the nav is position:fixed and its
        // height is identical in both scrolled and non-scrolled states (the
        // compact CSS block sets the same padding for both). Measure as-is.
        //
        // At desktop (1220px+) the nav is position:sticky and is taller when
        // NOT scrolled (larger padding). The subnav is only visible when the
        // user is scrolled past 100px (nav has .scrolled = compact height).
        // Temporarily apply .scrolled with transitions disabled to measure the
        // compact height accurately.
        let navBCRBottom;
        const navIsFixed = getComputedStyle(nav).position === 'fixed';
        if (navIsFixed) {
            // Fixed nav: height is scroll-state-independent; measure directly.
            navBCRBottom = nav.getBoundingClientRect().bottom;
        } else {
            // Sticky nav: measure in compact (.scrolled) state.
            const wasScrolled = nav.classList.contains('scrolled');
            nav.style.transition = 'none';
            if (!wasScrolled) nav.classList.add('scrolled');
            void nav.offsetHeight;
            navBCRBottom = nav.getBoundingClientRect().bottom;
            if (!wasScrolled) nav.classList.remove('scrolled');
            void nav.offsetHeight;
            nav.style.transition = '';
        }

        // Math.round: closest integer to the real nav bottom.
        // Avoids the 0.74px sub-pixel gap (ceil) and the possible 1px under-
        // shoot (floor) — at worst 0.5px overlap with the nav, which is
        // invisible at any DPI.
        const navBottomPx = Math.round(navBCRBottom) + 'px';
        document.documentElement.style.setProperty('--nav-bottom', navBottomPx);

        // Set subnav inline top directly. Inline style wins over every CSS
        // rule — this eliminates the gap caused by hardcoded top values in
        // the compact CSS blocks overriding var(--nav-bottom).
        if (subnav) subnav.style.top = navBottomPx;
    }
    window.addEventListener('load', updateNavGeometry);
    window.addEventListener('resize', function () {
        clearTimeout(window._navGeoTimeout);
        window._navGeoTimeout = setTimeout(updateNavGeometry, 80);
    });
})();

// ============================================
// PRIORITY 1: BACK TO TOP BUTTON
// ============================================
(function() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

// ============================================
// PRIORITY 2: COLLAPSE LINK AT BOTTOM OF EACH EXPANDED SECTION
// ============================================
(function() {
    // Inject a "Collapse" button at the bottom of every .principle-content
    // and .principle-expanded element (both expand container types used on page)
    const expandContainers = document.querySelectorAll('.principle-content, .principle-expanded');

    expandContainers.forEach(container => {
        // Only inject into containers that are inside a <details> element.
        // .principle-content on "How I Think" cards is the outer wrapper (not inside
        // details), so it would produce a second, non-functional collapse button.
        if (!container.closest('details')) return;

        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'details-collapse-link';
        collapseBtn.textContent = 'Collapse \u25B2';
        collapseBtn.setAttribute('aria-label', 'Collapse this section');

        collapseBtn.addEventListener('click', () => {
            const parentDetails = container.closest('details');
            if (parentDetails) {
                parentDetails.removeAttribute('open');
                // Scroll the summary into view so user can see the closed state
                parentDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        container.appendChild(collapseBtn);
    });
})();

// ============================================
// PRIORITY 3: PROJECT SUB-NAVIGATION ACTIVE STATE
// ============================================
(function() {
    const pills = document.querySelectorAll('.project-subnav-pill');
    if (!pills.length) return;

    const projectCards = [
        document.getElementById('project-careerspark'),
        document.getElementById('project-workplace'),
        document.getElementById('project-revolver'),
        document.getElementById('project-rr'),
        document.getElementById('project-buildingblocks')
    ].filter(Boolean);

    function updateActivePill() {
        // Use getBoundingClientRect() for viewport-relative coords.
        // card.offsetTop is relative to the offset parent (the section),
        // not the document — comparing it to window.scrollY gives wrong results.
        const threshold = window.innerHeight * 0.4;
        let activeCard = null;

        projectCards.forEach(card => {
            if (card.getBoundingClientRect().top <= threshold) {
                activeCard = card;
            }
        });

        // No active pill when the user is above the projects section entirely
        // (first card hasn't scrolled into the top 40% of the viewport yet)
        // or below it (last card's bottom has left the viewport above).
        const lastCard = projectCards[projectCards.length - 1];
        if (lastCard && lastCard.getBoundingClientRect().bottom < 0) {
            activeCard = null;
        }

        pills.forEach(pill => {
            pill.classList.remove('active');
            if (activeCard && pill.getAttribute('href') === '#' + activeCard.id) {
                pill.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActivePill, { passive: true });
    window.addEventListener('load', updateActivePill);
})();

// ============================================
// PRIORITY 4: COLLAPSE ALL BUTTONS
// ============================================
(function() {
    document.querySelectorAll('.collapse-all-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            let container;

            if (sectionId === 'projects') {
                container = document.getElementById('projects');
            } else if (sectionId === 'how-i-think') {
                container = document.getElementById('how-i-think');
            }

            if (!container) return;

            const openDetails = container.querySelectorAll('details[open]');
            openDetails.forEach(d => d.removeAttribute('open'));

            // Brief visual feedback on the button
            const orig = btn.textContent;
            btn.textContent = 'Collapsed';
            setTimeout(() => { btn.textContent = orig; }, 1200);
        });
    });
})();
