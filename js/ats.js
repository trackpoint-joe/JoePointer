// ═══════════════════════════════════════════════════════
//  ATS — resume recommendation + phrase matching engine
//  Depends on: utils.js, storage.js
// ═══════════════════════════════════════════════════════

// Maps industry-specific ATS categories → resume version
const CATEGORY_RESUME_MAP = {
    'Healthcare':         'healthcare',
    'Finance & Banking':  'finance',
    'Technology & Cloud': 'technical',
    'AI & Technology':    'technical',
    'Energy & Utility':   'energy',
    'Consulting & Advisory': 'consulting',
};

const RESUME_LABELS = {
    executive:      'Full Resume — Default',
    technical:      'Full Resume — Tech',
    energy:         'Full Resume — Energy / Utility',
    healthcare:     'Full Resume — Healthcare',
    finance:        'Full Resume — Finance',
    consulting:     'Full Resume — Consulting',
    'human-agency': 'Tailored — Human Agency',
    deltek:         'Tailored — Deltek',
    schwab:         'Tailored — Schwab',
    'charles-schwab': 'Tailored — Schwab',
    'tri-state':    'Tailored — Tri-State',
};

function recommendResume(categoryResults) {
    // Score each industry-specific category by total phrases found in the JD
    let bestResume = 'executive'; // default — most versatile
    let bestCount  = 0;
    let bestCategory = null;

    categoryResults.forEach(r => {
        const resume = CATEGORY_RESUME_MAP[r.category];
        if (resume) {
            const totalInJD = r.matched.length + r.gaps.length;
            if (totalInJD > bestCount) {
                bestCount    = totalInJD;
                bestResume   = resume;
                bestCategory = r.category;
            }
        }
    });

    return { resume: bestResume, category: bestCategory, count: bestCount };
}

function displayResumeRecommendation(rec) {
    const el          = document.getElementById('atsResumeRec');
    const currentVal  = document.getElementById('fResume').value;
    const recLabel    = RESUME_LABELS[rec.resume];

    el.innerHTML = '';
    el.className  = 'ats-resume-rec';

    if (currentVal === rec.resume) {
        el.classList.add('is-match');
        el.innerHTML = `<span class="rec-match-text">✓ Resume selection (${recLabel}) matches this JD</span>`;
    } else {
        el.classList.add('is-suggest');
        el.innerHTML = `
            <span class="rec-suggest-text">📄 Recommended: <strong>${recLabel}</strong></span>
            <button class="btn-rec-apply" onclick="applyResumeRecommendation('${rec.resume}')">Apply</button>
        `;
    }

    el.style.display = 'flex';
}

function applyResumeRecommendation(version) {
    document.getElementById('fResume').value = version;
    displayResumeRecommendation({ resume: version });
    showToast(`Resume set to ${RESUME_LABELS[version]}`);
}

function matchPhrases(jdText) {
    const jd = jdText.toLowerCase();
    const categoryResults = [];

    MASTER_PHRASES.forEach(cat => {
        const matched = [];
        const gaps    = [];

        cat.phrases.forEach(phrase => {
            if (jd.includes(phrase)) {
                if (RESUME_PHRASES.has(phrase)) {
                    matched.push(phrase);
                } else {
                    gaps.push(phrase);
                }
            }
        });

        if (matched.length > 0 || gaps.length > 0) {
            categoryResults.push({ category: cat.category, matched, gaps });
        }
    });

    const totalMatched = categoryResults.reduce((s, r) => s + r.matched.length, 0);
    const totalInJD    = categoryResults.reduce((s, r) => s + r.matched.length + r.gaps.length, 0);
    const score        = totalInJD > 0 ? Math.round((totalMatched / totalInJD) * 100) : 0;

    return { categoryResults, score, totalMatched, totalInJD };
}

function runATS() {
    const jd = document.getElementById('fJobDesc').value;
    if (!jd.trim()) { alert('Please paste a job description first.'); return; }

    const { categoryResults, score, totalMatched, totalInJD } = matchPhrases(jd);

    // Score display
    document.getElementById('atsScoreNum').textContent = score + '%';
    document.getElementById('atsBar').style.width = score + '%';
    document.getElementById('atsMatchCount').textContent =
        totalInJD > 0 ? `${totalMatched} of ${totalInJD} relevant terms matched` : 'No recognized terms found';

    // Resume recommendation (always run, even if no JD terms found)
    const recommendation = recommendResume(categoryResults);
    displayResumeRecommendation(recommendation);

    if (totalInJD === 0) {
        document.getElementById('atsMatched').innerHTML =
            '<span style="color:#6B7280;font-size:0.8rem;">No recognized terms found — try a different job description or paste more of the posting.</span>';
        document.getElementById('atsGapLabel').style.display = 'none';
        document.getElementById('atsGaps').innerHTML = '';
        document.getElementById('atsPanel').classList.add('visible');
        return;
    }

    // Build category-grouped matched results
    let matchedHtml = '';
    let gapsHtml    = '';

    categoryResults.forEach(r => {
        if (r.matched.length > 0) {
            matchedHtml += `<div class="ats-cat-label">${r.category}</div>`;
            matchedHtml += r.matched.map(k => `<span class="ats-kw match">${k}</span>`).join('');
        }
        if (r.gaps.length > 0) {
            gapsHtml += `<div class="ats-cat-label">${r.category}</div>`;
            gapsHtml += r.gaps.map(k => `<span class="ats-kw gap">${k}</span>`).join('');
        }
    });

    document.getElementById('atsMatched').innerHTML = matchedHtml ||
        '<span style="color:#6B7280;font-size:0.8rem;">None matched — consider revising resume language to mirror this JD.</span>';

    const gapLabel = document.getElementById('atsGapLabel');
    const gapsEl   = document.getElementById('atsGaps');
    if (gapsHtml) {
        gapLabel.style.display = 'block';
        gapsEl.innerHTML = gapsHtml;
    } else {
        gapLabel.style.display = 'none';
        gapsEl.innerHTML = '';
    }

    document.getElementById('atsPanel').classList.add('visible');
}
