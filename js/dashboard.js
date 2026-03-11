// ═══════════════════════════════════════════════════════
//  DASHBOARD — filters, pie charts, main dashboard render
//  Depends on: utils.js, storage.js
// ═══════════════════════════════════════════════════════

// ── Dashboard filter functions (called from pie slice clicks) ─────────────────

function filterByStatus(status) {
    currentIndustryFilter = '';
    currentFilter = status;
    document.querySelectorAll('.dash-card').forEach(c => c.classList.remove('filter-active'));
    switchTab('tracker');
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === status);
    });
}

function filterByIndustry(industry) {
    currentFilter = 'all';
    currentIndustryFilter = industry;
    switchTab('tracker');
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });
}

function clearIndustryFilter() {
    currentIndustryFilter = '';
    renderAppList();
}

// ── SVG Pie chart helpers ─────────────────────────────────────────────────────

function makePieChart(slices, onClickFn) {
    const nonEmpty = slices.filter(s => s.count > 0);
    const total = nonEmpty.reduce((sum, s) => sum + s.count, 0);

    if (total === 0) {
        return '<svg viewBox="0 0 160 160" width="130" height="130"><circle cx="80" cy="80" r="70" fill="#f1f5f9"/><text x="80" y="80" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-size="12">No data</text></svg>';
    }

    const cx = 80, cy = 80, r = 70;

    if (nonEmpty.length === 1) {
        const s = nonEmpty[0];
        return `<svg viewBox="0 0 160 160" width="130" height="130" style="flex-shrink:0"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}" stroke="white" stroke-width="2" style="cursor:pointer" onclick="${onClickFn}('${s.id}')" /><text x="${cx}" y="${cx}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="13" font-weight="700" style="pointer-events:none">100%</text></svg>`;
    }

    let angle = -Math.PI / 2;
    const paths = nonEmpty.map(s => {
        const sweep   = (s.count / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        angle += sweep;
        const x2 = cx + r * Math.cos(angle);
        const y2 = cy + r * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        const mid   = angle - sweep / 2;
        const lx    = cx + r * 0.62 * Math.cos(mid);
        const ly    = cy + r * 0.62 * Math.sin(mid);
        const pct   = Math.round((s.count / total) * 100);
        const label = pct >= 8 ? `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="11" font-weight="700" style="pointer-events:none">${pct}%</text>` : '';
        return `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${s.color}" stroke="white" stroke-width="2" style="cursor:pointer;transition:opacity 0.15s" onmouseover="this.style.opacity='0.75'" onmouseout="this.style.opacity='1'" onclick="${onClickFn}('${s.id}')" title="${s.label}: ${s.count} (${pct}%)" />${label}`;
    }).join('');

    return `<svg viewBox="0 0 160 160" width="130" height="130" style="flex-shrink:0">${paths}</svg>`;
}

function makeLegend(slices, total, onClickFn) {
    return slices.filter(s => s.count > 0).map(s => {
        const pct = Math.round((s.count / total) * 100);
        return `<div onclick="${onClickFn}('${s.id}')" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;cursor:pointer;padding:0.2rem 0.4rem;border-radius:6px;transition:background 0.15s" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'"><div style="width:10px;height:10px;border-radius:2px;background:${s.color};flex-shrink:0"></div><span style="font-size:0.78rem;font-weight:600;color:#475569;flex:1">${s.label}</span><span style="font-size:0.78rem;color:#64748b">${s.count}</span></div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD RENDER
// ═══════════════════════════════════════════════════════

function renderDashboard() {
    const el  = document.getElementById('tab-dashboard');
    const all = getProfiles();

    if (all.length === 0) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No applications yet. Add your first application to see your dashboard.</p>
            </div>`;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Summary stats ──
    const total        = all.length;
    const pipeline     = all.filter(p => ['phone','technical','final'].includes(p.status)).length;
    const offers       = all.filter(p => p.status === 'offer').length;
    const responded    = all.filter(p => ['phone','technical','final','offer'].includes(p.status)).length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    // ── Pipeline pie data ──
    const statusOrder = ['applied','phone','technical','final','offer','rejected'];
    const statusCounts = {};
    statusOrder.forEach(s => statusCounts[s] = 0);
    all.forEach(p => { if (p.status in statusCounts) statusCounts[p.status]++; });
    const pipelineSlices = statusOrder.map(s => ({
        id: s, label: STATUS_CONFIG[s].label,
        count: statusCounts[s], color: STATUS_CONFIG[s].color
    }));

    // ── Industry pie data ──
    const indMeta = {
        finance:     { label: 'Finance',     color: '#1a365d' },
        tech:        { label: 'Tech',         color: '#3B82F6' },
        consulting:  { label: 'Consulting',   color: '#d97706' },
        healthcare:  { label: 'Healthcare',   color: '#00A3AD' },
        other:       { label: 'Other',        color: '#94a3b8' },
    };
    const indCounts = {};
    all.forEach(p => { const k = p.industry || 'other'; indCounts[k] = (indCounts[k] || 0) + 1; });
    const industrySlices = Object.entries(indCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([ind, cnt]) => ({
            id: ind, label: (indMeta[ind] || indMeta.other).label,
            count: cnt, color: (indMeta[ind] || indMeta.other).color
        }));

    // ── Win rate benchmark ──
    const benchmarkStatus = responseRate >= 20
        ? { label: 'Above average', color: '#065F46', bg: '#ECFDF5', icon: '✓' }
        : responseRate >= 10
        ? { label: 'On track', color: '#92400E', bg: '#FFFBEB', icon: '◎' }
        : { label: 'Below average', color: '#991B1B', bg: '#FEF2F2', icon: '↗' };
    const benchmarkNote = total < 5 ? ' (small sample)' : '';

    // ── Overdue follow-ups ──
    const overdueList = all
        .filter(p => p.followUpDate && new Date(p.followUpDate + 'T00:00:00') < today && !['offer','rejected'].includes(p.status))
        .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

    const overdueHtml = overdueList.length > 0
        ? overdueList.map(p => {
            const days = Math.floor((today - new Date(p.followUpDate + 'T00:00:00')) / 86400000);
            return `
                <div class="overdue-row" onclick="editApplication('${p.id}')">
                    <div>
                        <div class="overdue-company">${escHtml(p.company)}</div>
                        <div class="overdue-meta">${escHtml(p.role || '')} &middot; ${days} day${days !== 1 ? 's' : ''} overdue</div>
                    </div>
                    <span style="color:#DC2626;font-size:0.85rem;flex-shrink:0;">View →</span>
                </div>`;
        }).join('')
        : '<p style="color:#10B981;font-size:0.875rem;font-weight:600;">✓ No overdue follow-ups</p>';

    el.innerHTML = `
        <div class="dashboard-cards">
            <div class="dash-card" onclick="filterApps('all','dashCardTotal'); switchTab('tracker');" title="Show all applications">
                <div class="dash-card-num">${total}</div>
                <div class="dash-card-label">Total Applied</div>
            </div>
            <div class="dash-card" style="border-color:#8B5CF6" onclick="filterApps('pipeline','dashCardPipeline'); switchTab('tracker');" title="Show applications in active pipeline">
                <div class="dash-card-num" style="color:#6D28D9">${pipeline}</div>
                <div class="dash-card-label">In Pipeline</div>
            </div>
            <div class="dash-card" style="border-color:#10B981" onclick="filterApps('offer','dashCardOffers'); switchTab('tracker');" title="Show offers">
                <div class="dash-card-num" style="color:#065F46">${offers}</div>
                <div class="dash-card-label">Offers</div>
            </div>
            <div class="stat-highlight">
                <div class="stat-highlight-num">${responseRate}%</div>
                <div class="stat-highlight-label">Response Rate</div>
            </div>
        </div>

        <p style="font-size:0.75rem;color:#6B7280;margin-bottom:1rem;margin-top:-0.5rem">Click any card, slice, or legend item to filter the Applications tab.</p>

        <div class="dash-two-col">
            <div class="dash-section">
                <div class="dash-section-title">Pipeline Breakdown</div>
                <div style="display:flex;align-items:center;gap:1rem">
                    ${makePieChart(pipelineSlices, 'filterByStatus')}
                    <div>${makeLegend(pipelineSlices, total, 'filterByStatus')}</div>
                </div>
            </div>
            <div class="dash-section">
                <div class="dash-section-title">By Industry Template</div>
                <div style="display:flex;align-items:center;gap:1rem">
                    ${makePieChart(industrySlices, 'filterByIndustry')}
                    <div>${makeLegend(industrySlices, total, 'filterByIndustry')}</div>
                </div>
            </div>
        </div>

        <div class="bench-section">
            <div class="bench-row">
                <div class="bench-stat">
                    <span class="bench-label">Your response rate</span>
                    <span class="bench-val">${responseRate}%</span>
                </div>
                <div class="bench-divider">vs.</div>
                <div class="bench-stat">
                    <span class="bench-label">Director / VP avg</span>
                    <span class="bench-val">12–20%</span>
                </div>
                <div class="bench-badge" style="background:${benchmarkStatus.bg};color:${benchmarkStatus.color}">
                    ${benchmarkStatus.icon} ${benchmarkStatus.label}${benchmarkNote}
                </div>
            </div>
            <p class="bench-context">A 10–20% response rate is typical for senior leadership roles. Targeted, personalized outreach consistently outperforms high-volume applications.</p>
        </div>

        <div class="dash-section">
            <div class="dash-section-title">Follow-up Alerts${overdueList.length > 0 ? ` (${overdueList.length} overdue)` : ''}</div>
            ${overdueHtml}
        </div>
    `;
}
