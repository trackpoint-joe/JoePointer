// ═══════════════════════════════════════════════════════
//  TRACKING — tab nav, application list/form, settings,
//             help, export/import, init, sample data
//  Depends on: utils.js, storage.js, ats.js, dashboard.js
// ═══════════════════════════════════════════════════════

// ── App-level state globals ───────────────────────────────────────────────────
let formDirty = false;
let currentLog = [];
let currentFilter = 'all';
let currentIndustryFilter = '';
let formSelectedIndustry = '';
let formPanelOpen = false;

// ═══════════════════════════════════════════════════════
//  TAB NAVIGATION
// ═══════════════════════════════════════════════════════

function updateSidebarStats() {
    const profiles = getProfiles();
    const today = new Date(); today.setHours(0,0,0,0);

    const total    = profiles.length;
    const pipeline = profiles.filter(p => ['phone','technical','final'].includes(p.status)).length;
    const offers   = profiles.filter(p => p.status === 'offer').length;
    const overdue  = profiles.filter(p => {
        if (!p.followUpDate) return false;
        return new Date(p.followUpDate + 'T00:00:00') < today;
    }).length;

    // Badge on Applications nav item
    const badge = document.getElementById('sidebarAppCount');
    if (badge) badge.textContent = total || '';

    // Badge on Story Bank nav item
    const storyBadge = document.getElementById('storyBankCount');
    if (storyBadge) {
        try {
            const stories = JSON.parse(localStorage.getItem('storyBank') || '[]');
            storyBadge.textContent = stories.length || '';
        } catch(e) { storyBadge.textContent = ''; }
    }

    // Sub-line under page title
    const sub = document.getElementById('trackerSubline');
    if (sub) {
        const parts = [`${total} application${total !== 1 ? 's' : ''}`];
        if (pipeline) parts.push(`${pipeline} in pipeline`);
        if (overdue)  parts.push(`${overdue} follow-up${overdue !== 1 ? 's' : ''} due`);
        sub.textContent = parts.join(' · ');
    }

    // Pipeline breakdown in sidebar
    const pl = document.getElementById('sidebarPipeline');
    if (!pl) return;
    const statuses = [
        { label: 'Applied',      filter: 'applied',   color: '#3B82F6', key: 'applied'    },
        { label: 'Phone Screen', filter: 'phone',      color: '#8B5CF6', key: 'phone'      },
        { label: 'Technical',    filter: 'technical',  color: '#F59E0B', key: 'technical'  },
        { label: 'Final Round',  filter: 'final',      color: '#F97316', key: 'final'      },
        { label: 'Offer',        filter: 'offer',      color: '#10B981', key: 'offer'      },
    ];
    const counts = {};
    profiles.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    const rows = statuses.map(s => {
        const n = counts[s.key] || 0;
        if (!n) return '';
        return `<div class="sidebar-pl-row" onclick="filterApps('${s.filter}'); switchTab('tracker');" title="Filter by ${s.label}">
            <div class="sidebar-pl-dot" style="background:${s.color}"></div>
            <span class="sidebar-pl-label">${s.label}</span>
            <span class="sidebar-pl-val">${n}</span>
        </div>`;
    }).join('');

    pl.innerHTML = rows ? `
        <div class="sidebar-pipeline-title">Pipeline</div>
        ${rows}
    ` : '';
}

function openStoryBank() {
    window.open('storybank.html', 'storybank');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');

    document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
    const navItem = document.getElementById('nav-' + tabId);
    if (navItem) navItem.classList.add('active');

    if (tabId === 'tracker') renderAppList();
    if (tabId === 'dashboard') renderDashboard();
}

// ── Form panel (slide-in) ─────────────────────────────────────────────────────

function openFormPanel() {
    document.getElementById('tab-add-app').classList.add('open');
    document.body.style.overflow = 'hidden';
    formPanelOpen = true;
}

function closeFormPanel(force) {
    if (!force && formDirty) {
        if (!confirm('You have unsaved changes. Leave without saving?')) return;
    }
    document.getElementById('tab-add-app').classList.remove('open');
    document.body.style.overflow = '';
    formPanelOpen = false;
    resetForm();
    renderAppList();
    renderDashboard();
}

// ═══════════════════════════════════════════════════════
//  APPLICATION LIST
// ═══════════════════════════════════════════════════════

function filterApps(filter, cardId) {
    currentFilter = filter;
    currentIndustryFilter = '';

    // Sync filter bar — only highlight if it's a single-status match
    const barFilters = ['all','applied','phone','technical','final','offer','rejected'];
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', barFilters.includes(filter) && btn.dataset.filter === filter);
    });

    // Sync card active state
    document.querySelectorAll('.dash-card').forEach(c => c.classList.remove('filter-active'));
    if (cardId) document.getElementById(cardId)?.classList.add('filter-active');

    renderAppList();
}

function updateDashboard() {
    const all = getProfiles();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total    = all.length;
    const pipeline = all.filter(p => ['phone','technical','final'].includes(p.status)).length;
    const offers   = all.filter(p => p.status === 'offer').length;
    const overdue  = all.filter(p =>
        p.followUpDate &&
        new Date(p.followUpDate) < today &&
        !['offer','rejected'].includes(p.status)
    ).length;

    document.getElementById('dashTotal').textContent    = total;
    document.getElementById('dashPipeline').textContent = pipeline;
    document.getElementById('dashOffers').textContent   = offers;
    document.getElementById('dashOverdue').textContent  = overdue;

    // Highlight overdue card red when there are items
    const overdueCard = document.getElementById('dashCardOverdue');
    if (overdue > 0) {
        overdueCard.style.borderColor = '#DC2626';
        overdueCard.style.background  = '#FEF2F2';
        document.getElementById('dashOverdue').style.color = '#DC2626';
    } else {
        overdueCard.style.borderColor = '#e2e8f0';
        overdueCard.style.background  = '#f8fafc';
        document.getElementById('dashOverdue').style.color = '#1e293b';
    }
}

function renderAppList() {
    updateSidebarStats();
    const container = document.getElementById('appList');
    let profiles = getProfiles();

    // Filter by status / card mode
    if (currentFilter === 'pipeline') {
        profiles = profiles.filter(p => ['phone','technical','final'].includes(p.status));
    } else if (currentFilter === 'overdue') {
        const now = new Date();
        profiles = profiles.filter(p =>
            p.followUpDate &&
            new Date(p.followUpDate + 'T00:00:00') < now &&
            !['offer','rejected'].includes(p.status)
        );
    } else if (currentFilter !== 'all') {
        profiles = profiles.filter(p => p.status === currentFilter);
    }

    // Filter by industry (set from dashboard pie click)
    if (currentIndustryFilter) {
        profiles = profiles.filter(p => (p.industry || 'other') === currentIndustryFilter);
    }

    // Update dashboard & filter counts
    updateDashboard();
    updateFilterCounts();

    // Industry filter banner
    const banner = document.getElementById('industryFilterBanner');
    if (banner) {
        const indLabels = { finance: 'Finance', tech: 'Tech', consulting: 'Consulting', healthcare: 'Healthcare', other: 'Other' };
        if (currentIndustryFilter) {
            const label = indLabels[currentIndustryFilter] || currentIndustryFilter;
            banner.style.display = 'flex';
            banner.innerHTML = `<span style="color:#1D4ED8;font-weight:600">Industry: ${label}</span><button onclick="clearIndustryFilter()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem;line-height:1;padding:0 0 0 0.4rem" title="Clear filter">×</button>`;
        } else {
            banner.style.display = 'none';
        }
    }

    if (profiles.length === 0) {
        container.innerHTML = currentFilter === 'all' ? `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <h3>No applications yet</h3>
                <p>Add your first application to start tracking your job search.</p>
                <div style="margin-top:1.5rem;display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
                    <button class="btn-add" onclick="resetForm(); openFormPanel();" style="font-size:0.85rem;">+ New Application</button>
                    <button class="btn-utility" onclick="seedSampleData()" style="font-size:0.85rem;">🎭 Load Sample Data</button>
                </div>
            </div>` : `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <h3>No matches</h3>
                <p>No applications with this status.</p>
            </div>`;
        return;
    }

    // Sort: most recent first
    profiles.sort((a, b) => {
        const da = a.appliedDate || a.created || '';
        const db = b.appliedDate || b.created || '';
        return db.localeCompare(da);
    });

    container.innerHTML = profiles.map(p => {
        const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.applied;
        const followUpOverdue = p.followUpDate && new Date(p.followUpDate + 'T00:00:00') < new Date() && p.status !== 'offer' && p.status !== 'rejected';
        let followUpDisplay = '<span class="app-date"></span>';
        if (p.followUpDate) {
            let followUpLabel;
            if (followUpOverdue) {
                const days = Math.ceil((new Date() - new Date(p.followUpDate + 'T00:00:00')) / 86400000);
                followUpLabel = `⚠️ Overdue ${days}d`;
            } else {
                const d = new Date(p.followUpDate + 'T00:00:00');
                followUpLabel = 'Due ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            followUpDisplay = `<span class="app-date ${followUpOverdue ? 'overdue' : ''}" title="Follow-up date">${followUpLabel}</span>`;
        }

        const url = buildUrl(p.industry, p.company, p.welcome);

        return `
        <div class="app-row ${sc.cls}" onclick="editApplication('${p.id}')">
            <div class="app-row-bar" style="background:${sc.color}"></div>
            <div class="app-info">
                <div class="app-company">${escHtml(p.company)}</div>
                <div class="app-role">${escHtml(p.role || p.industry || '')}</div>
                ${p.referredBy ? `<div class="app-referral">👤 ${escHtml(p.referredBy)}</div>` : ''}
            </div>
            <span class="status-badge ${sc.cls}">${sc.label}</span>
            <span class="app-date">${p.appliedDate ? formatDate(p.appliedDate) : ''}</span>
            ${followUpDisplay}
            <div class="app-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); copyAppUrl('${p.id}')" title="Copy portfolio URL" aria-label="Copy portfolio URL for ${escHtml(p.company)}">🔗</button>
                <button class="btn-icon" onclick="event.stopPropagation(); openAppUrl('${p.id}')" title="Preview portfolio" aria-label="Preview portfolio for ${escHtml(p.company)}">👁</button>
                <button class="btn-icon" onclick="event.stopPropagation(); buildEmailDraft('${p.id}')" title="Draft email" aria-label="Draft follow-up email for ${escHtml(p.company)}">📧</button>
                ${(p.recruiterEmail || p.hiringManagerEmail) ? `<button class="btn-icon" onclick="event.stopPropagation(); copyContact('${p.id}')" title="Copy contact email" aria-label="Copy contact email for ${escHtml(p.company)}">📋</button>` : ''}
                ${['phone','technical','final'].includes(p.status)
                    ? `<button class="btn-icon ${p.prepState ? 'prep-ready' : ''}" onclick="event.stopPropagation(); openPrepPanel('${p.id}')" title="${p.prepState ? 'Interview prep ready — click to review' : 'Generate interview prep'}" aria-label="${p.prepState ? 'Interview prep ready for ' : 'Generate interview prep for '}${escHtml(p.company)}">🎤</button>${p.prepState?.questions?.length ? `<button class="btn-icon go-live" onclick="event.stopPropagation(); openPrepPanel('${p.id}', true)" title="Go Live — open directly in Live Mode" aria-label="Go Live for ${escHtml(p.company)}">▶ Live</button>` : ''}`
                    : ''}
                <button class="btn-icon danger" onclick="event.stopPropagation(); deleteApp('${p.id}')" title="Delete application" aria-label="Delete ${escHtml(p.company)} application">🗑</button>
            </div>
        </div>`;
    }).join('');
}

function updateFilterCounts() {
    const all = getProfiles();
    const counts = {};
    all.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        const f = btn.dataset.filter;
        if (f === 'all') {
            btn.textContent = `All (${all.length})`;
        } else {
            const label = STATUS_CONFIG[f]?.label || f;
            const count = counts[f] || 0;
            btn.textContent = count > 0 ? `${label} (${count})` : label;
        }
    });
}

function updateUrlPreview() {
    const company = document.getElementById('fCompany').value.trim();
    const preview = document.getElementById('fUrlPreview');
    if (!preview) return;
    if (!company) {
        preview.textContent = 'Enter a company name to generate URL';
        preview.classList.add('empty');
    } else {
        preview.textContent = buildUrl('', company, '');
        preview.classList.remove('empty');
    }
}

function copyPreviewUrl() {
    const preview = document.getElementById('fUrlPreview');
    if (!preview || preview.classList.contains('empty')) return;
    navigator.clipboard.writeText(preview.textContent).then(() => {
        showToast('URL copied!');
    });
}

function copyAppUrl(id) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    const url = buildUrl(p.industry, p.company, p.welcome);
    navigator.clipboard.writeText(url).then(() => showToast('URL copied!'));
}

function openAppUrl(id) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    window.open(buildUrl(p.industry, p.company, p.welcome), '_blank');
}

function buildEmailDraft(id) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;

    const url = buildUrl(p.industry, p.company, p.welcome);
    const to  = p.recruiterEmail || p.hiringManagerEmail || '';
    const subject = `Portfolio — ${p.role || p.company} | Joseph Pointer`;

    const intro = p.welcome
        ? p.welcome
        : `I wanted to share my portfolio, prepared with ${p.company || 'your organization'} in mind.`;

    const companyLine = p.company ? ` for ${p.company}` : '';
    const body = [
        intro,
        '',
        `I've put together a portfolio page${companyLine} that I'd love for you to take a look at:`,
        '',
        url,
        '',
        'Joe Pointer'
    ].join('\n');

    const platform = localStorage.getItem('email_platform') || 'outlook_desktop';

    if (platform === 'gmail') {
        const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');
    } else if (platform === 'outlook_web') {
        const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(outlookUrl, '_blank');
    } else {
        const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const a = document.createElement('a');
        a.href = mailto;
        a.click();
    }
}

function copyPreviewUrlAsLink() {
    const preview = document.getElementById('fUrlPreview');
    if (!preview || preview.classList.contains('empty')) return;
    navigator.clipboard.writeText(preview.textContent).then(() => showToast('URL copied — type your link text, select it, press Ctrl+K, paste'));
}

function copyContact(id) {
    const p = getProfiles().find(x => x.id === id);
    if (!p) return;
    const email = p.recruiterEmail || p.hiringManagerEmail;
    if (!email) return;
    navigator.clipboard.writeText(email).then(() => showToast(`Copied: ${email}`));
}

// ── Activity Log ──────────────────────────────────────────────────────────────

function renderLogDisplay() {
    const list = document.getElementById('activityLogList');
    if (!list) return;
    if (currentLog.length === 0) { list.innerHTML = ''; return; }
    const sorted = [...currentLog].sort((a, b) => b.date.localeCompare(a.date));
    list.innerHTML = sorted.map(entry => {
        const sc = STATUS_CONFIG[entry.stage];
        const label = sc ? sc.label : 'Note';
        const color = sc ? sc.color : '#6B7280';
        return `
            <div class="activity-entry">
                <div class="activity-entry-meta">
                    <div class="activity-entry-date">${formatDate(entry.date)}</div>
                    <span style="display:inline-block;padding:0.1rem 0.4rem;border-radius:10px;background:${color}22;color:${color};font-size:0.7rem;font-weight:600">${label}</span>
                </div>
                <div class="activity-entry-text">${escHtml(entry.text)}</div>
                <button class="activity-entry-del" onclick="deleteLogEntry('${entry.id}')" title="Remove entry">✕</button>
            </div>`;
    }).join('');
}

function addLogEntry() {
    const text = document.getElementById('activityText').value.trim();
    if (!text) { showToast('Enter a note before adding'); return; }
    const stage = document.getElementById('activityStage').value;
    currentLog.push({
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4),
        date: new Date().toISOString().slice(0, 10),
        stage,
        text
    });
    document.getElementById('activityText').value = '';
    renderLogDisplay();
    formDirty = true;
}

function deleteLogEntry(entryId) {
    currentLog = currentLog.filter(e => e.id !== entryId);
    renderLogDisplay();
    formDirty = true;
}

function deleteApp(id) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Delete application for ${p.company}?`)) return;
    saveProfiles(profiles.filter(x => x.id !== id));
    renderAppList();
}

// ═══════════════════════════════════════════════════════
//  APPLICATION FORM
// ═══════════════════════════════════════════════════════

function selectIndustry(el) {
    document.querySelectorAll('.template-mini').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
    formSelectedIndustry = el.dataset.ind;
    document.getElementById('formIndustry').value = formSelectedIndustry;
    formDirty = true;
}

function resetForm() {
    document.getElementById('appForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').textContent = 'New Application';
    document.getElementById('formSubmitBtn').textContent = 'Save Application';
    document.querySelectorAll('.template-mini').forEach(m => m.classList.remove('selected'));
    formSelectedIndustry = '';
    document.getElementById('formIndustry').value = '';
    document.getElementById('atsPanel').classList.remove('visible');

    // Set today as applied date default
    document.getElementById('fAppliedDate').value = todayStr();
    // Set follow-up 7 days from now
    document.getElementById('fFollowUp').value = futureDateStr(7);

    // Collapse details section and clear dirty flag
    toggleFormDetails(false);
    formDirty = false;
    currentLog = [];
    renderLogDisplay();
    updateUrlPreview();
}

function editApplication(id) {
    const profiles = getProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;

    document.getElementById('editId').value = id;
    document.getElementById('formTitle').textContent = `Edit — ${p.company}`;
    document.getElementById('formSubmitBtn').textContent = 'Update Application';

    // Populate fields
    document.getElementById('fCompany').value = p.company || '';
    document.getElementById('fRole').value = p.role || '';
    document.getElementById('fStatus').value = p.status || 'applied';
    document.getElementById('fSource').value = p.source || '';
    document.getElementById('fReferredBy').value = p.referredBy || '';
    document.getElementById('fResume').value = p.resumeVersion || 'executive';
    document.getElementById('fAppliedDate').value = p.appliedDate || '';
    document.getElementById('fLastContact').value = p.lastContactDate || '';
    document.getElementById('fFollowUp').value = p.followUpDate || '';
    document.getElementById('fSalaryMin').value = p.salaryMin ? '$' + p.salaryMin.toLocaleString('en-US') : '';
    document.getElementById('fSalaryMax').value = p.salaryMax ? '$' + p.salaryMax.toLocaleString('en-US') : '';
    document.getElementById('fRecruiterName').value = p.recruiterName || '';
    document.getElementById('fRecruiterEmail').value = p.recruiterEmail || '';
    document.getElementById('fHMName').value = p.hiringManagerName || '';
    document.getElementById('fHMEmail').value = p.hiringManagerEmail || '';
    document.getElementById('fWelcome').value = p.welcome || '';
    document.getElementById('fNotes').value = p.notes || '';
    document.getElementById('fJobDesc').value = p.jobDescription || '';

    // Select industry
    formSelectedIndustry = p.industry || '';
    document.getElementById('formIndustry').value = formSelectedIndustry;
    document.querySelectorAll('.template-mini').forEach(m => {
        m.classList.toggle('selected', m.dataset.ind === formSelectedIndustry);
    });

    // Run ATS if job description exists
    if (p.jobDescription) {
        setTimeout(runATS, 100);
    } else {
        document.getElementById('atsPanel').classList.remove('visible');
    }

    // Populate activity log
    currentLog = JSON.parse(JSON.stringify(p.activityLog || []));
    renderLogDisplay();

    // Always expand details when editing a full record, then clear dirty flag
    toggleFormDetails(true);
    formDirty = false;
    updateUrlPreview();

    openFormPanel();
}

function saveApplication(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const profiles = getProfiles();

    const company = document.getElementById('fCompany').value.trim();
    const welcome = document.getElementById('fWelcome').value.trim();
    const generatedUrl = buildUrl(formSelectedIndustry || 'tech', company, welcome);

    const record = {
        id: id || ('app_' + Date.now()),
        company,
        role: document.getElementById('fRole').value.trim(),
        industry: formSelectedIndustry || '',
        status: document.getElementById('fStatus').value,
        source: document.getElementById('fSource').value,
        referredBy: document.getElementById('fReferredBy').value.trim(),
        resumeVersion: document.getElementById('fResume').value,
        appliedDate: document.getElementById('fAppliedDate').value,
        lastContactDate: document.getElementById('fLastContact').value,
        followUpDate: document.getElementById('fFollowUp').value,
        salaryMin: parseSalary(document.getElementById('fSalaryMin').value),
        salaryMax: parseSalary(document.getElementById('fSalaryMax').value),
        recruiterName: document.getElementById('fRecruiterName').value.trim(),
        recruiterEmail: document.getElementById('fRecruiterEmail').value.trim(),
        hiringManagerName: document.getElementById('fHMName').value.trim(),
        hiringManagerEmail: document.getElementById('fHMEmail').value.trim(),
        welcome,
        notes: document.getElementById('fNotes').value.trim(),
        jobDescription: document.getElementById('fJobDesc').value.trim(),
        activityLog: currentLog,
        prepState: id ? (profiles.find(p => p.id === id)?.prepState || null) : null,
        prepRounds: id ? (profiles.find(p => p.id === id)?.prepRounds ?? undefined) : undefined,
        activeRoundId: id ? (profiles.find(p => p.id === id)?.activeRoundId || null) : null,
        url: generatedUrl,
        created: id ? (profiles.find(p => p.id === id)?.created || new Date().toISOString()) : new Date().toISOString(),
        schemaVersion: 5
    };

    if (id) {
        const idx = profiles.findIndex(p => p.id === id);
        if (idx !== -1) profiles[idx] = record;
    } else {
        profiles.push(record);
    }

    saveProfiles(profiles);
    formDirty = false;
    showToast(id ? 'Application updated!' : `Application saved for ${company}!`);
    document.getElementById('editId').value = '';
    closeFormPanel(true); // force close — already saved
}

// ═══════════════════════════════════════════════════════
//  UTILITIES (form helpers, settings, help)
// ═══════════════════════════════════════════════════════

// ── Progressive form disclosure ──────────────────────────────────────────────
function toggleFormDetails(forceOpen) {
    const details = document.getElementById('formDetails');
    const toggle  = document.getElementById('detailsToggle');
    const label   = document.getElementById('detailsToggleLabel');
    const open = (forceOpen !== undefined) ? forceOpen : !details.classList.contains('open');
    details.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    label.textContent = open
        ? '− Hide Details'
        : '+ Dates, Salary, Contacts, Notes & ATS Analysis';
}

// ── Settings modal ───────────────────────────────────────────────────────────
function openSettings() {
    const savedEmail = localStorage.getItem('email_platform') || 'outlook_desktop';
    document.querySelector(`input[name="emailPlatform"][value="${savedEmail}"]`).checked = true;
    const savedEnv = localStorage.getItem('preview_env') || 'production';
    document.querySelector(`input[name="previewEnv"][value="${savedEnv}"]`).checked = true;
    document.getElementById('settingsOverlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    document.getElementById('settingsOverlay').style.display = 'none';
    document.body.style.overflow = '';
}

function closeSettingsOnOverlay(e) {
    if (e.target === document.getElementById('settingsOverlay')) closeSettings();
}

function saveSettings() {
    const platform = document.querySelector('input[name="emailPlatform"]:checked')?.value;
    if (platform) localStorage.setItem('email_platform', platform);
    const env = document.querySelector('input[name="previewEnv"]:checked')?.value;
    if (env) localStorage.setItem('preview_env', env);
    showToast('Settings saved');
    closeSettings();
}

// ── Help modal ───────────────────────────────────────────────────────────────
function openHelp() {
    document.getElementById('helpOverlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeHelp() {
    document.getElementById('helpOverlay').style.display = 'none';
    document.body.style.overflow = '';
}

function closeHelpOnOverlay(e) {
    if (e.target === document.getElementById('helpOverlay')) closeHelp();
}

// ── Form dirty tracking (input/change events) ────────────────────────────────
document.getElementById('appForm').addEventListener('input',  () => { formDirty = true; });
document.getElementById('appForm').addEventListener('change', () => { formDirty = true; });

// ═══════════════════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════════════════

function exportCSV() {
    const profiles = getProfiles();
    if (!profiles.length) { showToast('No applications to export'); return; }

    const headers = [
        'Company', 'Role', 'Status', 'Industry', 'Resume Version',
        'Applied Date', 'Last Contact', 'Follow-up Date',
        'Salary Min', 'Salary Max', 'Source', 'Referred By',
        'Recruiter Name', 'Recruiter Email',
        'Hiring Manager', 'Hiring Manager Email',
        'Notes', 'Activity Log', 'Portfolio URL'
    ];

    const rows = profiles.map(p => [
        p.company || '',
        p.role || '',
        STATUS_CONFIG[p.status]?.label || p.status || '',
        p.industry || '',
        RESUME_LABELS[p.resumeVersion] || p.resumeVersion || '',
        p.appliedDate || '',
        p.lastContactDate || '',
        p.followUpDate || '',
        p.salaryMin ? '$' + p.salaryMin.toLocaleString('en-US') : '',
        p.salaryMax ? '$' + p.salaryMax.toLocaleString('en-US') : '',
        p.source || '',
        p.referredBy || '',
        p.recruiterName || '',
        p.recruiterEmail || '',
        p.hiringManagerName || '',
        p.hiringManagerEmail || '',
        p.notes || '',
        (p.activityLog || []).map(e => `${e.date} [${STATUS_CONFIG[e.stage]?.label || e.stage}] ${e.text}`).join(' | '),
        p.url || buildUrl(p.industry, p.company, p.welcome)
    ]);

    const esc = val => {
        const s = String(val);
        return (s.includes(',') || s.includes('"') || s.includes('\n'))
            ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [headers, ...rows].map(row => row.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `job-search-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${profiles.length} application${profiles.length !== 1 ? 's' : ''} as CSV`);
}

function exportData() {
    const profiles = getProfiles();
    const payload = {
        exportDate: new Date().toISOString(),
        version: 2,
        count: profiles.length,
        applications: profiles
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `job-search-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${profiles.length} application${profiles.length !== 1 ? 's' : ''}`);
}

function importData() {
    document.getElementById('importInput').click();
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data     = JSON.parse(ev.target.result);
            const incoming = Array.isArray(data) ? data : (data.applications || []);

            if (!incoming.length) {
                alert('No applications found in this file.');
                e.target.value = '';
                return;
            }

            const existing = getProfiles();
            let message = `Import ${incoming.length} application(s)?`;
            if (existing.length > 0) {
                message += `\n\nOK = Replace all ${existing.length} existing application(s)\nCancel = Merge (add new records only)`;
            }

            const replace = existing.length === 0 || confirm(message);

            if (replace) {
                saveProfiles(incoming);
                showToast(`Imported ${incoming.length} application${incoming.length !== 1 ? 's' : ''}`);
            } else {
                const existingIds = new Set(existing.map(p => p.id));
                const toAdd = incoming.filter(p => !existingIds.has(p.id));
                saveProfiles([...existing, ...toAdd]);
                showToast(`Merged ${toAdd.length} new application${toAdd.length !== 1 ? 's' : ''}`);
            }

            renderAppList();
        } catch (err) {
            alert('Could not read file. Make sure it is a valid JSON backup.');
        }
        e.target.value = '';
    };
    reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════
//  SAMPLE DATA SEED
// ═══════════════════════════════════════════════════════

function seedSampleData() {
    const existing = getProfiles();
    if (existing.length > 0) {
        if (!confirm(`You already have ${existing.length} application(s). Add sample data anyway?`)) return;
    }

    const now = new Date().toISOString();
    // Helper: date string N days ago or ahead
    const dStr = (offset) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d.toISOString().split('T')[0];
    };

    const samples = [
        {
            // McKinsey: furthest back, moved to phone screen, follow-up overdue
            id: 'sample_mckinsey_' + Date.now(),
            company: 'McKinsey & Company',
            role: 'Senior Manager, Organizational Change & AI Enablement',
            industry: 'consulting',
            status: 'phone',
            source: 'Referral',
            resumeVersion: 'executive',
            appliedDate: dStr(-52),
            lastContactDate: dStr(-35),
            followUpDate: dStr(-18),
            salaryMin: 200000,
            salaryMax: 260000,
            referredBy: 'Former TIAA colleague — Michael Torres',
            recruiterName: 'Sarah Kim',
            recruiterEmail: 'skim@mckinsey.com',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'Prepared for the McKinsey & Company recruiting team. My approach to AI adoption and organizational transformation combines analytical rigor with human-centered design—the same principles that define McKinsey\'s impact model. I don\'t just build strategies; I build the adoption infrastructure that makes them stick.',
            notes: 'Referred by former TIAA colleague. Phone screen went well — Sarah mentioned strong fit for practice area. Follow up on next steps.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=McKinsey+%26+Company',
            created: now,
            schemaVersion: 2
        },
        {
            // Goldman: mid-pipeline, in technical interview stage
            id: 'sample_goldman_' + (Date.now() + 1),
            company: 'Goldman Sachs',
            role: 'Director of AI Adoption & Organizational Change',
            industry: 'finance',
            status: 'technical',
            source: 'LinkedIn',
            resumeVersion: 'executive',
            appliedDate: dStr(-38),
            lastContactDate: dStr(-12),
            followUpDate: dStr(3),
            salaryMin: 220000,
            salaryMax: 280000,
            recruiterName: 'David Park',
            recruiterEmail: 'dpark@gs.com',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'Thank you for reviewing my portfolio, prepared specifically for the Goldman Sachs leadership team. With 25+ years driving enterprise transformation, I bring a track record of turning ambitious AI adoption strategies into measurable results—sustained at scale across Fortune 500 organizations.',
            notes: 'Strong match for their Enterprise AI adoption initiative. Technical panel scheduled — prepare case study walkthrough. Reference connection with former colleague at GS.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=Goldman+Sachs',
            created: now,
            schemaVersion: 2
        },
        {
            // Microsoft: recently applied, awaiting first response
            id: 'sample_microsoft_' + (Date.now() + 2),
            company: 'Microsoft',
            role: 'Director of AI Workforce Transformation',
            industry: 'tech',
            status: 'applied',
            source: 'Company Website',
            resumeVersion: 'technical',
            appliedDate: dStr(-20),
            lastContactDate: '',
            followUpDate: dStr(4),
            salaryMin: 250000,
            salaryMax: 320000,
            recruiterName: '',
            recruiterEmail: '',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'This portfolio was prepared for the Microsoft recruiting team. My 25+ years of enterprise AI adoption experience aligns directly with Microsoft\'s Copilot and AI transformation initiatives—bringing the strategic vision and hands-on execution needed to move organizations from AI awareness to AI fluency at scale.',
            notes: 'Excellent alignment with Copilot adoption programs. Research their recent workforce AI announcements before follow-up.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=Microsoft',
            created: now,
            schemaVersion: 2
        },
        {
            // UHG: newest application, just submitted
            id: 'sample_uhg_' + (Date.now() + 3),
            company: 'UnitedHealth Group',
            role: 'Director of AI-Enabled Learning & Development',
            industry: 'healthcare',
            status: 'applied',
            source: 'LinkedIn',
            resumeVersion: 'executive',
            appliedDate: dStr(-6),
            lastContactDate: '',
            followUpDate: dStr(7),
            salaryMin: 180000,
            salaryMax: 230000,
            recruiterName: '',
            recruiterEmail: '',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'This portfolio was prepared for UnitedHealth Group leadership. My experience driving AI adoption across 16,000+ associates and leading complex enterprise change management aligns directly with UHG\'s digital transformation and workforce strategy priorities.',
            notes: 'Strong healthcare sector alignment. TIAA experience with regulated environments is a differentiator.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=UnitedHealth+Group',
            created: now,
            schemaVersion: 2
        },

        // ── Additional samples for a richer dashboard ──────────────────────

        {   // Amazon — tech — offer (furthest along, anchor of pipeline)
            id: 'sample_amazon_' + (Date.now() + 4),
            company: 'Amazon',
            role: 'Director, AI Adoption & Change Management — AWS',
            industry: 'tech',
            status: 'offer',
            source: 'recruiter',
            resumeVersion: 'technical',
            appliedDate: dStr(-58),
            lastContactDate: dStr(-8),
            followUpDate: dStr(5),
            salaryMin: 290000,
            salaryMax: 380000,
            referredBy: '',
            recruiterName: 'Priya Nair',
            recruiterEmail: 'pnair@amazon.com',
            hiringManagerName: 'James Whitfield',
            hiringManagerEmail: '',
            welcome: 'This portfolio was prepared for the Amazon Web Services team. Driving AI adoption at AWS scale requires the same enterprise-wide change management discipline I\'ve applied across 16,000+ associates — translated into cloud-native, data-driven execution.',
            notes: 'Verbal offer received. Reviewing comp package — base is strong, RSU vesting schedule needs negotiation. Compare against Goldman if that progresses.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=Amazon',
            created: now,
            schemaVersion: 2
        },
        {   // JPMorgan Chase — finance — phone screen
            id: 'sample_jpmorgan_' + (Date.now() + 5),
            company: 'JPMorgan Chase',
            role: 'Executive Director, AI Transformation & Workforce Strategy',
            industry: 'finance',
            status: 'phone',
            source: 'linkedin',
            resumeVersion: 'finance',
            appliedDate: dStr(-42),
            lastContactDate: dStr(-28),
            followUpDate: dStr(-7),
            salaryMin: 240000,
            salaryMax: 310000,
            referredBy: '',
            recruiterName: 'Marcus Reid',
            recruiterEmail: 'marcus.reid@jpmorgan.com',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'Prepared for the JPMorgan Chase team. My experience leading AI adoption in highly regulated financial environments — with rigorous governance and measurable business outcomes — aligns directly with JPMC\'s AI transformation priorities.',
            notes: 'Phone screen scheduled. Strong fit with their Consumer & Community Banking AI rollout. Research Jamie Dimon\'s recent AI strategy commentary.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=JPMorgan+Chase',
            created: now,
            schemaVersion: 2
        },
        {   // Accenture — consulting — technical interview
            id: 'sample_accenture_' + (Date.now() + 6),
            company: 'Accenture',
            role: 'Managing Director, AI & Change Management Practice',
            industry: 'consulting',
            status: 'technical',
            source: 'company',
            resumeVersion: 'executive',
            appliedDate: dStr(-33),
            lastContactDate: dStr(-10),
            followUpDate: dStr(2),
            salaryMin: 210000,
            salaryMax: 275000,
            referredBy: 'Lisa Park — Accenture Federal practice lead',
            recruiterName: 'Tom Garrett',
            recruiterEmail: 'tom.garrett@accenture.com',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'Prepared for the Accenture leadership team. My track record of building AI adoption frameworks that actually stick — at enterprise scale, across diverse business units — is exactly what consulting clients need from a practice lead.',
            notes: 'Case study panel next week. Prepare the TIAA AI adoption story with metrics. Lisa Park referral is a differentiator.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=Accenture',
            created: now,
            schemaVersion: 2
        },
        {   // Cigna — healthcare — no longer active (role closed)
            id: 'sample_cigna_' + (Date.now() + 7),
            company: 'Cigna Group',
            role: 'VP, Digital Transformation & AI Readiness',
            industry: 'healthcare',
            status: 'rejected',
            source: 'linkedin',
            resumeVersion: 'healthcare',
            appliedDate: dStr(-55),
            lastContactDate: dStr(-40),
            followUpDate: '',
            salaryMin: 190000,
            salaryMax: 250000,
            referredBy: '',
            recruiterName: 'Dana Mills',
            recruiterEmail: '',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: '',
            notes: 'Role was eliminated during restructuring — not a reflection of candidacy. Dana confirmed position is on hold indefinitely. Revisit Q3.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=Cigna+Group',
            created: now,
            schemaVersion: 2
        },
        {   // CVS Health — healthcare — phone screen
            id: 'sample_cvs_' + (Date.now() + 8),
            company: 'CVS Health',
            role: 'Director, AI Enablement & Learning Strategy',
            industry: 'healthcare',
            status: 'phone',
            source: 'company',
            resumeVersion: 'healthcare',
            appliedDate: dStr(-22),
            lastContactDate: dStr(-14),
            followUpDate: dStr(1),
            salaryMin: 175000,
            salaryMax: 225000,
            referredBy: '',
            recruiterName: 'Angela Torres',
            recruiterEmail: 'atorres@cvshealth.com',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'This portfolio was prepared for CVS Health leadership. Enabling AI literacy across a 300,000+ associate workforce requires more than technology — it demands a disciplined change strategy, and that\'s where my experience is strongest.',
            notes: 'Intro call went well. Angela mentioned they\'re comparing internal vs. external candidates. Emphasis on scale and regulated environments in follow-up.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=CVS+Health',
            created: now,
            schemaVersion: 2
        },
        {   // IBM — tech — applied, awaiting response
            id: 'sample_ibm_' + (Date.now() + 9),
            company: 'IBM',
            role: 'Director, AI Adoption & Organizational Transformation',
            industry: 'tech',
            status: 'applied',
            source: 'linkedin',
            resumeVersion: 'technical',
            appliedDate: dStr(-14),
            lastContactDate: '',
            followUpDate: dStr(6),
            salaryMin: 220000,
            salaryMax: 280000,
            referredBy: '',
            recruiterName: '',
            recruiterEmail: '',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'Prepared for the IBM team. IBM\'s Consulting and watsonx AI platforms represent exactly the kind of enterprise-scale transformation I\'ve driven throughout my career — turning complex technology rollouts into measurable workforce capability.',
            notes: 'Applied via LinkedIn. Strong alignment with watsonx adoption team. Follow up if no response by end of week.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=IBM',
            created: now,
            schemaVersion: 2
        },
        {   // Meta — tech — no longer active (AI team restructured)
            id: 'sample_meta_' + (Date.now() + 10),
            company: 'Meta',
            role: 'Director, AI Workforce Transformation',
            industry: 'tech',
            status: 'rejected',
            source: 'company',
            resumeVersion: 'technical',
            appliedDate: dStr(-48),
            lastContactDate: dStr(-42),
            followUpDate: '',
            salaryMin: 300000,
            salaryMax: 400000,
            referredBy: '',
            recruiterName: 'Chris Wallace',
            recruiterEmail: '',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: '',
            notes: 'Role paused due to AI org restructuring. Chris said they may re-open in 6 months. Keep warm — connect on LinkedIn.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=Meta',
            created: now,
            schemaVersion: 2
        },
        {   // Elevance Health — healthcare — just applied
            id: 'sample_elevance_' + (Date.now() + 11),
            company: 'Elevance Health',
            role: 'VP, AI Strategy & Workforce Enablement',
            industry: 'healthcare',
            status: 'applied',
            source: 'linkedin',
            resumeVersion: 'healthcare',
            appliedDate: dStr(-3),
            lastContactDate: '',
            followUpDate: dStr(9),
            salaryMin: 200000,
            salaryMax: 260000,
            referredBy: '',
            recruiterName: '',
            recruiterEmail: '',
            hiringManagerName: '',
            hiringManagerEmail: '',
            welcome: 'Prepared for Elevance Health leadership. My background bridging AI technology and workforce transformation in regulated environments maps directly to Elevance\'s mission of whole-health, data-driven care delivery.',
            notes: 'Brand new application. Strong culture fit signal from their recent digital health announcements. Follow up in 10 days.',
            jobDescription: '',
            url: 'https://joepointer.com/?company=Elevance+Health',
            created: now,
            schemaVersion: 2
        }
    ];

    saveProfiles([...existing, ...samples]);
    showToast(`${samples.length} sample applications added!`);
    renderAppList();
    renderDashboard();
}

// INIT calls are in admin.html after all modules load
