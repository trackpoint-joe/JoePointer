// ============================================
// JOSEPH POINTER PORTFOLIO - JAVASCRIPT
// Complete functionality for navigation, templates, and admin panel
// ============================================

// === NAVIGATION SYSTEM ===

function showPane(paneId, navElement) {
    const panes = document.querySelectorAll('.content-pane');
    panes.forEach(pane => pane.classList.remove('active'));
    
    const targetPane = document.getElementById(paneId);
    if (targetPane) {
        targetPane.classList.add('active');
    }
    
    const navNodes = document.querySelectorAll('.nav-node');
    navNodes.forEach(node => node.classList.remove('active'));
    if (navElement) {
        navElement.classList.add('active');
    }
    
    // Scroll viewport container to top
    const viewport = document.querySelector('.viewport');
    if (viewport) {
        viewport.scrollTop = 0;
    }
    
    // Scroll main window to top for better UX
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// === TEMPLATE SWITCHING ===

function setTemplate(templateName) {
    document.body.setAttribute('data-template', templateName);
    
    const buttons = document.querySelectorAll('.template-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.template === templateName) {
            btn.classList.add('active');
        }
    });
    
    localStorage.setItem('portfolio-template', templateName);
}

// === ADMIN PANEL ===

function toggleAdmin() {
    const panel = document.getElementById('admin-panel');
    const overlay = document.getElementById('admin-overlay');
    
    if (panel && overlay) {
        const isOpen = panel.classList.contains('open');
        
        if (isOpen) {
            panel.classList.remove('open');
            overlay.classList.remove('visible');
        } else {
            panel.classList.add('open');
            overlay.classList.add('visible');
            loadSettings();
        }
    }
}

function closeAdmin() {
    const panel = document.getElementById('admin-panel');
    const overlay = document.getElementById('admin-overlay');
    
    if (panel && overlay) {
        panel.classList.remove('open');
        overlay.classList.remove('visible');
    }
}

function loadSettings() {
    const companyName = localStorage.getItem('portfolio-company') || '';
    const message = localStorage.getItem('portfolio-message') || '';
    const primaryColor = localStorage.getItem('portfolio-primary') || getTemplateDefaultColor('primary');
    const accentColor = localStorage.getItem('portfolio-accent') || getTemplateDefaultColor('accent');
    
    document.getElementById('company-input').value = companyName;
    document.getElementById('message-input').value = message;
    document.getElementById('primary-color').value = primaryColor;
    document.getElementById('accent-color').value = accentColor;
}

function updateCompany(value) {
    const companyName = value || 'your team';
    const coNameEl = document.getElementById('co-name');
    const welcomeMsg = document.getElementById('welcome-msg');
    
    if (coNameEl) {
        coNameEl.textContent = companyName;
    }
    
    if (welcomeMsg && value) {
        welcomeMsg.classList.add('visible');
    } else if (welcomeMsg) {
        welcomeMsg.classList.remove('visible');
    }
    
    localStorage.setItem('portfolio-company', value || '');
}

function updateMessage(value) {
    const welcomeTextEl = document.getElementById('welcome-text');
    if (welcomeTextEl) {
        welcomeTextEl.textContent = value || '';
    }
    localStorage.setItem('portfolio-message', value || '');
}

function updateColor(type, value) {
    if (type === 'primary') {
        document.documentElement.style.setProperty('--primary', value);
        localStorage.setItem('portfolio-primary', value);
    } else if (type === 'accent') {
        document.documentElement.style.setProperty('--accent', value);
        localStorage.setItem('portfolio-accent', value);
    }
}

function resetColors() {
    const template = document.body.getAttribute('data-template') || 'blueprint';
    const primaryColor = getTemplateDefaultColor('primary');
    const accentColor = getTemplateDefaultColor('accent');
    
    document.getElementById('primary-color').value = primaryColor;
    document.getElementById('accent-color').value = accentColor;
    
    updateColor('primary', primaryColor);
    updateColor('accent', accentColor);
}

function getTemplateDefaultColor(type) {
    const template = document.body.getAttribute('data-template') || 'blueprint';
    const defaults = {
        blueprint: { primary: '#3b82f6', accent: '#10b981' },
        executive: { primary: '#1e40af', accent: '#d97706' },
        minimal: { primary: '#3b82f6', accent: '#e5e5e5' },
        designer: { primary: '#6366f1', accent: '#f59e0b' }
    };
    return defaults[template][type];
}

function generateURL() {
    const template = document.body.getAttribute('data-template');
    const company = localStorage.getItem('portfolio-company') || '';
    const message = localStorage.getItem('portfolio-message') || '';
    const primary = localStorage.getItem('portfolio-primary') || '';
    const accent = localStorage.getItem('portfolio-accent') || '';
    
    const params = new URLSearchParams();
    if (template !== 'blueprint') params.set('template', template);
    if (company) params.set('company', company);
    if (message) params.set('message', message);
    if (primary && primary !== getTemplateDefaultColor('primary')) params.set('primary', primary);
    if (accent && accent !== getTemplateDefaultColor('accent')) params.set('accent', accent);
    
    const baseURL = window.location.origin + window.location.pathname;
    const fullURL = params.toString() ? `${baseURL}?${params.toString()}` : baseURL;
    
    const urlOutput = document.getElementById('url-output');
    urlOutput.value = fullURL;
    urlOutput.select();
    
    // Copy to clipboard
    try {
        document.execCommand('copy');
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied to Clipboard!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.log('Copy failed, but URL is selected');
    }
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    const template = params.get('template');
    if (template) {
        setTemplate(template);
    }
    
    const company = params.get('company');
    if (company) {
        updateCompany(company);
    }
    
    const message = params.get('message');
    if (message) {
        updateMessage(message);
    }
    
    const primary = params.get('primary');
    if (primary) {
        updateColor('primary', primary);
    }
    
    const accent = params.get('accent');
    if (accent) {
        updateColor('accent', accent);
    }
}

// === INITIALIZATION ===

document.addEventListener('DOMContentLoaded', function() {
    // Load URL parameters first (highest priority)
    loadFromURL();
    
    // Load saved settings from localStorage if no URL params
    const params = new URLSearchParams(window.location.search);
    
    if (!params.has('template')) {
        const savedTemplate = localStorage.getItem('portfolio-template');
        if (savedTemplate) setTemplate(savedTemplate);
    }
    
    if (!params.has('company')) {
        const savedCompany = localStorage.getItem('portfolio-company');
        if (savedCompany) updateCompany(savedCompany);
    }
    
    if (!params.has('message')) {
        const savedMessage = localStorage.getItem('portfolio-message');
        if (savedMessage) updateMessage(savedMessage);
    }
    
    if (!params.has('primary')) {
        const savedPrimary = localStorage.getItem('portfolio-primary');
        if (savedPrimary) updateColor('primary', savedPrimary);
    }
    
    if (!params.has('accent')) {
        const savedAccent = localStorage.getItem('portfolio-accent');
        if (savedAccent) updateColor('accent', savedAccent);
    }
    
    // Ensure home pane is active
    const homePane = document.getElementById('home');
    if (homePane && !document.querySelector('.content-pane.active')) {
        homePane.classList.add('active');
    }
    
    // Setup overlay click handler
    const overlay = document.getElementById('admin-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeAdmin);
    }
});

// === UTILITY FUNCTIONS ===

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Export functions for global access
window.showPane = showPane;
window.setTemplate = setTemplate;
window.toggleAdmin = toggleAdmin;
window.closeAdmin = closeAdmin;
window.updateCompany = updateCompany;
window.updateMessage = updateMessage;
window.updateColor = updateColor;
window.resetColors = resetColors;
window.generateURL = generateURL;


// === EXPANDABLE SECTIONS ===

function toggleExpand(contentId) {
    const content = document.getElementById(contentId);
    const button = event.target;
    
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        button.textContent = button.textContent.replace('− Hide', '+ See');
    } else {
        content.classList.add('open');
        button.textContent = button.textContent.replace('+ See', '− Hide');
    }
}

window.toggleExpand = toggleExpand;
