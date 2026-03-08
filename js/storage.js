// ═══════════════════════════════════════════════════════
//  STORAGE — phrase data, status config, localStorage CRUD
//  Depends on: utils.js (showToast)
// ═══════════════════════════════════════════════════════

// ── ATS: Phrase-based whitelist approach ──────────────────────────────────────
// Instead of extracting words and filtering noise (blacklist), we check the JD
// against a curated list of meaningful phrases for Joe's target roles.
// This eliminates noise permanently — only recognized phrases surface.

// What appears in the JD + is in Joe's background → green (matched)
// What appears in the JD + is NOT in Joe's background → yellow (gap to address)
// Anything else in the JD → ignored entirely

const MASTER_PHRASES = [
    {
        category: 'AI & Technology',
        phrases: [
            'artificial intelligence','machine learning','generative ai',
            'large language models','llm','llms','natural language processing','nlp',
            'computer vision','deep learning','foundation models','neural network',
            'openai','chatgpt','claude','copilot','microsoft copilot',
            'azure openai','aws bedrock','google gemini','vertex ai',
            'prompt engineering','retrieval augmented generation','rag',
            'automation','robotic process automation','rpa','intelligent automation',
            'conversational ai','virtual assistant','agentic','multi-agent',
        ]
    },
    {
        category: 'AI Adoption & Transformation',
        phrases: [
            'ai adoption','ai strategy','ai transformation','ai readiness',
            'ai maturity','ai enablement','ai integration','enterprise ai',
            'technology adoption','digital transformation','digital strategy',
            'change management','organizational change','change enablement',
            'adoption framework','user adoption','human-centered',
            'responsible ai','ethical ai','trustworthy ai','human in the loop',
            'ai governance','ai policy','ai literacy','ai fluency',
        ]
    },
    {
        category: 'Leadership & Strategy',
        phrases: [
            'executive leadership','strategic planning','strategic roadmap',
            'stakeholder engagement','stakeholder management','executive sponsorship',
            'cross-functional','influence without authority','thought leadership',
            'executive presence','people leadership','organizational leadership',
            'program management','project management','portfolio management',
            'change champion','center of excellence','community of practice',
            'operating model','transformation office',
        ]
    },
    {
        category: 'Workforce & Learning',
        phrases: [
            'upskilling','reskilling','workforce development','workforce enablement',
            'learning and development','instructional design','curriculum development',
            'training program','facilitation','coaching','mentoring',
            'organizational development','talent development','capability building',
            'ambassador program','train the trainer','blended learning',
            'microlearning','e-learning','performance support',
        ]
    },
    {
        category: 'Analytics & Business Value',
        phrases: [
            'roi','return on investment','kpi','key performance indicators',
            'data-driven','performance measurement','business intelligence',
            'analytics','dashboards','benchmarking','baseline',
            'productivity gains','cost savings','efficiency gains',
            'business case','value realization','impact measurement',
            'metrics','okr','objectives and key results',
        ]
    },
    {
        category: 'Governance & Risk',
        phrases: [
            'ai governance','governance','responsible ai','ethical ai',
            'risk management','compliance','regulatory','model risk',
            'bias','fairness','transparency','accountability','explainability',
            'data privacy','privacy','security','audit','oversight',
            'guardrails','policy framework','hipaa','sox','gdpr','ccpa',
        ]
    },
    {
        category: 'Healthcare',
        phrases: [
            'healthcare','health system','clinical workflow','patient outcomes',
            'patient safety','ehr','electronic health record','epic','cerner',
            'clinical decision support','phi','population health',
            'value-based care','care delivery','clinician','physician',
            'nursing','hospital system','health plan','payer','provider',
        ]
    },
    {
        category: 'Finance & Banking',
        phrases: [
            'financial services','banking','investment management',
            'asset management','regulatory compliance','finra','sec',
            'capital markets','wealth management','insurance',
            'trading','risk management','actuarial','anti-money laundering',
            'fraud detection','financial planning',
        ]
    },
    {
        category: 'Technology & Cloud',
        phrases: [
            'saas','cloud','aws','azure','google cloud','gcp',
            'api','integration','agile','scrum','devops',
            'microsoft 365','sharepoint','teams','power platform',
            'enterprise software','platform','infrastructure',
            'software development','data engineering','data platform',
        ]
    },
    {
        category: 'Energy & Utility',
        phrases: [
            'energy','utility','electric','electricity','power generation',
            'transmission','distribution','grid','smart grid','nerc','ferc',
            'regulatory','rate case','cooperative','coop','renewable',
            'clean energy','sustainability','decarbonization','net zero',
            'scada','ot','operational technology','decision intelligence',
            'energy markets','member services','reliability',
        ]
    },
    {
        category: 'Consulting & Advisory',
        phrases: [
            'management consulting','strategy consulting','client engagement',
            'business transformation','operating model','process improvement',
            'gap analysis','current state','future state','playbook',
            'recommendations','deliverables','advisory','engagement management',
        ]
    },
];

// Phrases confirmed present in Joe's background / resume
const RESUME_PHRASES = new Set([
    // AI & Technology
    'artificial intelligence','machine learning','generative ai',
    'copilot','microsoft copilot','chatgpt','claude','openai',
    'azure openai','azure','prompt engineering','automation',
    'conversational ai','natural language processing',
    // AI Adoption & Transformation
    'ai adoption','ai strategy','ai transformation','ai readiness',
    'ai enablement','enterprise ai','technology adoption',
    'digital transformation','change management','organizational change',
    'change enablement','adoption framework','user adoption',
    'responsible ai','ethical ai','ai governance','ai literacy',
    'human-centered','ai policy',
    // Leadership & Strategy
    'executive leadership','strategic planning','strategic roadmap',
    'stakeholder engagement','stakeholder management','cross-functional',
    'thought leadership','executive sponsorship','program management',
    'change champion','center of excellence','community of practice',
    'influence without authority','portfolio management',
    // Workforce & Learning
    'upskilling','reskilling','workforce development','workforce enablement',
    'learning and development','instructional design','curriculum development',
    'training program','facilitation','coaching','organizational development',
    'talent development','capability building','ambassador program',
    'train the trainer','blended learning',
    // Analytics & Business Value
    'roi','kpi','data-driven','analytics','business case',
    'performance measurement','business intelligence','value realization',
    'metrics','productivity gains','cost savings',
    // Governance & Risk
    'ai governance','governance','responsible ai','compliance',
    'risk management','transparency','accountability','hipaa',
    // Healthcare
    'healthcare','health system','patient outcomes','clinical workflow',
    'ehr','value-based care',
    // Finance & Banking
    'financial services','banking','regulatory compliance','risk management',
    // Technology & Cloud
    'saas','cloud','aws','azure','microsoft 365','sharepoint','teams',
    'power platform','agile','api','enterprise software',
    // Consulting & Advisory
    'management consulting','business transformation','operating model',
    'process improvement','gap analysis','playbook','recommendations',
]);

const STATUS_CONFIG = {
    applied:   { label: 'Applied',          cls: 'status-applied',   color: '#3B82F6' },
    phone:     { label: 'Phone Screen',      cls: 'status-phone',     color: '#8B5CF6' },
    technical: { label: 'Technical',         cls: 'status-technical', color: '#F59E0B' },
    final:     { label: 'Final Round',       cls: 'status-final',     color: '#F97316' },
    offer:     { label: 'Offer',             cls: 'status-offer',     color: '#10B981' },
    rejected:  { label: 'No Longer Active',  cls: 'status-rejected',  color: '#94A3B8' }
};

// ── Migration & CRUD ──────────────────────────────────────────────────────────

function migrateProfiles() {
    const profiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
    const migrated = profiles.map(p => {
        if (p.schemaVersion >= 5) return p;
        return {
            ...p,
            id: p.id || ('app_' + Date.now() + '_' + Math.random().toString(36).substr(2,5)),
            role: p.role || '',
            status: p.status || 'applied',
            source: p.source || '',
            referredBy: p.referredBy || '',
            recruiterName: p.recruiterName || '',
            recruiterEmail: p.recruiterEmail || '',
            hiringManagerName: p.hiringManagerName || '',
            hiringManagerEmail: p.hiringManagerEmail || '',
            appliedDate: p.appliedDate || (p.created ? p.created.split('T')[0] : ''),
            lastContactDate: p.lastContactDate || '',
            followUpDate: p.followUpDate || '',
            resumeVersion: p.resumeVersion || 'executive',
            notes: p.notes || '',
            jobDescription: p.jobDescription || '',
            salaryMin: p.salaryMin || null,
            salaryMax: p.salaryMax || null,
            activityLog: p.activityLog || [],
            prepState: p.prepState || null,       // kept for legacy migration path
            prepRounds: p.prepRounds || undefined, // undefined = not yet migrated via panel open
            activeRoundId: p.activeRoundId || null,
            schemaVersion: 5
        };
    });
    localStorage.setItem('savedProfiles', JSON.stringify(migrated));
    localStorage.setItem('crm_schema_version', '5');
}

function getProfiles() {
    return JSON.parse(localStorage.getItem('savedProfiles') || '[]');
}

function saveProfiles(profiles) {
    localStorage.setItem('savedProfiles', JSON.stringify(profiles));
    // Warn if approaching localStorage limit (~5MB)
    try {
        const used = new Blob(Object.values(localStorage)).size;
        const pct  = (used / (5 * 1024 * 1024)) * 100;
        if (pct >= 85) {
            showToast(`⚠️ Storage at ${Math.round(pct)}% — export a JSON backup soon`, 6000);
        }
    } catch(e) { /* non-critical */ }
}
