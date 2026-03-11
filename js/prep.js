// ═══════════════════════════════════════════════════════
//  PREP — interview prep panel (Claude API integration)
//  Depends on: utils.js, storage.js, tracking.js
// ═══════════════════════════════════════════════════════

// ── Prep panel state globals ──────────────────────────────────────────────────
let prepPanelOpen = false;
let currentPrepAppId = null;
let prepActiveTab = 'ask';
let interviewModeActive = false;
let darkModeActive = false;
let combinedModeActive = false;
let currentRoundId = null;

// ── Answer timer state (only one timer can run at a time) ─────────────────────
let _timerInterval = null;
let _timerQId = null;
let _timerSeconds = 0;

// ── Global ESC key handler (needs all panels to be loaded) ────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (prepPanelOpen) closePrepPanel();
        else if (formPanelOpen) closeFormPanel();
        else if (document.getElementById('settingsOverlay').style.display === 'block') closeSettings();
        else closeHelp();
    }
    // Press / to jump to search when prep panel is open
    if (e.key === '/' && prepPanelOpen) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
            e.preventDefault();
            document.getElementById('prepSearch')?.focus();
        }
    }
});

// ═══════════════════════════════════════════════════════
//  PREP PANEL — open / close
// ═══════════════════════════════════════════════════════

function openPrepPanel(id, startLive = false) {
    // Migrate legacy prepState → prepRounds on first open
    migrateLegacyPrepState(id);

    const profiles = getProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;

    currentPrepAppId = id;
    currentRoundId   = p.activeRoundId || null;

    document.getElementById('prepCompany').textContent = p.company || '';
    document.getElementById('prepRole').textContent    = p.role || '';
    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.applied;
    document.getElementById('prepStageBadge').innerHTML =
        `<span class="status-badge ${sc.cls}">${sc.label}</span>`;

    // Show or hide missing-JD warning
    const existingWarn = document.getElementById('prepNoJdWarning');
    if (existingWarn) existingWarn.remove();
    if (!p.jobDescription || !p.jobDescription.trim()) {
        const warn = document.createElement('div');
        warn.id = 'prepNoJdWarning';
        warn.className = 'prep-no-jd-warning';
        warn.innerHTML = `⚠️ No job description on file — <a href="#" onclick="closePrepPanel(); editApplication('${id}'); openFormPanel(); return false;">add one to this application</a> for more specific questions.`;
        document.getElementById('btnGenerate').insertAdjacentElement('beforebegin', warn);
    }

    renderRoundsBar(id);
    updateApiKeyUI();

    const state = loadPrepState(id);
    if (state && state.questions && state.questions.length > 0) {
        renderPrepResults(state.questions);  // also resets to Ask tab
        document.getElementById('prepResults').classList.add('visible');
        document.getElementById('prepFooter').style.display = 'flex';
        loadDebriefNotes(id);
        // Show round name + generated date in meta banner
        const activeRound = (p.prepRounds || []).find(r => r.roundId === p.activeRoundId);
        const roundLabel  = activeRound?.roundName || state.stage || 'Round 1';
        const metaEl = document.getElementById('prepGenMeta');
        if (metaEl && state.generatedAt) {
            metaEl.innerHTML = `<div class="prep-gen-meta-dot"></div>Generated ${formatDate(state.generatedAt)} · ${escHtml(roundLabel)}`;
        }
    } else {
        document.getElementById('prepResults').classList.remove('visible');
        document.getElementById('prepFooter').style.display = 'none';
        const metaEl = document.getElementById('prepGenMeta');
        if (metaEl) metaEl.innerHTML = '';
        switchPrepTab('ask');  // reset tab even when no results yet
    }

    document.getElementById('prepLoading').classList.remove('visible');
    document.getElementById('prepPanel').classList.add('open');
    document.body.style.overflow = 'hidden';
    prepPanelOpen = true;

    // Go Live shortcut: activate Live Mode after panel slides in
    if (startLive) {
        const liveState = loadPrepState(id);
        if (liveState?.questions?.length) {
            setTimeout(() => toggleInterviewMode(), 320);
        } else {
            showToast('Generate prep questions first — then use ▶ Live');
        }
    }
}

function closePrepPanel() {
    if (interviewModeActive) {
        interviewModeActive = false;
        document.getElementById('prepPanel').classList.remove('interview-mode');
        const btn = document.getElementById('btnInterviewMode');
        if (btn) { btn.classList.remove('active'); btn.textContent = '🎯 Live Mode'; }
    }
    // Reset dark mode
    if (darkModeActive) {
        darkModeActive = false;
        document.getElementById('prepPanel').classList.remove('dark-mode');
        const darkBtn = document.getElementById('btnDarkMode');
        if (darkBtn) { darkBtn.classList.remove('active', 'visible'); darkBtn.textContent = '🌙 Dark'; }
    }
    // Stop any running answer timer
    if (_timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
        _timerQId = null;
        _timerSeconds = 0;
    }
    // Reset combined mode
    if (combinedModeActive) {
        combinedModeActive = false;
        document.getElementById('prepResults')?.classList.remove('combined-view');
    }
    // Clear search, debrief, and round creator
    const searchEl = document.getElementById('prepSearch');
    if (searchEl) searchEl.value = '';
    clearPrepSearch();
    clearTimeout(_debriefSaveTimer);
    cancelNewRound();
    currentRoundId = null;
    document.getElementById('prepPanel').classList.remove('open');
    document.body.style.overflow = '';
    prepPanelOpen = false;
    currentPrepAppId = null;
}

// ═══════════════════════════════════════════════════════
//  API KEY MANAGEMENT
// ═══════════════════════════════════════════════════════

function updateApiKeyUI() {
    const key = localStorage.getItem('anthropic_api_key') || '';
    const section   = document.getElementById('prepApiSection');
    const inputRow  = document.getElementById('prepApiInputRow');
    const statusRow = document.getElementById('prepApiStatusRow');
    const btn       = document.getElementById('btnGenerate');
    if (key) {
        inputRow.style.display  = 'none';
        statusRow.style.display = '';   // let CSS handle flex
        section?.classList.add('key-set');
        btn.disabled = false;
    } else {
        inputRow.style.display  = 'block';
        statusRow.style.display = 'none';
        section?.classList.remove('key-set');
        btn.disabled = true;
    }
}

function showApiKeyInput() {
    document.getElementById('prepApiInputRow').style.display  = 'block';
    document.getElementById('prepApiStatusRow').style.display = 'none';
    document.getElementById('prepApiKeyInput').value = '';
    document.getElementById('prepApiKeyInput').focus();
}

function saveApiKey() {
    const val = document.getElementById('prepApiKeyInput').value.trim();
    if (!val) { showToast('Enter your API key first'); return; }
    if (!val.startsWith('sk-ant-')) { showToast('Key should start with sk-ant-…', 4000); return; }
    localStorage.setItem('anthropic_api_key', val);
    document.getElementById('prepApiKeyInput').value = '';
    updateApiKeyUI();
    showToast('API key saved');
}

function removeApiKey() {
    if (!confirm('Remove your saved API key? You can add it again anytime.')) return;
    localStorage.removeItem('anthropic_api_key');
    updateApiKeyUI();
    showToast('API key removed');
}

// ── Story Bank access ─────────────────────────────────────────────────────────

function getStoryBank() {
    try { return JSON.parse(localStorage.getItem('storyBank') || '[]'); }
    catch(e) { return []; }
}

// ═══════════════════════════════════════════════════════
//  QUESTION GENERATION (Claude API)
// ═══════════════════════════════════════════════════════

async function generatePrepQuestions() {
    const apiKey = localStorage.getItem('anthropic_api_key');
    if (!apiKey) { showToast('Save your API key first'); return; }
    if (!currentPrepAppId) return;

    // Ensure there's an active round to save into
    ensureActiveRound(currentPrepAppId);

    const profiles = getProfiles();
    const p = profiles.find(x => x.id === currentPrepAppId);
    if (!p) return;

    const stageNames = { phone: 'Phone Screen', technical: 'Technical Interview', final: 'Final Round' };
    const stageName  = stageNames[p.status] || p.status;

    const btn = document.getElementById('btnGenerate');
    btn.disabled = true;
    btn.textContent = 'Generating…';
    document.getElementById('prepLoading').classList.add('visible');
    document.getElementById('prepResults').classList.remove('visible');
    document.getElementById('prepFooter').style.display = 'none';

    const contextLines = [
        `Company: ${p.company || 'Unknown'}`,
        `Role: ${p.role || 'Unknown'}`,
        `Industry: ${p.industry || 'Unknown'}`,
        `Interview Stage: ${stageName}`,
        p.jobDescription ? `Job Description:\n${p.jobDescription.slice(0, 3000)}` : '',
        p.notes          ? `Application Notes:\n${p.notes.slice(0, 500)}` : '',
        p.recruiterName      ? `Recruiter: ${p.recruiterName}` : '',
        p.hiringManagerName  ? `Hiring Manager: ${p.hiringManagerName}` : '',
    ].filter(Boolean).join('\n');

    // Build compact story bank context for Claude
    const stories = getStoryBank();
    const storyContext = stories.length > 0
        ? `\n\nSTORY BANK — Joe's real career achievements. For each prep question, pick the single best matching story.\n` +
          stories.map(s =>
            `[${s.id}] "${s.title}" (${s.year||''}) tags:${(s.tags||[]).join(',')}\n` +
            `  Achievement: ${(s.bullet||'').slice(0,130)}\n` +
            `  Action: ${(s.star?.action||'').slice(0,110)}\n` +
            `  Result: ${(s.star?.result||'').slice(0,110)}`
          ).join('\n')
        : '';

    const hasStories = stories.length > 0;

    const systemPrompt = `You are an expert executive interview coach helping a senior leader (Director/VP of AI Adoption) prepare for job interviews. Generate targeted, intelligent questions based on the application context provided.${storyContext}

Return ONLY valid JSON — no markdown, no prose, no code fences. Shape:
{"ask":[{"id":"a1","category":"About the Role","text":"..."},{"id":"a2","category":"Company Strategy","text":"..."},{"id":"a3","category":"About the Team","text":"..."},{"id":"a4","category":"AI & Digital Transformation","text":"..."},{"id":"a5","category":"Company Strategy","text":"..."},{"id":"a6","category":"About the Role","text":"..."},{"id":"a7","category":"About the Team","text":"..."},{"id":"a8","category":"Industry Specific","text":"..."}],"prep":[{"id":"p1","category":"Leadership","text":"Prepare to answer: ..."${hasStories?',"storyMatch":{"storyId":"story_001","element":"action","coachingNote":"1 sentence on what to emphasize"}':''}},{"id":"p2","category":"Change Management","text":"Prepare to answer: ..."${hasStories?',"storyMatch":{"storyId":"story_002","element":"result","coachingNote":"..."}':''}},{"id":"p3","category":"AI Adoption","text":"Prepare to answer: ..."},{"id":"p4","category":"Stakeholder Influence","text":"Prepare to answer: ..."},{"id":"p5","category":"Business Impact","text":"Prepare to answer: ..."},{"id":"p6","category":"Leadership","text":"Prepare to answer: ..."},{"id":"p7","category":"AI Adoption","text":"Prepare to answer: ..."},{"id":"p8","category":"Change Management","text":"Prepare to answer: ..."}]}

Rules:
- Make every question specific to the company, role, stage (${stageName}), and industry.
- Industry-specific "ask" category should reflect the actual industry (e.g. "Healthcare Compliance", "Risk & Regulation").${hasStories ? `
- For each prep question, add "storyMatch": {"storyId": one of the story IDs above, "element": "situation"|"task"|"action"|"result"|"bullet", "coachingNote": one sentence on which part of that story to lead with and why}. Choose the story that best fits the question. If no story fits, omit storyMatch.` : ''}`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: 'user', content: `Generate interview prep for:\n\n${contextLines}` }]
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error ${response.status}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        // Extract only the JSON object — Claude sometimes adds prose before/after it
        const jsonStart = text.indexOf('{');
        const jsonEnd   = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found in API response');
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

        const questions = [
            ...(parsed.ask  || []).map(q => ({ ...q, type: 'ask',  checked: false, confidence: 0, practiceCount: 0, pinned: false, askedInInterview: false, storyMatch: null })),
            ...(parsed.prep || []).map(q => ({ ...q, type: 'prep', checked: false, confidence: 0, practiceCount: 0, pinned: false, askedInInterview: false, storyMatch: q.storyMatch || null }))
        ];

        // Preserve state from previous generation (exact text match)
        // and carry forward pinned categories across stage transitions (category name match)
        const existing = loadPrepState(currentPrepAppId);
        const prevPinnedCategories = existing?.pinnedCategories || [];
        if (existing && existing.questions) {
            const prevByText = {};
            existing.questions.forEach(q => { prevByText[q.text] = q; });
            questions.forEach(q => {
                const prev = prevByText[q.text];
                if (prev) {
                    // Exact match — restore everything
                    q.checked           = prev.checked           || false;
                    q.confidence        = prev.confidence        || 0;
                    q.practiceCount     = prev.practiceCount     || 0;
                    q.pinned            = prev.pinned            || false;
                    q.askedInInterview  = prev.askedInInterview  || false;
                } else if (prevPinnedCategories.includes(q.category)) {
                    // Stage carry-forward: question text changed but category was previously pinned
                    q.pinned = true;
                }
            });
        }
        // Recompute pinnedCategories for the new set
        const newPinnedCategories = [...new Set(questions.filter(q => q.pinned).map(q => q.category))];

        savePrepState(currentPrepAppId, {
            questions,
            generatedAt: new Date().toISOString().split('T')[0],
            stage: p.status,
            pinnedCategories: newPinnedCategories,
            debriefNotes: existing?.debriefNotes || { overall: '', takeaways: '' }
        });

        renderPrepResults(questions);
        loadDebriefNotes(currentPrepAppId);
        document.getElementById('prepResults').classList.add('visible');
        document.getElementById('prepFooter').style.display = 'flex';
        const freshP2 = getProfiles().find(x => x.id === currentPrepAppId);
        const activeRound2 = (freshP2?.prepRounds || []).find(r => r.roundId === freshP2?.activeRoundId);
        const roundLabel2 = activeRound2?.roundName || stageName;
        const metaEl = document.getElementById('prepGenMeta');
        if (metaEl) metaEl.innerHTML = `<div class="prep-gen-meta-dot"></div>Generated ${formatDate(new Date().toISOString().split('T')[0])} · ${escHtml(roundLabel2)}`;
        renderRoundsBar(currentPrepAppId);
        showToast('Interview prep generated!');

    } catch (err) {
        console.error('Prep generation error:', err);

        // "Failed to fetch" = CORS block from file:// origin — show fallback
        const isCors = err.message.toLowerCase().includes('failed to fetch') ||
                       err.message.toLowerCase().includes('networkerror') ||
                       err.message.toLowerCase().includes('cors');

        if (isCors) {
            // Build a plain-text prompt the user can paste into claude.ai
            const fallbackPrompt = `You are an expert executive interview coach. I have a job interview coming up and need personalized prep questions.\n\n${contextLines}\n\nPlease provide:\n1. 8 questions I should ASK the interviewer (grouped by: About the Role, About the Team, Company Strategy, AI & Digital Transformation, and one industry-specific category)\n2. 8 behavioral/situational questions I should PREPARE TO ANSWER at a Director/VP level (Leadership, Change Management, AI Adoption, Stakeholder Influence, Business Impact)\n\nMake every question specific to the company, role, and interview stage above.`;
            navigator.clipboard.writeText(fallbackPrompt).catch(() => {});

            // Show inline fallback message in results area
            document.getElementById('prepResults').innerHTML = `
                <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:1rem">
                    <div style="font-weight:700;color:#92400E;margin-bottom:0.5rem">⚠️ Direct API calls are blocked when opening from a local file</div>
                    <div style="font-size:0.875rem;color:#78350F;line-height:1.6">
                        The browser prevents <code>file://</code> pages from making API requests.<br>
                        <strong>Your personalized prompt has been copied to clipboard.</strong>
                    </div>
                    <div style="margin-top:1rem;display:flex;gap:0.75rem;flex-wrap:wrap">
                        <a href="https://claude.ai" target="_blank"
                           style="background:#0A1E3D;color:white;padding:0.5rem 1rem;border-radius:8px;font-size:0.85rem;font-weight:600;text-decoration:none">
                            Open Claude.ai →
                        </a>
                        <button onclick="copyFallbackPrompt()" class="btn-utility" style="font-size:0.85rem">📋 Copy Prompt Again</button>
                    </div>
                    <div style="margin-top:1rem;font-size:0.8rem;color:#92400E">
                        <strong>Permanent fix:</strong> Drag this folder to
                        <a href="https://netlify.com/drop" target="_blank" style="color:#1D4ED8">netlify.com/drop</a>
                        for a free URL where the API works — and you get mobile access too.
                    </div>
                </div>`;
            document.getElementById('prepResults').classList.add('visible');
            // Store prompt for re-copy
            window._lastFallbackPrompt = fallbackPrompt;
        } else {
            showToast(`API error: ${err.message}`, 6000);
        }
    } finally {
        document.getElementById('prepLoading').classList.remove('visible');
        btn.disabled = false;
        btn.textContent = '✨ Generate Interview Prep';
    }
}

function copyFallbackPrompt() {
    const prompt = window._lastFallbackPrompt;
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => showToast('Prompt copied!'));
}

// ═══════════════════════════════════════════════════════
//  RENDER & UI
// ═══════════════════════════════════════════════════════

function renderPrepResults(questions) {
    function buildSection(list, containerId, showStoryMatch) {
        const container = document.getElementById(containerId);
        const groups = [];
        const seen   = {};
        list.forEach(q => {
            if (!seen[q.category]) { seen[q.category] = true; groups.push({ category: q.category, items: [] }); }
            groups.find(g => g.category === q.category).items.push(q);
        });
        const confColors = ['#EF4444', '#F59E0B', '#10B981'];
        const confLabels = ['Low confidence', 'Getting there', 'Solid'];
        container.innerHTML = groups.map((g, i) => `
            <div class="prep-cat-group" id="cat-${containerId}-${i}">
                <div class="prep-category-label">${escHtml(g.category)}</div>
                ${g.items.map(q => {
                    const conf = q.confidence || 0;
                    const dotsHtml = [1,2,3].map(level => {
                        const filled = level <= conf;
                        const style  = filled ? `background:${confColors[level-1]};border-color:${confColors[level-1]};` : '';
                        return `<button class="conf-dot conf-${level}${filled ? ' filled' : ''}" style="${style}" onclick="event.stopPropagation();setConfidence('${q.id}',${conf===level?0:level})" title="${confLabels[level-1]}"></button>`;
                    }).join('');
                    const confLabelText = conf > 0 ? `<span class="conf-label">${confLabels[conf-1]}</span>` : '';
                    const practiced = (q.practiceCount || 0) > 0;
                    const practiceHtml = `<button class="prep-practice-btn${practiced ? ' practiced' : ''}" id="pp-${q.id}" onclick="event.stopPropagation();markPracticed('${q.id}')" title="Click to log a practice run">${practiced ? `Practiced ${q.practiceCount}x` : '+ Practice'}</button>`;
                    const pinTitle = q.pinned ? 'Unpin question' : 'Pin for quick access in Live Mode';
                    return `
                    <div class="prep-question${q.checked ? ' checked' : ''}${q.pinned ? ' has-pin' : ''}" id="pq-${q.id}" data-pinned="${q.pinned ? '1' : '0'}" onclick="togglePrepQuestion('${q.id}')">
                        <input type="checkbox" ${q.checked ? 'checked' : ''} onclick="event.stopPropagation(); togglePrepQuestion('${q.id}')">
                        <span class="prep-question-text">${escHtml(q.text)}</span>
                        <button class="prep-pin-btn${q.pinned ? ' pinned' : ''}" onclick="event.stopPropagation();togglePinnedQuestion('${q.id}')" title="${pinTitle}">★</button>
                    </div>
                    <div class="prep-question-meta" id="pm-${q.id}">
                        <div class="conf-dots">${dotsHtml}</div>
                        ${confLabelText}
                        ${practiceHtml}
                    </div>
                    <div class="prep-live-actions" id="pla-${q.id}">
                        <button class="prep-timer-btn" id="ptimer-${q.id}" onclick="event.stopPropagation();toggleAnswerTimer('${q.id}')" title="Time your answer — tap to start/stop">⏱ Start</button>
                        <button class="prep-asked-btn${q.askedInInterview ? ' asked' : ''}" id="pasked-${q.id}" onclick="event.stopPropagation();toggleAskedInInterview('${q.id}')">${q.askedInInterview ? '✓ They Asked' : '+ They Asked'}</button>
                    </div>
                    ${showStoryMatch && q.storyMatch ? `
                    <button class="story-match-btn" id="smb-${q.id}" onclick="toggleStoryMatch('${q.id}')">📖 Story to Tell</button>
                    <div class="story-match-panel" id="smp-${q.id}"></div>` : ''}`;
                }).join('')}
            </div>`
        ).join('');

        // Update count badge
        const countEl = document.getElementById(containerId === 'prepListAsk' ? 'ptabCount-ask' : 'ptabCount-prep');
        if (countEl) countEl.textContent = list.length;
    }

    buildSection(questions.filter(q => q.type === 'ask'),  'prepListAsk',  false);
    buildSection(questions.filter(q => q.type === 'prep'), 'prepListPrep', true);

    // Reset to Ask tab and populate category chips
    switchPrepTab('ask');
}

function switchPrepTab(tab) {
    prepActiveTab = tab;
    const results = document.getElementById('prepResults');

    document.querySelectorAll('.prep-inner-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('ptab-' + tab)?.classList.add('active');

    if (tab === 'combined') {
        combinedModeActive = true;
        // Show both tab panes simultaneously
        document.querySelectorAll('.prep-tab-pane').forEach(p => p.classList.add('active'));
        if (results) results.classList.add('combined-view');
        // Restore all inline styles that a prior filter may have set
        ['prepListAsk', 'prepListPrep'].forEach(listId => {
            document.getElementById(listId)?.querySelectorAll('.prep-cat-group').forEach(g => {
                g.style.display = '';
                g.querySelectorAll('[style]').forEach(el => el.style.display = '');
            });
        });
    } else {
        combinedModeActive = false;
        if (results) results.classList.remove('combined-view');
        document.querySelectorAll('.prep-tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById('prepTab' + (tab === 'ask' ? 'Ask' : 'Prep')).classList.add('active');
    }

    updatePrepCatJumps(tab);  // rebuilds chips; "All" starts active
    // Reapply any active text search
    const q = document.getElementById('prepSearch')?.value || '';
    if (q) filterPrepQuestions(q);
}

function updatePrepCatJumps(tab) {
    const bar = document.getElementById('prepCatJumps');
    const allChip    = `<button class="prep-cat-jump active" data-tab="${tab}" onclick="filterByCategoryChip(null,this)">All</button>`;
    const pinnedChip = interviewModeActive
        ? `<button class="prep-cat-jump pinned-chip" data-tab="${tab}" onclick="filterByCategoryChip('__pinned__',this)">⭐ Pinned</button>`
        : '';

    let groups;
    if (tab === 'combined') {
        // Collect groups from both lists in display order (Ask then Prep)
        groups = [
            ...document.querySelectorAll('#prepListAsk .prep-cat-group'),
            ...document.querySelectorAll('#prepListPrep .prep-cat-group')
        ];
    } else {
        const listId = tab === 'ask' ? 'prepListAsk' : 'prepListPrep';
        groups = [...document.querySelectorAll('#' + listId + ' .prep-cat-group')];
    }

    const catChips = groups.map(el => {
        const label = el.querySelector('.prep-category-label')?.textContent || '';
        const id    = el.id;
        return `<button class="prep-cat-jump" data-tab="${tab}" data-group-id="${id}" onclick="filterByCategoryChip('${label.replace(/'/g, "\\'")}',this)">${label}</button>`;
    }).join('');

    bar.innerHTML = allChip + pinnedChip + catChips;
}

function filterByCategoryChip(category, chipEl) {
    const tab = chipEl.dataset.tab || prepActiveTab;
    // Combined mode operates across both lists; single-tab mode operates on one
    const listIds = tab === 'combined'
        ? ['prepListAsk', 'prepListPrep']
        : [tab === 'ask' ? 'prepListAsk' : 'prepListPrep'];

    // Highlight the clicked chip
    document.querySelectorAll('.prep-cat-jump').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');

    if (interviewModeActive) {
        listIds.forEach(listId => {
            const pane = document.getElementById(listId);
            if (!pane) return;

            if (category === '__pinned__') {
                // Pinned filter: show all groups, hide non-pinned questions within them
                pane.querySelectorAll('.prep-cat-group').forEach(group => {
                    group.style.display = '';
                    group.querySelectorAll('.prep-question, .prep-question-meta, .prep-live-actions, .story-match-btn, .story-match-panel')
                        .forEach(el => el.style.display = '');
                    group.querySelectorAll('.prep-question').forEach(qEl => {
                        const hide = qEl.dataset.pinned !== '1';
                        qEl.style.display = hide ? 'none' : '';
                        let sib = qEl.nextElementSibling;
                        while (sib && !sib.classList.contains('prep-question') && !sib.classList.contains('prep-category-label')) {
                            sib.style.display = hide ? 'none' : '';
                            sib = sib.nextElementSibling;
                        }
                    });
                    const anyPinned = group.querySelectorAll('.prep-question[data-pinned="1"]').length > 0;
                    if (!anyPinned) group.style.display = 'none';
                });
            } else if (!category) {
                // All: restore everything
                pane.querySelectorAll('.prep-cat-group').forEach(group => {
                    group.style.display = '';
                    group.querySelectorAll('[style]').forEach(el => el.style.display = '');
                });
            } else {
                // Category filter: hide groups that don't match, restore inline styles for matching
                pane.querySelectorAll('.prep-cat-group').forEach(group => {
                    const groupLabel = group.querySelector('.prep-category-label')?.textContent || '';
                    const show = groupLabel === category;
                    group.style.display = show ? '' : 'none';
                    if (show) group.querySelectorAll('[style]').forEach(el => el.style.display = '');
                });
            }
        });

        // Scroll to top and reapply search
        document.getElementById('prepResults')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const searchVal = document.getElementById('prepSearch')?.value || '';
        if (searchVal) filterPrepQuestions(searchVal);
    } else {
        // Normal mode: scroll to the category anchor
        if (category && category !== '__pinned__' && chipEl.dataset.groupId) {
            document.getElementById(chipEl.dataset.groupId)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function toggleStoryMatch(qId) {
    const btn   = document.getElementById('smb-' + qId);
    const panel = document.getElementById('smp-' + qId);
    if (!btn || !panel) return;

    const isOpen = panel.classList.contains('open');
    if (isOpen) {
        panel.classList.remove('open');
        btn.classList.remove('open');
        btn.textContent = '📖 Story to Tell';
        return;
    }

    // Load story match data from saved state
    const state = loadPrepState(currentPrepAppId);
    if (!state) return;
    const q = state.questions.find(x => x.id === qId);
    if (!q || !q.storyMatch) return;

    const { storyId, element, coachingNote } = q.storyMatch;
    const stories = getStoryBank();
    const story   = stories.find(s => s.id === storyId);

    const elementLabels = {
        situation: 'Situation — set the scene',
        task:      'Task — your specific challenge',
        action:    'Action — what you did',
        result:    'Result — what it achieved',
        bullet:    'Key Achievement'
    };

    if (!story) {
        panel.innerHTML = `<div style="font-size:0.82rem;color:#92400E;">
            Story not found. Open <strong>storybank.html</strong> first to seed your story data.</div>`;
    } else {
        const elementText = element === 'bullet'
            ? (story.bullet || '')
            : (story.star?.[element] || story.bullet || '');
        panel.innerHTML = `
            <div class="story-match-title" style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;">
                <span>📖 ${escHtml(story.title)}${story.year ? ' · ' + story.year : ''}</span>
                <button onclick="openStoryBank()" style="background:none;border:none;color:#B45309;font-size:0.75rem;font-weight:600;cursor:pointer;white-space:nowrap;padding:0;font-family:inherit;text-decoration:underline;flex-shrink:0;">Edit story →</button>
            </div>
            <div class="story-match-element-label">${elementLabels[element] || element}</div>
            <div class="story-match-element-text">${escHtml(elementText)}</div>
            ${coachingNote ? `<div class="story-match-coaching"><strong>Coach's note:</strong> ${escHtml(coachingNote)}</div>` : ''}
        `;
    }

    panel.classList.add('open');
    btn.classList.add('open');
    btn.textContent = '📖 Story to Tell ▲';
}

// ── Question state management ─────────────────────────────────────────────────

function togglePrepQuestion(qId) {
    if (!currentPrepAppId) return;
    const state = loadPrepState(currentPrepAppId);
    if (!state) return;
    const q = state.questions.find(x => x.id === qId);
    if (!q) return;
    q.checked = !q.checked;
    savePrepState(currentPrepAppId, state);
    const el = document.getElementById('pq-' + qId);
    if (el) {
        el.classList.toggle('checked', q.checked);
        const cb = el.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = q.checked;
    }
}

function savePrepState(appId, state) {
    const profiles = getProfiles();
    const idx = profiles.findIndex(p => p.id === appId);
    if (idx === -1) return;
    const p = profiles[idx];
    if (p.prepRounds !== undefined && p.activeRoundId) {
        const roundIdx = p.prepRounds.findIndex(r => r.roundId === p.activeRoundId);
        if (roundIdx !== -1) {
            // Merge — preserves roundId and roundName
            p.prepRounds[roundIdx] = { ...p.prepRounds[roundIdx], ...state };
        } else {
            p.prepRounds.push({ roundId: p.activeRoundId, roundName: 'Round 1', ...state });
        }
    } else {
        // Legacy fallback (pre-migration profiles)
        p.prepState = state;
    }
    saveProfiles(profiles);
}

function loadPrepState(appId) {
    const p = getProfiles().find(x => x.id === appId);
    if (!p) return null;
    // Multi-round format
    if (p.prepRounds !== undefined && p.activeRoundId) {
        return p.prepRounds.find(r => r.roundId === p.activeRoundId) || null;
    }
    // Legacy single-round format
    return p.prepState || null;
}

// ═══════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════

function filterPrepQuestions(query) {
    const q = query.trim().toLowerCase();
    const clearBtn = document.getElementById('prepSearchClear');
    if (clearBtn) clearBtn.style.display = q ? 'inline' : 'none';

    ['prepListAsk', 'prepListPrep'].forEach(paneId => {
        const pane = document.getElementById(paneId);
        if (!pane) return;
        pane.querySelectorAll('.prep-cat-group').forEach(group => {
            // Don't touch groups hidden by category chip filter
            if (group.style.display === 'none') return;
            group.querySelectorAll('.prep-question').forEach(el => {
                // Don't touch questions hidden by pin filter
                if (el.style.display === 'none') return;
                const text = el.querySelector('.prep-question-text')?.textContent.toLowerCase() || '';
                const hide = q ? !text.includes(q) : false;
                el.classList.toggle('search-hidden', hide);
                // Hide all siblings (meta, live-actions, story-match) in sync
                let sib = el.nextElementSibling;
                while (sib && !sib.classList.contains('prep-question') && !sib.classList.contains('prep-category-label')) {
                    sib.classList.toggle('search-hidden', hide);
                    sib = sib.nextElementSibling;
                }
            });
        });
    });
}

function clearPrepSearch() {
    const searchEl = document.getElementById('prepSearch');
    if (searchEl) searchEl.value = '';
    const clearBtn = document.getElementById('prepSearchClear');
    if (clearBtn) clearBtn.style.display = 'none';
    ['prepListAsk', 'prepListPrep'].forEach(paneId => {
        const pane = document.getElementById(paneId);
        if (!pane) return;
        pane.querySelectorAll('.search-hidden').forEach(el => el.classList.remove('search-hidden'));
    });
}

// ═══════════════════════════════════════════════════════
//  CONFIDENCE + PRACTICE COUNT
// ═══════════════════════════════════════════════════════

function setConfidence(qId, level) {
    if (!currentPrepAppId) return;
    const state = loadPrepState(currentPrepAppId);
    if (!state) return;
    const q = state.questions.find(x => x.id === qId);
    if (!q) return;
    q.confidence = level;
    savePrepState(currentPrepAppId, state);

    // Update dots in-place
    const metaEl = document.getElementById('pm-' + qId);
    if (!metaEl) return;
    const confColors = ['#EF4444', '#F59E0B', '#10B981'];
    const confLabels = ['Low confidence', 'Getting there', 'Solid'];
    metaEl.querySelectorAll('.conf-dot').forEach((dot, i) => {
        const dotLevel = i + 1;
        const filled = dotLevel <= level;
        dot.classList.toggle('filled', filled);
        dot.classList.toggle(`conf-${dotLevel}`, true);
        dot.style.background      = filled ? confColors[i] : '';
        dot.style.borderColor     = filled ? confColors[i] : '';
        dot.onclick = (e) => { e.stopPropagation(); setConfidence(qId, level === dotLevel ? 0 : dotLevel); };
    });
    let labelEl = metaEl.querySelector('.conf-label');
    if (!labelEl) {
        labelEl = document.createElement('span');
        labelEl.className = 'conf-label';
        metaEl.querySelector('.conf-dots').after(labelEl);
    }
    labelEl.textContent = level > 0 ? confLabels[level - 1] : '';
}

function markPracticed(qId) {
    if (!currentPrepAppId) return;
    const state = loadPrepState(currentPrepAppId);
    if (!state) return;
    const q = state.questions.find(x => x.id === qId);
    if (!q) return;
    q.practiceCount = (q.practiceCount || 0) + 1;
    savePrepState(currentPrepAppId, state);

    // Update button in-place
    const btn = document.getElementById('pp-' + qId);
    if (btn) {
        btn.textContent = `Practiced ${q.practiceCount}x`;
        btn.classList.add('practiced');
    }
    showToast(`Logged — practiced ${q.practiceCount} time${q.practiceCount !== 1 ? 's' : ''}`);
}

// ═══════════════════════════════════════════════════════
//  INTERVIEW / LIVE MODE
// ═══════════════════════════════════════════════════════

function toggleInterviewMode() {
    interviewModeActive = !interviewModeActive;
    const panel   = document.getElementById('prepPanel');
    const btn     = document.getElementById('btnInterviewMode');
    const darkBtn = document.getElementById('btnDarkMode');
    panel.classList.toggle('interview-mode', interviewModeActive);
    btn.classList.toggle('active', interviewModeActive);
    btn.textContent = interviewModeActive ? '✕ Exit Live Mode' : '🎯 Live Mode';
    if (darkBtn) darkBtn.classList.toggle('visible', interviewModeActive);

    if (interviewModeActive) {
        updatePrepCatJumps(prepActiveTab);  // rebuild chips to add Pinned chip
        setTimeout(() => document.getElementById('prepSearch')?.focus(), 50);
        showToast('Tap a chip to filter · ⭐ pin key questions · ⏱ time answers');
    } else {
        // Reset dark mode when exiting Live Mode
        if (darkModeActive) {
            darkModeActive = false;
            panel.classList.remove('dark-mode');
            if (darkBtn) { darkBtn.classList.remove('active'); darkBtn.textContent = '🌙 Dark'; }
        }
        // Stop any running answer timer
        if (_timerInterval) {
            clearInterval(_timerInterval);
            _timerInterval = null;
            if (_timerQId) {
                const timerBtn = document.getElementById('ptimer-' + _timerQId);
                if (timerBtn) { timerBtn.textContent = '⏱ Start'; timerBtn.className = 'prep-timer-btn'; }
            }
            _timerQId = null;
            _timerSeconds = 0;
        }
        // Reset combined mode if it was active
        if (combinedModeActive) {
            combinedModeActive = false;
            document.getElementById('prepResults')?.classList.remove('combined-view');
            // Snap back to Ask tab (standard exit state)
            document.querySelectorAll('.prep-tab-pane').forEach(p => p.classList.remove('active'));
            document.getElementById('prepTabAsk')?.classList.add('active');
            document.querySelectorAll('.prep-inner-tab').forEach(b => b.classList.remove('active'));
            document.getElementById('ptab-ask')?.classList.add('active');
            prepActiveTab = 'ask';
        }
        // Restore all groups and question-level inline styles, rebuild chips without Pinned chip
        ['prepListAsk', 'prepListPrep'].forEach(paneId => {
            const pane = document.getElementById(paneId);
            pane?.querySelectorAll('.prep-cat-group').forEach(g => {
                g.style.display = '';
                g.querySelectorAll('[style]').forEach(el => el.style.display = '');
            });
        });
        updatePrepCatJumps(prepActiveTab);
    }
}

// ═══════════════════════════════════════════════════════
//  PIN · TIMER · ASKED · DARK MODE
// ═══════════════════════════════════════════════════════

function togglePinnedQuestion(qId) {
    if (!currentPrepAppId) return;
    const state = loadPrepState(currentPrepAppId);
    if (!state) return;
    const q = state.questions.find(x => x.id === qId);
    if (!q) return;
    q.pinned = !q.pinned;
    // Keep pinnedCategories in sync — used to carry pins forward across stage regenerations
    state.pinnedCategories = [...new Set(state.questions.filter(x => x.pinned).map(x => x.category))];
    savePrepState(currentPrepAppId, state);

    // Update DOM in-place
    const qEl = document.getElementById('pq-' + qId);
    if (qEl) {
        qEl.dataset.pinned = q.pinned ? '1' : '0';
        qEl.classList.toggle('has-pin', q.pinned);
        const pinBtn = qEl.querySelector('.prep-pin-btn');
        if (pinBtn) {
            pinBtn.classList.toggle('pinned', q.pinned);
            pinBtn.title = q.pinned ? 'Unpin question' : 'Pin for quick access in Live Mode';
        }
    }
    showToast(q.pinned ? '⭐ Pinned — tap the Pinned chip in Live Mode' : 'Unpinned');
}

function toggleAnswerTimer(qId) {
    const btn = document.getElementById('ptimer-' + qId);
    if (!btn) return;

    if (_timerQId === qId && _timerInterval) {
        // Stop and reset this timer
        clearInterval(_timerInterval);
        _timerInterval = null;
        _timerQId = null;
        _timerSeconds = 0;
        btn.textContent = '⏱ Start';
        btn.className = 'prep-timer-btn';
    } else {
        // Stop any other running timer first
        if (_timerInterval) {
            clearInterval(_timerInterval);
            const prevBtn = document.getElementById('ptimer-' + _timerQId);
            if (prevBtn) { prevBtn.textContent = '⏱ Start'; prevBtn.className = 'prep-timer-btn'; }
        }
        // Start this timer
        _timerQId = qId;
        _timerSeconds = 0;
        btn.className = 'prep-timer-btn running';
        btn.textContent = '⏱ 0:00';
        _timerInterval = setInterval(() => {
            _timerSeconds++;
            const m = Math.floor(_timerSeconds / 60);
            const s = _timerSeconds % 60;
            btn.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
            if (_timerSeconds >= 120)     btn.className = 'prep-timer-btn danger';
            else if (_timerSeconds >= 90) btn.className = 'prep-timer-btn warn';
            else                          btn.className = 'prep-timer-btn running';
        }, 1000);
    }
}

function toggleAskedInInterview(qId) {
    if (!currentPrepAppId) return;
    const state = loadPrepState(currentPrepAppId);
    if (!state) return;
    const q = state.questions.find(x => x.id === qId);
    if (!q) return;
    q.askedInInterview = !q.askedInInterview;
    savePrepState(currentPrepAppId, state);

    // Update button in-place
    const btn = document.getElementById('pasked-' + qId);
    if (btn) {
        btn.classList.toggle('asked', q.askedInInterview);
        btn.textContent = q.askedInInterview ? '✓ They Asked' : '+ They Asked';
    }
    if (q.askedInInterview) showToast('Marked — keep going!');
}

function toggleDarkMode() {
    darkModeActive = !darkModeActive;
    const panel  = document.getElementById('prepPanel');
    const darkBtn = document.getElementById('btnDarkMode');
    panel.classList.toggle('dark-mode', darkModeActive);
    if (darkBtn) {
        darkBtn.classList.toggle('active', darkModeActive);
        darkBtn.textContent = darkModeActive ? '☀️ Light' : '🌙 Dark';
    }
}

// ═══════════════════════════════════════════════════════
//  POST-INTERVIEW DEBRIEF NOTES
// ═══════════════════════════════════════════════════════

let _debriefSaveTimer = null;

function scheduleDebriefSave() {
    const savedEl = document.getElementById('debriefSaved');
    if (savedEl) savedEl.textContent = 'Saving…';
    clearTimeout(_debriefSaveTimer);
    _debriefSaveTimer = setTimeout(() => {
        if (!currentPrepAppId) return;
        const state = loadPrepState(currentPrepAppId);
        if (!state) return;
        state.debriefNotes = {
            overall:   document.getElementById('debriefOverall')?.value   || '',
            takeaways: document.getElementById('debriefTakeaways')?.value || ''
        };
        savePrepState(currentPrepAppId, state);
        if (savedEl) { savedEl.textContent = 'Saved'; setTimeout(() => { if (savedEl) savedEl.textContent = ''; }, 2000); }
    }, 600);
}

function loadDebriefNotes(appId) {
    const state = loadPrepState(appId);
    const notes = state?.debriefNotes || { overall: '', takeaways: '' };
    const overallEl    = document.getElementById('debriefOverall');
    const takeawaysEl  = document.getElementById('debriefTakeaways');
    const savedEl      = document.getElementById('debriefSaved');
    if (overallEl)   overallEl.value   = notes.overall   || '';
    if (takeawaysEl) takeawaysEl.value = notes.takeaways || '';
    if (savedEl)     savedEl.textContent = '';
}

function copySelectedQuestions() {
    const state = currentPrepAppId ? loadPrepState(currentPrepAppId) : null;
    if (!state || !state.questions) { showToast('No questions to copy'); return; }
    const checked = state.questions.filter(q => q.checked);
    if (checked.length === 0) { showToast('Check at least one question first'); return; }
    const text = checked.map(q => `[${q.type === 'ask' ? 'Ask' : 'Prep'}] ${q.text}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() =>
        showToast(`${checked.length} question${checked.length !== 1 ? 's' : ''} copied!`)
    );
}

// ═══════════════════════════════════════════════════════
//  MULTI-ROUND MANAGEMENT
// ═══════════════════════════════════════════════════════

// Default round name based on application status
const _stageLabelDefault = { phone: 'Phone Screen', technical: 'Technical Interview', final: 'Final Round' };

/**
 * Lazy migration: convert legacy single prepState → prepRounds[] on first panel open.
 * Safe to call multiple times — skips if already migrated.
 */
function migrateLegacyPrepState(appId) {
    const profiles = getProfiles();
    const idx = profiles.findIndex(p => p.id === appId);
    if (idx === -1) return;
    const p = profiles[idx];
    if (p.prepRounds !== undefined) return; // already migrated

    const roundName = _stageLabelDefault[p.status] || 'Round 1';
    if (p.prepState && p.prepState.questions && p.prepState.questions.length > 0) {
        const roundId = 'r_' + Date.now();
        profiles[idx].prepRounds = [{ roundId, roundName, ...p.prepState }];
        profiles[idx].activeRoundId = roundId;
    } else {
        profiles[idx].prepRounds  = [];
        profiles[idx].activeRoundId = null;
    }
    saveProfiles(profiles);
}

/**
 * Ensure an active round exists before generating questions.
 * Creates one with a default name if none is set yet.
 */
function ensureActiveRound(appId) {
    const profiles = getProfiles();
    const idx = profiles.findIndex(p => p.id === appId);
    if (idx === -1) return;
    const p = profiles[idx];
    if (p.prepRounds && p.activeRoundId && p.prepRounds.find(r => r.roundId === p.activeRoundId)) {
        return; // valid round already active
    }
    const roundId   = 'r_' + Date.now();
    const roundName = _stageLabelDefault[p.status] || 'Round 1';
    if (!profiles[idx].prepRounds) profiles[idx].prepRounds = [];
    profiles[idx].prepRounds.push({
        roundId, roundName,
        generatedAt: null, stage: p.status,
        questions: [], pinnedCategories: [],
        debriefNotes: { overall: '', takeaways: '' }
    });
    profiles[idx].activeRoundId = roundId;
    saveProfiles(profiles);
    renderRoundsBar(appId);
}

/** Render the round selector tabs into #prepRoundsBar */
function renderRoundsBar(appId) {
    const bar = document.getElementById('prepRoundsBar');
    if (!bar) return;
    const p = getProfiles().find(x => x.id === appId);
    if (!p) return;

    const rounds   = p.prepRounds || [];
    const activeId = p.activeRoundId;

    const tabsHtml = rounds.map(r => {
        const hasQ = r.questions && r.questions.length > 0;
        return `<button class="prep-round-tab${r.roundId === activeId ? ' active' : ''}"
                        id="rtab-${r.roundId}" onclick="switchRound('${r.roundId}')">
                    <span class="round-tab-name">${escHtml(r.roundName)}</span>${hasQ ? ' ✓' : ''}
                    <span class="round-rename-btn" onclick="event.stopPropagation();startRenameRound('${r.roundId}')" title="Rename">✎</span>
                </button>`;
    }).join('');

    bar.innerHTML = tabsHtml + `<button class="prep-rounds-add" onclick="addPrepRound()">+ New Round</button>`;
}

/** Switch the active round and re-render prep results */
function switchRound(roundId) {
    if (!currentPrepAppId) return;
    const profiles = getProfiles();
    const idx = profiles.findIndex(p => p.id === currentPrepAppId);
    if (idx === -1) return;

    profiles[idx].activeRoundId = roundId;
    saveProfiles(profiles);
    currentRoundId = roundId;

    renderRoundsBar(currentPrepAppId);
    cancelNewRound(); // hide creator if open

    const state = loadPrepState(currentPrepAppId);
    if (state && state.questions && state.questions.length > 0) {
        renderPrepResults(state.questions);
        document.getElementById('prepResults').classList.add('visible');
        document.getElementById('prepFooter').style.display = 'flex';
        loadDebriefNotes(currentPrepAppId);
        const freshP = getProfiles().find(x => x.id === currentPrepAppId);
        const round  = (freshP?.prepRounds || []).find(r => r.roundId === roundId);
        const metaEl = document.getElementById('prepGenMeta');
        if (metaEl && state.generatedAt) {
            metaEl.innerHTML = `<div class="prep-gen-meta-dot"></div>Generated ${formatDate(state.generatedAt)} · ${escHtml(round?.roundName || '')}`;
        }
    } else {
        document.getElementById('prepResults').classList.remove('visible');
        document.getElementById('prepFooter').style.display = 'none';
        const metaEl = document.getElementById('prepGenMeta');
        if (metaEl) metaEl.innerHTML = '';
        switchPrepTab('ask');
        loadDebriefNotes(currentPrepAppId);
    }
    updateApiKeyUI();
}

/** Show the inline round creator */
function addPrepRound() {
    const creator = document.getElementById('prepRoundCreator');
    if (creator) creator.style.display = 'block';
    // Pre-select chip matching current app status
    const p = getProfiles().find(x => x.id === currentPrepAppId);
    const defaultName = _stageLabelDefault[p?.status] || '';
    const input = document.getElementById('newRoundName');
    if (input) { input.value = defaultName; }
    document.querySelectorAll('.round-name-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.textContent === defaultName);
    });
    if (input) input.focus();
}

/** Update text input when a quick-pick chip is clicked */
function selectRoundChip(el, name) {
    document.querySelectorAll('.round-name-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    const input = document.getElementById('newRoundName');
    if (input) { input.value = name; input.focus(); }
}

/** Cancel and hide the round creator */
function cancelNewRound() {
    const creator = document.getElementById('prepRoundCreator');
    if (creator) creator.style.display = 'none';
    const input = document.getElementById('newRoundName');
    if (input) input.value = '';
    document.querySelectorAll('.round-name-chip').forEach(c => c.classList.remove('selected'));
}

/** Create the new round from the creator form */
function confirmNewRound() {
    const nameInput = document.getElementById('newRoundName');
    const name = (nameInput?.value || '').trim();
    if (!name) { nameInput?.focus(); showToast('Enter a name for this round'); return; }

    const profiles = getProfiles();
    const idx = profiles.findIndex(p => p.id === currentPrepAppId);
    if (idx === -1) return;

    const roundId = 'r_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newRound = {
        roundId, roundName: name,
        generatedAt: null, stage: profiles[idx].status,
        questions: [], pinnedCategories: [],
        debriefNotes: { overall: '', takeaways: '' }
    };
    if (!profiles[idx].prepRounds) profiles[idx].prepRounds = [];
    profiles[idx].prepRounds.push(newRound);
    profiles[idx].activeRoundId = roundId;
    saveProfiles(profiles);
    currentRoundId = roundId;

    cancelNewRound();
    renderRoundsBar(currentPrepAppId);

    // Show empty slate for the new round
    document.getElementById('prepResults').classList.remove('visible');
    document.getElementById('prepFooter').style.display = 'none';
    const metaEl = document.getElementById('prepGenMeta');
    if (metaEl) metaEl.innerHTML = '';
    switchPrepTab('ask');
    loadDebriefNotes(currentPrepAppId);
    updateApiKeyUI();

    showToast(`"${name}" created — generate questions to start`);
}

/** Start inline rename of a round tab */
function startRenameRound(roundId) {
    const tab = document.getElementById('rtab-' + roundId);
    if (!tab) return;
    const nameSpan = tab.querySelector('.round-tab-name');
    if (!nameSpan) return;

    const currentName = nameSpan.textContent.replace(/ ✓$/, '').trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = 50;
    input.className = 'round-tab-inline-input';
    input.style.cssText = 'font:inherit;font-size:0.8rem;color:#1D4ED8;border:none;background:none;outline:1px solid #93C5FD;border-radius:3px;padding:0 2px;width:' + Math.max(70, currentName.length * 8) + 'px;';
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
        const newName = input.value.trim() || currentName;
        saveRoundRename(roundId, newName);
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { input.value = currentName; commit(); }
    });
}

/** Persist a round rename and re-render the tabs */
function saveRoundRename(roundId, name) {
    const profiles = getProfiles();
    const idx = profiles.findIndex(p => p.id === currentPrepAppId);
    if (idx === -1) return;
    const roundIdx = (profiles[idx].prepRounds || []).findIndex(r => r.roundId === roundId);
    if (roundIdx === -1) return;
    profiles[idx].prepRounds[roundIdx].roundName = name;
    saveProfiles(profiles);
    renderRoundsBar(currentPrepAppId);
    showToast(`Renamed to "${name}"`);
}
