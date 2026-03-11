// ═══════════════════════════════════════════════════════
//  UTILS — shared constants and pure helper functions
//  Loaded first; no dependencies on other modules.
// ═══════════════════════════════════════════════════════

const URLS = {
    production: 'https://joepointer.com/',
    local:      'http://localhost:8080/'
};

function getBaseUrl() {
    const env = localStorage.getItem('preview_env') || 'production';
    return URLS[env] || URLS.production;
}

// Generic resume keys (not company-specific)
const GENERIC_RESUME_KEYS = ['executive','technical','energy','healthcare','finance','consulting'];

function buildUrl(industry, company, welcome) {
    const params = new URLSearchParams();
    let hasProfile = false;
    if (company) {
        // Use slug format for clean URLs (e.g., "Human Agency" → "human-agency")
        const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '');
        params.append('company', slug);
        // If slug has a company-specific entry in RESUME_LABELS, it has an employer profile
        // on the portfolio site, so the industry param would be redundant
        if (typeof RESUME_LABELS !== 'undefined' && RESUME_LABELS[slug]
            && !GENERIC_RESUME_KEYS.includes(slug)) {
            hasProfile = true;
        }
    }
    if (industry && !hasProfile) params.append('industry', industry);
    return `${getBaseUrl()}?${params.toString()}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}/${y.slice(2)}`;
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function futureDateStr(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

function formatSalaryField(input) {
    const raw = input.value.replace(/[^0-9]/g, '');
    if (raw) {
        input.value = '$' + parseInt(raw, 10).toLocaleString('en-US');
    } else {
        input.value = '';
    }
}

function unformatSalaryField(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
}

function parseSalary(val) {
    const n = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? null : n;
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, duration = 2500) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed', bottom: '2rem', right: '2rem',
        background: '#0A1E3D', color: 'white',
        padding: '0.75rem 1.5rem', borderRadius: '10px',
        fontSize: '0.875rem', fontWeight: '600',
        boxShadow: '0 8px 32px rgba(10,30,61,0.35)',
        zIndex: '9999', transition: 'opacity 0.3s',
        animation: 'toastIn 0.2s ease-out',
        fontFamily: 'inherit', letterSpacing: '0.01em'
    });
    document.body.appendChild(t);
    // Announce to screen readers via aria-live region
    const live = document.getElementById('toastLive');
    if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); }
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, duration);
}
