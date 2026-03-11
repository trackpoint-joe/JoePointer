// ═══════════════════════════════════════════════════════
//  GENERATOR — portfolio URL generator + saved profiles
//  Depends on: utils.js, storage.js
// ═══════════════════════════════════════════════════════

let genSelectedIndustry = '';
let genUrl = '';

function detectResumeVersion(company) {
    if (!company) return 'executive';
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '');
    return (typeof RESUME_LABELS !== 'undefined' && RESUME_LABELS[slug]) ? slug : 'executive';
}

document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        genSelectedIndustry = card.dataset.industry;
        document.getElementById('genIndustry').value = genSelectedIndustry;
    });
});

document.getElementById('templateForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!genSelectedIndustry) { alert('Please select an industry template'); return; }
    const company = document.getElementById('genCompany').value;
    const welcome = document.getElementById('genWelcome').value;
    genUrl = buildUrl(genSelectedIndustry, company, welcome);
    document.getElementById('genUrlDisplay').textContent = genUrl;
    document.getElementById('genResultBox').classList.add('active');
});

function copyGenUrl() {
    navigator.clipboard.writeText(genUrl).then(() => showToast('URL copied!'));
}

function openGenPreview() { window.open(genUrl, '_blank'); }

function saveGenProfile() {
    const company = document.getElementById('genCompany').value;
    if (!company) { alert('Please enter a company name to save this profile'); return; }

    const profiles = getProfiles();
    const profile = {
        id: 'app_' + Date.now(),
        industry: genSelectedIndustry,
        company,
        welcome: document.getElementById('genWelcome').value,
        url: genUrl,
        role: '', status: 'applied', source: '',
        resumeVersion: detectResumeVersion(company),
        appliedDate: todayStr(), lastContactDate: '', followUpDate: futureDateStr(7),
        salaryMin: null, salaryMax: null,
        recruiterName: '', recruiterEmail: '',
        hiringManagerName: '', hiringManagerEmail: '',
        notes: '', jobDescription: '',
        created: new Date().toISOString(),
        schemaVersion: 2
    };

    profiles.push(profile);
    saveProfiles(profiles);
    loadGenProfiles();
    showToast(`Profile saved for ${company}!`);
}

function saveAsApplication() {
    // Pre-populate the new application form with URL generator data
    const company = document.getElementById('genCompany').value;
    const welcome = document.getElementById('genWelcome').value;

    document.getElementById('editId').value = '';
    document.getElementById('formTitle').textContent = 'New Application';
    document.getElementById('formSubmitBtn').textContent = 'Save Application';
    document.getElementById('fCompany').value = company;
    document.getElementById('fWelcome').value = welcome;
    document.getElementById('fAppliedDate').value = todayStr();
    document.getElementById('fFollowUp').value = futureDateStr(7);

    // Select matching industry
    formSelectedIndustry = genSelectedIndustry;
    document.getElementById('formIndustry').value = formSelectedIndustry;
    document.querySelectorAll('.template-mini').forEach(m => {
        m.classList.toggle('selected', m.dataset.ind === formSelectedIndustry);
    });

    openFormPanel();
}

function loadGenProfiles() {
    const profiles = getProfiles();
    const container = document.getElementById('profileChips');

    if (profiles.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;font-size:0.875rem;">No saved profiles yet</p>';
        return;
    }

    container.innerHTML = profiles.map((p, i) => `
        <div class="profile-chip">
            <div class="profile-chip-content" onclick="loadGenProfile(${i})">
                <strong>${escHtml(p.company)}</strong> (${p.industry || '—'})
            </div>
            <button class="profile-chip-delete" onclick="deleteGenProfile(${i}); event.stopPropagation();" title="Delete">×</button>
        </div>
    `).join('');
}

function loadGenProfile(index) {
    const profiles = getProfiles();
    const p = profiles[index];
    if (!p) return;

    document.querySelectorAll('.template-card').forEach(card => {
        if (card.dataset.industry === p.industry) card.click();
    });
    document.getElementById('genCompany').value = p.company;
    document.getElementById('genWelcome').value = p.welcome || '';

    genUrl = p.url || buildUrl(p.industry, p.company, p.welcome);
    document.getElementById('genUrlDisplay').textContent = genUrl;
    document.getElementById('genResultBox').classList.add('active');
}

function deleteGenProfile(index) {
    const profiles = getProfiles();
    const p = profiles[index];
    if (!confirm(`Delete profile for ${p?.company}?`)) return;
    profiles.splice(index, 1);
    saveProfiles(profiles);
    loadGenProfiles();
}
