/* Premium Leads — per-audience landing page content.
   Every field here is what a new industry/target audience needs. Mirrors the
   repo's contentSchema idea: one template, one record per audience. */
export const CAPS = [
  { key: 'aiEmployee', group: 'Engage', glyph: 'AI', bg: 'linear-gradient(135deg,#1E88E5,#0C2E63)', title: 'AI Employee', body: 'An autonomous teammate that prospects, writes and follows up around the clock — paced to look human.' },
  { key: 'linkedin', group: 'Engage', glyph: 'in', bg: '#0C2E63', title: 'LinkedIn Outreach', body: 'Connect, message and nurture unlimited prospects. Compatible with every version of LinkedIn.' },
  { key: 'email', group: 'Engage', glyph: '@', bg: '#1E88E5', title: 'Email Sequences', body: 'Multi-step cadences with perfectly timed follow-ups, open and click tracking.' },
  { key: 'dialer', group: 'Engage', glyph: '☎', bg: '#0D1B2E', title: 'Dialer', body: 'Click-to-call with notes and dispositions synced to your CRM. Close more deals by phone.' },
  { key: 'voicemail', group: 'Engage', glyph: 'VM', bg: '#00B2EF', title: 'Voicemail Drops', body: 'Pre-recorded, personalized voice messages delivered without a ring.' },
  { key: 'enrichment', group: 'Identify', glyph: 'DB', bg: '#0C2E63', title: 'Data Enrichment', body: 'Verified emails and direct dials from LinkedIn, ZoomInfo, Crunchbase and your favorite sources.' },
  { key: 'chrome', group: 'Identify', glyph: 'CX', bg: '#1E88E5', title: 'Chrome Extension', body: 'Enrich and enroll prospects from any profile page without leaving the browser.' },
  { key: 'video', group: 'Engage', glyph: '▶', bg: '#00B2EF', title: 'Video Messaging', body: 'Record once, personalize at scale — dynamic video that earns replies.' },
  { key: 'mobile', group: 'Engage', glyph: '📱', bg: '#0D1B2E', title: 'Mobile App', body: 'Run campaigns, take calls and reply on the move. Your outreach stays on track anywhere.' },
  { key: 'crm', group: 'Integrate', glyph: '⇄', bg: 'linear-gradient(135deg,#00B2EF,#1E88E5)', title: 'CRM Integrations', body: 'Two-way sync with Salesforce, HubSpot, Pipedrive, Calendly and HighLevel.' }
];

const q = (text, initials, name, role) => ({ text, initials, name, role });
const step = (title, body) => ({ title, body });
const pt = (t, b) => ({ t, b });
const faq = (q, a) => ({ q, a });

export const VARIANTS = {
  sales: {
    short: 'Sales', name: 'Sales teams & SDRs', kicker: 'Default', desc: 'Fill pipeline with verified decision-makers across every channel.', audience: 'sales teams',
    eyebrow: 'Multi-channel engagement for sales teams',
    h1a: 'Fill your pipeline.', h1b: 'Every channel, one engine.',
    sub: 'Premium Leads finds verified decision-makers, engages them across LinkedIn, email, phone and video, and books the meeting — automatically.',
    chip: 'Booking meetings from day one',
    channels: ['LinkedIn', 'Email', 'Phone', 'Video'],
    stats: [{ v: '+$15M', l: 'ACV added in 6 months' }, { v: '4×', l: 'more touchpoints per prospect' }, { v: 'Day 1', l: 'first hot leads' }],
    trust: ['Verified contact data', 'Works with any LinkedIn, ZoomInfo, Crunchbase', 'Human-paced automation', 'Real-time reporting'],
    capHeading: 'Everything an outbound team needs — in one platform.',
    capBlurb: 'Identify, enrich and engage. Each capability can be enabled or hidden per audience by your admin.',
    capOrder: ['aiEmployee', 'linkedin', 'email', 'dialer', 'voicemail', 'enrichment', 'chrome', 'video', 'mobile', 'crm'],
    capCopy: {},
    howH1: 'Live by day one.', howH2: 'Hot leads soon after.',
    howSub: 'Register, point us at your ideal decision-makers, and let hyper-focused campaigns run while your team closes.',
    steps: [step('Set up in minutes', 'Create your account, share your goals and start your first campaign immediately.'), step('Target data-enriched leads', 'Use any LinkedIn, ZoomInfo or Crunchbase source to define hyper-focused groups of decision-makers.'), step('Engage on every channel', 'Timed, sequential touchpoints make you visible to even the busiest prospects.'), step('Analyze and improve', 'See who opened, clicked and replied — and how your audience prefers to engage.')],
    engineEyebrow: 'One engine, every channel',
    engineHeading: 'Sequential cadences across email, LinkedIn, phone and video.',
    engineBody: 'Multiple touchpoints make you visible to even the busiest prospects. Every follow-up is timed, labeled and tracked — so your team closes from anywhere, any time.',
    enginePoints: [pt('Sequential cadences', 'Automated, perfectly timed follow-ups for direct messages and the subtlest touchpoints.'), pt('Advanced labeling', 'Tag prospects by intent and stage so the next touch is always the right one.'), pt('Real-time data', 'Reports on actionable improvements to drive continuous growth and efficiency.')],
    ucHeading: 'Built for the way your team sells.', ucSub: 'Pick your audience to see the page tailored to it.',
    useCaseCols: [{ title: 'Organizations', items: ['Solopreneur', 'SMB', 'Enterprise', 'B2B', 'Outbound', 'Inbound'] }, { title: 'Teams', items: ['Business dev reps', 'BD managers', 'Sales leaders', 'Sales reps', 'Account executives'] }, { title: 'Industries', items: ['SaaS', 'Logistics', 'Professional services', 'Financial services'] }],
    integrations: ['Salesforce', 'HubSpot', 'Pipedrive', 'Calendly', 'HighLevel', 'LinkedIn', 'ZoomInfo', 'Crunchbase'],
    proofHeading: 'Because it\'s our clients that matter most.',
    quotes: [q('In 6 months I\'ve added +$15M in Annual Contract Value, and recruited 3 senior executives to my remote team using the Premium Leads platform.', 'CW', 'CEO, professional services firm', 'Enterprise sales'), q('I have closed +$75k in new business using this platform — it has changed the way I book meetings and engage prospects!', 'JR', 'Founder & principal', 'B2B consulting')],
    faqs: [faq('Which data sources can I target from?', 'Any version of LinkedIn works, plus ZoomInfo, Crunchbase or any profile-URL source. Enrichment verifies every contact so you never miss an opportunity.'), faq('Will the outreach look automated?', 'No. Sequences are paced and randomized to look human, and every message is personalized from enriched data. You control tone, timing and channel mix.'), faq('Does it work with my CRM?', 'Yes — two-way sync with Salesforce, HubSpot, Pipedrive, Calendly and HighLevel keeps activity, notes and dispositions current on both sides.'), faq('How many reps can run campaigns?', 'As many as you need. Shared sequences and templates keep the playbook consistent while each rep works their own book.'), faq('How quickly will I see results?', 'Campaigns go live the day you register. Multiple touchpoints mean most teams see hot replies within the first days of a campaign.'), faq('Where do I sign in?', 'Existing customers sign in at app.premiumleads.ai. New here? Book a call and we\'ll set up your account together.')],
    ctaHeading: 'Ready to see your pipeline fill itself?',
    ctaSub: 'Tell us about your goals and we\'ll get back to you quickly — or skip the form and grab a time on the calendar.',
    ctaMicro: '15 minutes · No obligation',
    metaTitle: 'Premium Leads — Multi-channel engagement for sales teams', metaDesc: 'Find verified decision-makers and engage them across LinkedIn, email, phone and video. Book a call.'
  },

  recruiting: {
    short: 'Recruiting', name: 'Recruiting & talent', kicker: 'Talent acquisition', desc: 'Source ideal candidates and start the conversation first.', audience: 'recruiters and talent-acquisition teams',
    eyebrow: 'Talent sourcing & candidate engagement',
    h1a: 'Find qualified talent.', h1b: 'Start the conversation first.',
    sub: 'Source ideal candidates by your exact requirements, reach them across LinkedIn, email and phone, and track the funnel from first touch to hire — remote or in-office.',
    chip: 'Candidates replying today',
    channels: ['LinkedIn', 'Email', 'Phone', 'SMS'],
    stats: [{ v: '3', l: 'senior execs hired in 6 months' }, { v: 'Any', l: 'LinkedIn plan supported' }, { v: '100%', l: 'verified contact data' }],
    trust: ['Remote and in-office hiring', 'Works with LinkedIn Recruiter or free', 'Candidate-safe pacing', 'Funnel reporting per role'],
    capHeading: 'Sourcing, outreach and tracking — one talent engine.',
    capBlurb: 'The same engagement platform sales teams rely on, tuned for recruiters and talent-acquisition teams.',
    capOrder: ['linkedin', 'enrichment', 'email', 'aiEmployee', 'video', 'dialer', 'voicemail', 'chrome', 'mobile', 'crm'],
    capCopy: { linkedin: 'Reach passive candidates with connection requests and InMail-style sequences on any LinkedIn plan.', enrichment: 'Verified personal emails and mobile numbers so your outreach lands outside the inbox they ignore.', aiEmployee: 'An always-on sourcer that screens profiles against the role and opens the conversation for you.', video: 'A 40-second hiring-manager video raises candidate reply rates more than any subject line.', crm: 'Sync candidates and stages to your ATS or CRM — Bullhorn, HubSpot and more.' },
    howH1: 'From job req to shortlist.', howH2: 'In days, not weeks.',
    howSub: 'Define the role, target the right profiles and let multi-channel outreach build relationships with candidates for you.',
    steps: [step('Define the role', 'Set precise requirements — skills, seniority, location, remote or in-office.'), step('Source candidates', 'Pull enriched profiles from LinkedIn and other sources into a hyper-focused talent pool.'), step('Connect and engage', 'Automated, human-paced multi-channel messages start the conversation and build the relationship.'), step('Track and improve', 'Optimize talent funnels, retarget candidates and grow engagement with real reporting.')],
    engineEyebrow: 'Candidate engagement',
    engineHeading: 'Passive candidates don\'t answer one message. They answer the fourth.',
    engineBody: 'Sequenced touches across LinkedIn, email and phone keep your role in front of the right people without a recruiter copy-pasting all day.',
    enginePoints: [pt('Talent pools, not one-off searches', 'Save enriched candidate groups per role and re-engage them when the next req opens.'), pt('Hiring-manager voice', 'Send on behalf of the hiring manager for higher trust and reply rates.'), pt('Funnel visibility', 'Sourced → contacted → replied → screened → hired, per role and per recruiter.')],
    ucHeading: 'Built for every kind of hiring team.', ucSub: 'Pick your audience to see the page tailored to it.',
    useCaseCols: [{ title: 'Teams', items: ['In-house talent acquisition', 'Agency recruiters', 'Executive search', 'RPO providers'] }, { title: 'Roles you fill', items: ['Executives', 'Engineering', 'Sales', 'Healthcare', 'Skilled trades'] }, { title: 'Hiring models', items: ['Remote', 'Hybrid', 'In-office', 'Contract'] }],
    integrations: ['LinkedIn', 'Bullhorn', 'Greenhouse', 'Lever', 'HubSpot', 'Calendly', 'Indeed', 'ZoomInfo'],
    proofHeading: 'Talent teams that hire faster with Premium Leads.',
    quotes: [q('In 6 months I\'ve recruited 3 senior executives to my remote team using the Premium Leads platform — alongside +$15M in new ACV.', 'CW', 'CEO, professional services firm', 'Remote team builder'), q('It has changed the way I book conversations with candidates. Multiple touchpoints mean the right people actually respond.', 'TA', 'Head of talent', 'Logistics')],
    faqs: [faq('Do I need LinkedIn Recruiter?', 'No. Any LinkedIn plan works. Recruiter and Sales Navigator searches import directly if you have them.'), faq('Is candidate outreach compliant?', 'Sequences are paced to look human, honor opt-outs automatically and keep every message tied to a real recruiter identity.'), faq('Does it connect to my ATS?', 'Yes — candidates, stages and notes sync to Bullhorn, Greenhouse, Lever and HubSpot, with more on request.'), faq('Can hiring managers send outreach too?', 'Yes. Run sequences on behalf of the hiring manager while the recruiter keeps control of the funnel.'), faq('How fast will I build a shortlist?', 'Most roles see qualified replies within the first week of a campaign.'), faq('Where do I sign in?', 'Existing customers sign in at app.premiumleads.ai. New here? Book a call and we\'ll set up your account together.')],
    ctaHeading: 'Ready to fill roles faster?',
    ctaSub: 'Tell us about the roles you\'re hiring for and we\'ll show you how to build the shortlist — or grab a time on the calendar.',
    ctaMicro: '15 minutes · No obligation',
    metaTitle: 'Premium Leads for recruiters — candidate sourcing & outreach', metaDesc: 'Source passive candidates and engage them across LinkedIn, email and phone. Track every role from first touch to hire.'
  },

  agency: {
    short: 'Agencies', name: 'Agencies & white-label', kicker: 'Resell', desc: 'Offer AI-powered prospecting under your own brand.', audience: 'agencies',
    eyebrow: 'White-label for agencies',
    h1a: 'Your brand.', h1b: 'Our engagement engine.',
    sub: 'Offer AI-powered prospecting under your own name. Multi-client workspaces, white-label reporting and margins that scale with every account you add.',
    chip: 'Client workspaces live',
    channels: ['LinkedIn', 'Email', 'Phone', 'Video'],
    stats: [{ v: 'Unlimited', l: 'client workspaces' }, { v: 'Your', l: 'logo, domain and reports' }, { v: '1', l: 'login for every account' }],
    trust: ['Your logo, your domain', 'Per-client workspaces', 'White-label reporting', 'Wholesale pricing'],
    capHeading: 'A full outbound stack your clients see as yours.',
    capBlurb: 'Turn capabilities on or off per client, and present each one under your agency brand.',
    capOrder: ['aiEmployee', 'linkedin', 'email', 'crm', 'enrichment', 'video', 'dialer', 'voicemail', 'chrome', 'mobile'],
    capCopy: { aiEmployee: 'Sell “an AI SDR” as a productized service — it prospects and follows up for every client workspace.', crm: 'Push results into each client\'s own CRM so your reporting shows up where they already look.' },
    howH1: 'Launch a new service line.', howH2: 'Without building the stack.',
    howSub: 'Onboard a client, launch their campaigns and hand them a branded report — without building the stack yourself.',
    steps: [step('Brand the platform', 'Add your logo, colors and domain. Clients log in to your product.'), step('Onboard clients', 'Spin up a workspace per client with their targeting and messaging.'), step('Run campaigns', 'Multi-channel sequences run under each client\'s identity, paced to look human.'), step('Report and retain', 'White-label dashboards prove ROI every month and keep accounts renewing.')],
    engineEyebrow: 'Built to resell',
    engineHeading: 'One platform. Every client. Your margin.',
    engineBody: 'Manage every account from a single login, keep client data separated, and bill at your own price. We stay invisible.',
    enginePoints: [pt('Workspace isolation', 'Each client\'s contacts, sequences and reports stay in their own space.'), pt('Branded client portal', 'Clients see your logo and domain — never ours.'), pt('Agency-level reporting', 'Roll up performance across clients to spot what\'s working and where to upsell.')],
    ucHeading: 'For agencies that want outbound as a product.', ucSub: 'Pick your audience to see the page tailored to it.',
    useCaseCols: [{ title: 'Agency types', items: ['Lead-gen agencies', 'Marketing agencies', 'Recruiting agencies', 'Fractional sales teams'] }, { title: 'Offer it as', items: ['AI SDR service', 'Appointment setting', 'Outbound retainer', 'Add-on to retainers'] }, { title: 'Client industries', items: ['SaaS', 'Professional services', 'Logistics', 'Local businesses'] }],
    integrations: ['Salesforce', 'HubSpot', 'Pipedrive', 'HighLevel', 'Calendly', 'Slack', 'Zapier', 'LinkedIn'],
    proofHeading: 'Agencies growing recurring revenue with Premium Leads.',
    quotes: [q('I have closed +$75k in new business using this platform — and now my clients get the same engine under our brand.', 'JR', 'Agency principal', 'B2B marketing agency'), q('One login, every client, branded reporting. It made outbound a product line instead of a service we struggled to staff.', 'MK', 'Managing partner', 'Growth agency')],
    faqs: [faq('Can I put my own brand on it?', 'Yes — your logo, colors and a custom domain. Client-facing emails and reports carry your brand only.'), faq('How is pricing structured for agencies?', 'Wholesale per-workspace pricing so you set your own retail price. Details on the call.'), faq('Can clients log in themselves?', 'Yes, with role-based access. Or keep it fully managed and send them white-label reports.'), faq('Is client data kept separate?', 'Every workspace is isolated — contacts, sequences, inboxes and reporting never mix.'), faq('Do you offer an affiliate program too?', 'Yes. Refer accounts without managing them and earn recurring commission.'), faq('Where do I sign in?', 'Agency partners sign in at app.premiumleads.ai. New here? Book a call and we\'ll set up your workspace.')],
    ctaHeading: 'Ready to launch outbound under your brand?',
    ctaSub: 'Tell us about your agency and the clients you serve — we\'ll walk you through white-label setup and pricing.',
    ctaMicro: '20 minutes · Partner pricing on the call',
    metaTitle: 'Premium Leads white-label — outbound engine for agencies', metaDesc: 'Offer AI-powered prospecting under your own brand with multi-client workspaces and white-label reporting.'
  },

  founders: {
    short: 'Founders', name: 'Founders & solopreneurs', kicker: 'Lean teams', desc: 'Sell like a team of ten without hiring one.', audience: 'founders and solopreneurs',
    eyebrow: 'For founders & solopreneurs',
    h1a: 'Sell like a team of ten.', h1b: 'Without hiring one.',
    sub: 'An AI employee that prospects, follows up and books calls while you build the business — on every channel your buyers actually use.',
    chip: 'Follow-ups running while you build',
    channels: ['LinkedIn', 'Email', 'Video'],
    stats: [{ v: '+$75k', l: 'closed by one founder' }, { v: '0', l: 'SDRs to hire' }, { v: '24/7', l: 'outreach running' }],
    trust: ['Set up in an afternoon', 'No sales team required', 'Human-paced automation', 'Cancel anytime'],
    capHeading: 'The whole outbound team, in one seat.',
    capBlurb: 'Start with the capabilities you need today and switch on more as you grow.',
    capOrder: ['aiEmployee', 'linkedin', 'email', 'video', 'chrome', 'mobile', 'enrichment', 'crm', 'dialer', 'voicemail'],
    capCopy: { aiEmployee: 'Your first hire that never sleeps — it prospects, personalizes and follows up so you only take the meetings.', mobile: 'Reply to hot leads between customer calls. Your pipeline fits in your pocket.', chrome: 'See a good-fit prospect anywhere on the web? One click adds them to a sequence.' },
    howH1: 'Describe your buyer once.', howH2: 'Meetings show up on your calendar.',
    howSub: 'Describe your ideal customer once. Campaigns, follow-ups and bookings run on autopilot.',
    steps: [step('Describe your buyer', 'Share your business and goals — we optimize targeting from there.'), step('Import your targets', 'Any LinkedIn search or profile list becomes an enriched, verified campaign audience.'), step('Let the AI employee work', 'Prospecting, messaging and follow-ups run around the clock, paced to look human.'), step('Take the meetings', 'Hot leads land on your calendar. You show up and close.')],
    engineEyebrow: 'Built for one-person sales teams',
    engineHeading: 'Consistency is what you don\'t have time for. We do.',
    engineBody: 'Founders lose deals to silence, not to no. Sequenced follow-ups across LinkedIn and email keep every conversation warm while you ship.',
    enginePoints: [pt('Follow-ups you\'d never get to', 'Five touches per prospect without you remembering any of them.'), pt('Your voice, not a bot\'s', 'Personalized from enriched data and written in your tone.'), pt('Only the hot ones reach you', 'Replies and bookings are surfaced; everything else runs quietly.')],
    ucHeading: 'For every founder who is also the sales team.', ucSub: 'Pick your audience to see the page tailored to it.',
    useCaseCols: [{ title: 'You are', items: ['Solo founder', 'Consultant', 'Fractional executive', 'Coach', 'Freelancer'] }, { title: 'You sell', items: ['B2B services', 'SaaS', 'Advisory', 'Courses & programs'] }, { title: 'Your goal', items: ['First 10 customers', 'Consistent pipeline', 'Replace cold calling', 'Book more demos'] }],
    integrations: ['HubSpot', 'Pipedrive', 'Calendly', 'Gmail', 'Outlook', 'LinkedIn', 'Stripe', 'Zapier'],
    proofHeading: 'Founders closing more with less.',
    quotes: [q('I have closed +$75k in new business using this platform — it has changed the way I book meetings and engage prospects!', 'JR', 'Founder & principal', 'B2B consulting'), q('I was my own sales team. Now follow-ups happen while I\'m heads-down building the product.', 'DS', 'Solo founder', 'SaaS')],
    faqs: [faq('I\'m not a salesperson. Will this work for me?', 'Yes. Describe your customer in plain language; the platform handles targeting, sequencing and follow-up timing.'), faq('How much time does it take each week?', 'About an hour: review replies, take the meetings that book. Everything else runs on its own.'), faq('Will it sound like me?', 'Messages are drafted in your tone from your inputs, and you approve the sequence before it runs.'), faq('Do I need a CRM?', 'No. Start with the built-in pipeline; connect HubSpot or Pipedrive whenever you\'re ready.'), faq('What does it cost?', 'Plans and billing live inside the app. Book a call and we\'ll recommend the right starting point.'), faq('Where do I sign in?', 'Existing customers sign in at app.premiumleads.ai. New here? Book a call and we\'ll set up your account together.')],
    ctaHeading: 'Ready to get your time back?',
    ctaSub: 'Tell us what you sell and who buys it — we\'ll show you what your first campaign looks like.',
    ctaMicro: '15 minutes · No obligation',
    metaTitle: 'Premium Leads for founders — your AI sales employee', metaDesc: 'Prospecting, follow-ups and booked calls on autopilot for founders and solopreneurs.'
  },

  enterprise: {
    short: 'Enterprise', name: 'Enterprise sales leaders', kicker: 'Scale', desc: 'Scale outbound across teams and keep control.', audience: 'enterprise sales organizations',
    eyebrow: 'Enterprise sales organizations',
    h1a: 'Scale outbound.', h1b: 'Keep control.',
    sub: 'Role-based workspaces, CRM-native sync, compliance guardrails and reporting that shows exactly which touchpoints move revenue.',
    chip: 'Synced to Salesforce',
    channels: ['LinkedIn', 'Email', 'Phone', 'Video'],
    stats: [{ v: '+$15M', l: 'ACV in 6 months' }, { v: '2-way', l: 'CRM sync' }, { v: 'Team', l: 'level reporting' }],
    trust: ['SSO & role-based access', 'Two-way Salesforce sync', 'Compliance guardrails', 'Dedicated success manager'],
    capHeading: 'Governed, measurable, multi-channel engagement at scale.',
    capBlurb: 'Standardize the playbook across reps and regions, then measure every touchpoint.',
    capOrder: ['crm', 'aiEmployee', 'dialer', 'email', 'linkedin', 'enrichment', 'voicemail', 'video', 'chrome', 'mobile'],
    capCopy: { crm: 'Native two-way sync with Salesforce, HubSpot and Pipedrive — activities, dispositions and attribution land where leadership looks.', dialer: 'Team dialer with local presence, call recording and dispositions that roll up into coaching dashboards.', aiEmployee: 'Deploy AI SDRs per territory under shared guardrails — approved messaging, send windows and suppression lists.' },
    howH1: 'One playbook.', howH2: 'Every rep, every region.',
    howSub: 'Roll out one playbook across teams, keep data in your CRM, and manage performance from a single view.',
    steps: [step('Connect your CRM', 'Two-way sync with Salesforce, HubSpot or Pipedrive keeps every record current.'), step('Standardize the playbook', 'Shared sequences, templates and labeling across reps and regions.'), step('Engage at scale', 'Hundreds of reps, human-paced automation, compliance guardrails built in.'), step('Measure what moves revenue', 'Team-level reporting ties opens, clicks and calls to pipeline and ACV.')],
    engineEyebrow: 'Enterprise-grade',
    engineHeading: 'Activity you can govern. Attribution you can trust.',
    engineBody: 'Give reps the speed of automation without giving up control. Admin-approved content, suppression lists and audit trails on every touch.',
    enginePoints: [pt('Role-based workspaces', 'Territories, teams and managers with the right visibility and nothing more.'), pt('Guardrails by default', 'Approved templates, send-window limits and do-not-contact lists enforced centrally.'), pt('Revenue attribution', 'See which channel and which touch created the opportunity — by rep, team and region.')],
    ucHeading: 'Built for sales organizations at scale.', ucSub: 'Pick your audience to see the page tailored to it.',
    useCaseCols: [{ title: 'Teams', items: ['SDR / BDR orgs', 'Field sales', 'Inside sales', 'Partner & channel'] }, { title: 'Leaders', items: ['CRO', 'VP Sales', 'RevOps', 'Sales enablement'] }, { title: 'Industries', items: ['Technology', 'Logistics', 'Financial services', 'Professional services', 'Manufacturing'] }],
    integrations: ['Salesforce', 'HubSpot', 'Pipedrive', 'Okta SSO', 'Gong', 'Outreach', 'ZoomInfo', 'Slack'],
    proofHeading: 'Sales organizations scaling outbound with Premium Leads.',
    quotes: [q('In 6 months I\'ve added +$15M in Annual Contract Value, and recruited 3 senior executives to my remote team using the Premium Leads platform.', 'CW', 'CEO, professional services firm', 'Enterprise sales'), q('Every rep runs the same playbook and every touch lands in Salesforce. Forecasting finally reflects real activity.', 'RP', 'VP Sales', 'Enterprise logistics')],
    faqs: [faq('How does the Salesforce integration work?', 'Native two-way sync: leads, contacts, activities and dispositions flow both directions with field mapping you control.'), faq('Do you support SSO and role-based access?', 'Yes — SAML SSO (Okta, Azure AD) plus roles for admins, managers and reps with territory-level visibility.'), faq('How do you keep outreach compliant?', 'Central suppression lists, approved templates, send-window limits and a full audit trail on every message and call.'), faq('Can we run a pilot with one team first?', 'Yes. Most enterprise customers start with one SDR team, then roll out by region once the playbook is proven.'), faq('What does onboarding look like?', 'A dedicated success manager runs CRM mapping, playbook setup and rep training — typically live within two weeks.'), faq('Where do I sign in?', 'Customers sign in at app.premiumleads.ai or through your SSO portal. New here? Book a call with our enterprise team.')],
    ctaHeading: 'Ready to scale outbound with control?',
    ctaSub: 'Tell us about your team size, CRM and goals — we\'ll scope a pilot with our enterprise team.',
    ctaMicro: '30 minutes · Enterprise team · Security review available',
    metaTitle: 'Premium Leads Enterprise — governed multi-channel outbound', metaDesc: 'Scale outbound across teams with CRM-native sync, compliance guardrails and revenue attribution.'
  }
};


/* StoryBrand (SB7) layer — the customer is the hero, Premium Leads is the guide.
   Problem → Guide → Plan → Call to action → Stakes → Success. */
const STORY = {
  sales: {
    ctaTransitional: 'See the plan',
    problemEyebrow: 'The problem', problemHeading: 'You have a great offer. The right buyers never hear about it.', villain: 'Silence from your pipeline',
    problems: [
      { kind: 'External', title: 'Not enough qualified conversations', body: 'Reps spend their day hunting contact data and chasing follow-ups instead of selling.' },
      { kind: 'Internal', title: 'Every month starts at zero', body: 'The anxiety of an empty calendar and a forecast built on hope, not activity.' },
      { kind: 'Philosophical', title: 'Good work deserves to be found', body: 'Teams that solve real problems shouldn\'t lose to the loudest competitor with the biggest outbound budget.' }
    ],
    engineEyebrow: 'Your guide', engineHeading: 'We know what it\'s like to carry the number alone.', engineBody: 'Premium Leads was built by operators who ran outbound the hard way. The platform now powers teams that have added eight figures in pipeline — on every channel buyers actually answer.',
    enginePoints: [{ t: '+$15M ACV in six months', b: 'Added by one professional-services client running Premium Leads campaigns.' }, { t: 'Every channel, one engine', b: 'LinkedIn, email, phone and video sequenced together — not four tools duct-taped.' }, { t: 'Verified data, human pacing', b: 'Enriched contacts and send patterns that look like a person, because a person is behind them.' }],
    howH1: 'The plan.', howH2: 'Three steps to a full calendar.', howSub: 'No long implementation. No new headcount.',
    steps: [{ title: 'Book a call', body: 'Tell us who you sell to. We\'ll map your ideal buyer and the channels they answer.' }, { title: 'Launch your campaigns', body: 'Import targets from LinkedIn, ZoomInfo or Crunchbase; sequences go live the same day.' }, { title: 'Take the meetings', body: 'Hot replies land on your calendar. Your reps sell; the system keeps prospecting.' }],
    stakesHeading: 'Keep doing it by hand, and…', stakes: ['Reps keep spending 60% of their week on research and follow-up', 'Warm prospects go cold after the second unanswered email', 'Pipeline stays lumpy, and forecasts stay guesses', 'The competitor with more SDRs keeps winning the conversation'],
    successHeading: 'With Premium Leads, you…',
    success: [{ before: 'Hunting for contact data', after: 'Verified decision-makers, enriched automatically' }, { before: 'One channel, one shot', after: 'Five timed touches across LinkedIn, email, phone and video' }, { before: 'Empty calendar Mondays', after: 'Meetings booked while the team sleeps' }, { before: 'Guessing what works', after: 'Reports that show which touch created the deal' }]
  },
  recruiting: {
    ctaTransitional: 'See how sourcing works',
    problemEyebrow: 'The problem', problemHeading: 'The best candidates aren\'t applying. And they aren\'t answering either.', villain: 'The ignored InMail',
    problems: [
      { kind: 'External', title: 'Passive talent ignores one-off messages', body: 'Recruiters send hundreds of InMails for a handful of replies while reqs age.' },
      { kind: 'Internal', title: 'Every open role feels like a fire', body: 'Hiring managers escalate, candidates ghost, and you\'re the one explaining the delay.' },
      { kind: 'Philosophical', title: 'Great people deserve to hear about great roles', body: 'A good match shouldn\'t depend on whether someone happened to check LinkedIn that week.' }
    ],
    engineEyebrow: 'Your guide', engineHeading: 'We\'ve chased the same candidates you have.', engineBody: 'Premium Leads brings the engagement engine built for sales teams to talent acquisition — the same multi-touch sequencing that fills pipelines now fills shortlists.',
    enginePoints: [{ t: '3 senior executives hired', b: 'Recruited to a remote team in six months by one client using the platform.' }, { t: 'Any LinkedIn plan', b: 'Recruiter, Sales Navigator or free — searches import straight into a campaign.' }, { t: 'Candidate-safe pacing', b: 'Human-paced touches that respect opt-outs and protect your employer brand.' }],
    howH1: 'The plan.', howH2: 'From job req to shortlist.', howSub: 'Three steps, no new sourcing team.',
    steps: [{ title: 'Book a call', body: 'Tell us the roles you\'re hiring for. We\'ll map the candidate profile and channels.' }, { title: 'Launch candidate outreach', body: 'Enriched talent pools get sequenced touches on LinkedIn, email and phone.' }, { title: 'Screen the replies', body: 'Interested candidates book straight onto the recruiter\'s calendar.' }],
    stakesHeading: 'Keep sourcing one message at a time, and…', stakes: ['Reqs stay open past 45 days while hiring managers lose patience', 'Your best candidates take the offer from a faster competitor', 'Recruiters burn out copy-pasting instead of interviewing', 'Agency fees keep covering what your team could do in-house'],
    successHeading: 'With Premium Leads, you…',
    success: [{ before: 'One InMail and hope', after: 'Four timed touches across LinkedIn, email and phone' }, { before: 'Starting every search from scratch', after: 'Saved talent pools you re-engage when the next req opens' }, { before: 'Guessing which recruiter is on track', after: 'Sourced → contacted → replied → hired, per role' }, { before: 'Weeks to a first screen', after: 'Qualified replies in the first week' }]
  },
  agency: {
    ctaTransitional: 'See the partner model',
    problemEyebrow: 'The problem', problemHeading: 'Clients want outbound results. Building the stack yourself kills the margin.', villain: 'The unprofitable service line',
    problems: [
      { kind: 'External', title: 'Outbound is hard to staff and harder to scale', body: 'Every new client means more SDR hours, more tools and more things that break.' },
      { kind: 'Internal', title: 'You\'re saying no to revenue', body: 'Turning down lead-gen work — or doing it at a loss — because the delivery doesn\'t scale.' },
      { kind: 'Philosophical', title: 'Agencies should own their product, not rent it', body: 'The relationship is yours. The platform behind it should carry your name.' }
    ],
    engineEyebrow: 'Your guide', engineHeading: 'We built the engine so you don\'t have to.', engineBody: 'Premium Leads runs the same multi-channel platform for agencies that it runs for in-house teams — isolated client workspaces, your branding, wholesale pricing.',
    enginePoints: [{ t: 'Unlimited client workspaces', b: 'Each client\'s contacts, sequences and inboxes stay separated.' }, { t: 'Your logo, your domain', b: 'Clients log in to your product and read your reports. We stay invisible.' }, { t: 'Proven on real pipeline', b: 'The same engine behind +$15M ACV and +$75k closed by single operators.' }],
    howH1: 'The plan.', howH2: 'Launch outbound as a product.', howSub: 'Three steps to a new recurring service line.',
    steps: [{ title: 'Book a partner call', body: 'We walk through white-label setup, workspace model and wholesale pricing.' }, { title: 'Brand and onboard', body: 'Add your logo and domain, then spin up a workspace per client with their targeting.' }, { title: 'Deliver and renew', body: 'Campaigns run under each client\'s identity; branded reports prove ROI every month.' }],
    stakesHeading: 'Keep piecing it together, and…', stakes: ['Margin disappears into tool subscriptions and SDR hours', 'Clients churn when results are inconsistent across accounts', 'You keep referring outbound work to someone else', 'Another agency productizes the offer first'],
    successHeading: 'With Premium Leads, you…',
    success: [{ before: 'Five tools per client', after: 'One platform, one login, every client' }, { before: 'Someone else\'s brand on the reports', after: 'White-label dashboards your clients think you built' }, { before: 'Hourly delivery that doesn\'t scale', after: 'Wholesale pricing and recurring retainers' }, { before: 'Flat service revenue', after: 'A product line that grows with every account' }]
  },
  founders: {
    ctaTransitional: 'See how it works',
    problemEyebrow: 'The problem', problemHeading: 'You built something people need. Selling it is eating your week.', villain: 'The follow-up you never sent',
    problems: [
      { kind: 'External', title: 'No time to prospect consistently', body: 'Outreach happens in bursts between building, shipping and serving customers.' },
      { kind: 'Internal', title: 'Feast or famine is exhausting', body: 'Great months followed by empty ones — and the quiet worry that you\'re not a “real” salesperson.' },
      { kind: 'Philosophical', title: 'Builders shouldn\'t have to become SDRs', body: 'The best product should get a fair hearing without a sales team behind it.' }
    ],
    engineEyebrow: 'Your guide', engineHeading: 'We\'ve been the founder who was also the sales team.', engineBody: 'Premium Leads gives you an AI employee that prospects, follows up and books calls — so the consistency you can\'t afford in time, you get in software.',
    enginePoints: [{ t: '+$75k closed by one founder', b: 'New business booked by a solo operator running Premium Leads campaigns.' }, { t: 'Zero SDRs to hire', b: 'The whole outbound function in one seat, from an afternoon of setup.' }, { t: 'Your voice, not a bot\'s', b: 'Messages drafted in your tone from enriched data, approved by you.' }],
    howH1: 'The plan.', howH2: 'Describe your buyer. Take the meetings.', howSub: 'Three steps, about an hour a week after launch.',
    steps: [{ title: 'Book a call', body: 'Tell us what you sell and who buys it. We\'ll shape your first campaign together.' }, { title: 'Let the AI employee work', body: 'Prospecting, personalization and follow-ups run around the clock, paced to look human.' }, { title: 'Show up and close', body: 'Hot leads land on your calendar. You do the one part only you can do.' }],
    stakesHeading: 'Keep selling in bursts, and…', stakes: ['Warm leads go cold while you\'re heads-down shipping', 'Revenue swings with your calendar, not your product', 'You hire a salesperson before you can afford one', 'Someone with a worse product and a sales team wins the account'],
    successHeading: 'With Premium Leads, you…',
    success: [{ before: 'Outreach when you remember', after: 'Five touches per prospect, every time' }, { before: 'Cold-calling you dread', after: 'LinkedIn, email and video that earn replies' }, { before: 'Building or selling', after: 'Building while the pipeline fills' }, { before: 'Hoping for referrals', after: 'A predictable flow of booked calls' }]
  },
  enterprise: {
    ctaTransitional: 'See the rollout plan',
    problemEyebrow: 'The problem', problemHeading: 'Hundreds of reps. Dozens of tools. No single view of what actually moves revenue.', villain: 'Ungoverned activity',
    problems: [
      { kind: 'External', title: 'Fragmented outbound across teams and regions', body: 'Every team runs its own playbook and tooling; activity never lands cleanly in the CRM.' },
      { kind: 'Internal', title: 'You can\'t defend the forecast', body: 'Leadership asks what\'s working and the honest answer is a dozen dashboards that disagree.' },
      { kind: 'Philosophical', title: 'Scale shouldn\'t mean losing control', body: 'Reps deserve the speed of automation; the business deserves compliance and attribution.' }
    ],
    engineEyebrow: 'Your guide', engineHeading: 'We\'ve rolled out outbound across organizations like yours.', engineBody: 'Premium Leads gives enterprise sales organizations one governed engine — CRM-native, SSO-ready, with guardrails and attribution built in from day one.',
    enginePoints: [{ t: 'Two-way Salesforce sync', b: 'Leads, activities and dispositions flow both directions with field mapping you control.' }, { t: 'Guardrails by default', b: 'Approved templates, send-window limits and suppression lists enforced centrally.' }, { t: 'Proven at scale', b: '+$15M ACV added in six months by one client organization.' }],
    howH1: 'The plan.', howH2: 'Pilot one team. Roll out by region.', howSub: 'Three steps with a dedicated success manager at each one.',
    steps: [{ title: 'Book a scoping call', body: 'We map your CRM, teams and compliance requirements, then design a pilot.' }, { title: 'Pilot with one SDR team', body: 'Standardize the playbook, connect the CRM, prove the attribution model.' }, { title: 'Roll out and measure', body: 'Expand by region with team-level reporting tied to pipeline and ACV.' }],
    stakesHeading: 'Keep running fragmented outbound, and…', stakes: ['Rep activity never reconciles with the CRM, so attribution stays guesswork', 'Compliance exposure grows with every unmanaged tool', 'Top performers\' playbooks never reach the rest of the floor', 'The board keeps asking why more headcount isn\'t more pipeline'],
    successHeading: 'With Premium Leads, you…',
    success: [{ before: 'Twelve dashboards that disagree', after: 'One view of touches → opportunities → revenue' }, { before: 'Each team on its own tools', after: 'One governed playbook across regions' }, { before: 'Hoping reps stay compliant', after: 'Guardrails enforced before send' }, { before: 'Headcount as the only lever', after: 'AI SDRs per territory under shared rules' }]
  }
};
Object.keys(STORY).forEach(k => Object.assign(VARIANTS[k], STORY[k]));

/* Field catalogue — what a new industry page needs. Used by the admin editor. */
export const CONTENT_MODEL = [
  { group: 'Identity', fields: [['label', 'Page label'], ['audience', 'Audience (plural noun phrase)'], ['slug', 'URL slug'], ['short', 'Short name (variant pill)'], ['kicker', 'Use-case card kicker'], ['desc', 'Use-case card description']] },
  { group: 'Hero', fields: [['eyebrow', 'Eyebrow'], ['h1a', 'Headline line 1'], ['h1b', 'Headline line 2 (gradient)'], ['sub', 'Subhead'], ['chip', 'Status chip'], ['channels', 'Channel badges (comma-separated)'], ['stats', 'Stats — one per line: Value | Label']] },
  { group: 'Trust strip', fields: [['trust', 'Phrases — one per line']] },
  { group: 'Problem (the villain)', fields: [['problemEyebrow', 'Eyebrow'], ['problemHeading', 'Heading — what the hero is up against'], ['villain', 'Named villain'], ['problems', 'External / internal / philosophical — one per line: Kind | Title | Body']] },
  { group: 'Capabilities', fields: [['capHeading', 'Heading'], ['capBlurb', 'Blurb'], ['capOrder', 'Order & inclusion (comma-separated keys)'], ['capCopy', 'Per-capability copy — one per line: key | body']] },
  { group: 'Guide (empathy + authority)', fields: [['engineEyebrow', 'Eyebrow'], ['engineHeading', 'Empathy statement'], ['engineBody', 'Authority intro'], ['enginePoints', 'Authority proof — one per line: Title | Body']] },
  { group: 'The plan (3 steps)', fields: [['howH1', 'Heading line 1'], ['howH2', 'Heading line 2 (cyan)'], ['howSub', 'Subhead'], ['steps', 'Steps — one per line: Title | Body']] },
  { group: 'Stakes & success', fields: [['stakesHeading', 'Stakes heading'], ['stakes', 'What failure looks like — one per line'], ['successHeading', 'Success heading'], ['success', 'Transformation — one per line: Before | After']] },
  { group: 'Use cases', fields: [['ucHeading', 'Heading'], ['ucSub', 'Subhead'], ['useCaseCols', 'Columns — one per line: Title | item, item, item']] },
  { group: 'Integrations', fields: [['integrations', 'Names (comma-separated)']] },
  { group: 'Proof', fields: [['proofHeading', 'Heading'], ['quotes', 'Quotes — one per line: Quote | Initials | Name | Role']] },
  { group: 'FAQ', fields: [['faqs', 'Items — one per line: Question | Answer']] },
  { group: 'Final CTA', fields: [['ctaHeading', 'Heading'], ['ctaSub', 'Subhead'], ['ctaMicro', 'Microcopy'], ['ctaTransitional', 'Transitional CTA label'], ['bookingUrl', 'Booking URL override']] },
  { group: 'SEO & social', fields: [['metaTitle', 'Page title'], ['metaDesc', 'Meta description']] }
];

/* Serialize structured fields to editable text and back (admin ⇄ page). */
const LIST_FIELDS = {
  channels: { kind: 'csv' }, integrations: { kind: 'csv' }, capOrder: { kind: 'csv' }, trust: { kind: 'lines' },
  stats: { kind: 'rows', keys: ['v', 'l'] }, steps: { kind: 'rows', keys: ['title', 'body'] }, enginePoints: { kind: 'rows', keys: ['t', 'b'] },
  quotes: { kind: 'rows', keys: ['text', 'initials', 'name', 'role'] }, faqs: { kind: 'rows', keys: ['q', 'a'] },
  problems: { kind: 'rows', keys: ['kind', 'title', 'body'] }, stakes: { kind: 'lines' }, success: { kind: 'rows', keys: ['before', 'after'] },
  useCaseCols: { kind: 'cols' }, capCopy: { kind: 'map' }
};
export function toText(key, val) {
  const f = LIST_FIELDS[key]; if (!f || val == null) return val == null ? '' : String(val);
  if (typeof val === 'string') return val;
  if (f.kind === 'csv') return val.join(', ');
  if (f.kind === 'lines') return val.join('\n');
  if (f.kind === 'rows') return val.map(r => f.keys.map(k => r[k] ?? '').join(' | ')).join('\n');
  if (f.kind === 'cols') return val.map(c => c.title + ' | ' + (c.items || []).join(', ')).join('\n');
  if (f.kind === 'map') return Object.entries(val).map(([k, v]) => k + ' | ' + v).join('\n');
  return String(val);
}
export function fromText(key, text) {
  const f = LIST_FIELDS[key]; if (!f || typeof text !== 'string') return text;
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  const split = s => s.split('|').map(x => x.trim());
  if (f.kind === 'csv') return text.split(',').map(s => s.trim()).filter(Boolean);
  if (f.kind === 'lines') return lines;
  if (f.kind === 'rows') return lines.map(l => { const parts = split(l); return Object.fromEntries(f.keys.map((k, i) => [k, parts[i] ?? ''])); });
  if (f.kind === 'cols') return lines.map(l => { const [title, items = ''] = split(l); return { title, items: items.split(',').map(s => s.trim()).filter(Boolean) }; });
  if (f.kind === 'map') return Object.fromEntries(lines.map(l => { const [k, ...rest] = split(l); return [k, rest.join(' | ')]; }));
  return text;
}
/* Normalize any stored record (strings from the admin or arrays) to arrays. */
export function normalize(rec) {
  const out = { ...rec };
  Object.keys(LIST_FIELDS).forEach(k => { if (typeof out[k] === 'string') out[k] = fromText(k, out[k]); });
  return out;
}

/* Complementary resources shown on /resources and teased on every landing page.
   In production the admin pastes a URL; the server fetches OG title/description
   and takes a screenshot. Here the snapshot comes from a live screenshot service. */
export const snapshotFor = url => url ? 'https://image.thum.io/get/width/900/crop/620/noanimate/' + url : '';
export const DEFAULT_RESOURCES = [
  { id: 'authority-desk', name: 'The Authority Desk', url: 'https://authority-desk.com/', category: 'Content & authority', tagline: 'A done-for-you newsroom for founders and experts.', description: 'Twenty minutes a month on a call becomes published, search-ready authority articles under your name — written in your voice and edited by real strategists. Pairs with Premium Leads so the prospects you reach find a credible expert when they look you up.', highlights: ['Human-edited authority articles', 'Featured-Expert press kit', 'Articles repurposed into social and video'], featured: true },
  { id: 'brand-voice-interview', name: 'Brand Voice Interview', url: 'https://brand-voice-interview.com/', category: 'Voice & messaging', tagline: 'Capture how you think and sound — once.', description: 'A senior-led interview that produces a voice profile: tone, phrasing, point of view and the stories you tell. Premium Leads sequences and Authority Desk articles are written from it, so every touch sounds unmistakably like you.', highlights: ['Guided 45-minute session', 'Reusable voice profile', 'Feeds outreach, articles and newsletters'], featured: true },
  { id: 'insta-newsletter', name: 'Insta Newsletter', url: 'https://insta-newsletter.com/', category: 'Nurture', tagline: 'Turn what you already said into a newsletter people open.', description: 'Drafts a branded newsletter from your calls, articles and posts, then sends it on schedule. Keeps every prospect Premium Leads reached warm between conversations.', highlights: ['Auto-drafted from your content', 'Branded templates', 'Scheduled sends with open and click reporting'], featured: true }
];

/* ---------------------------------------------------------------------------
   Pre-qualification ("Get started") form.
   Mirrors The-Authority-Desk shared/prequalificationSchema.ts: the same seven
   SYSTEM question ids (fullName, email, phone, company, clientType,
   servicePreference, marketingBudget) and the Brand Voice Interview's LOCKED
   option VALUES for servicePreference / marketingBudget. Labels are Premium
   Leads wording; values must never change — BVI's skip logic keys on them.
--------------------------------------------------------------------------- */
export const SERVICE_PREFERENCE_CHOICES = [
  { value: 'Do-it-yourself (DIY)', label: 'Give me the platform — my team runs the campaigns (DIY)' },
  { value: 'Done-with-you (DWY)', label: 'Set it up with me — your team builds, mine operates (done with you)' },
  { value: 'Done-for-you (DFY)', label: 'Run it for me — an AI employee and your team handle outreach end to end (done for you)' }
];
export const MARKETING_BUDGET_CHOICES = [
  { value: 'No Budget', label: 'No set budget yet' },
  { value: '$500 - $1,500/month', label: '$500 – $1,500 a month' },
  { value: '$1,500 - $5,000/month', label: '$1,500 – $5,000 a month' },
  { value: '$5,000 - $20,000/month', label: '$5,000 – $20,000 a month' }
];
const opts = vals => vals.map(v => ({ value: v, label: v }));
const Q = (id, type, label, extra = {}) => ({ id, type, label, hint: '', placeholder: '', required: false, width: 'full', columns: 1, options: [], ...extra });

export const PREQUAL_FORM = {
  version: 1,
  sections: [
    { id: 'contact', kicker: '01 · Contact', heading: 'Where we reach you.', note: 'Used by your advisor to follow up — never shared or published.', questions: [
      Q('fullName', 'text', 'Full name', { placeholder: 'Jordan Avery', required: true, width: 'half', system: true }),
      Q('email', 'email', 'Work email', { placeholder: 'jordan@yourcompany.com', required: true, width: 'half', system: true }),
      Q('phone', 'tel', 'Phone', { placeholder: '(555) 123-4567', required: true, width: 'half', system: true }),
      Q('company', 'text', 'Company', { placeholder: 'Avery Logistics', required: true, width: 'half', system: true }),
      Q('roleTitle', 'text', 'Your role or title', { placeholder: 'VP Sales', width: 'half' }),
      Q('website', 'url', 'Website', { placeholder: 'https://yourcompany.com', width: 'half' })
    ] },
    { id: 'profile', kicker: '02 · Who you are', heading: 'Who\'s doing the outreach.', note: 'Broad strokes are fine — we go deeper on the call.', questions: [
      Q('clientType', 'radio', 'Which best describes you?', { required: true, columns: 2, system: true, pinInTable: true, options: opts(['Sales leader', 'SDR / BDR', 'Account executive', 'Founder / CEO', 'Recruiter / talent leader', 'Agency owner', 'Marketing leader', 'Consultant / advisor', 'Other professional']) }),
      Q('expertise', 'textarea', 'In a sentence or two: what do you sell, and to whom?', { hint: 'However you\'d say it across the table — no polish needed.', placeholder: 'We help…', required: true })
    ] },
    { id: 'goals', kicker: '03 · Your goals', heading: 'What a full pipeline would change.', note: 'Pick everything that applies — it shapes what we recommend.', questions: [
      Q('goals', 'checkbox', 'What should Premium Leads accomplish for you?', { required: true, columns: 2, options: opts(['Book more qualified meetings', 'Fill the pipeline consistently, every month', 'Reach decision-makers who ignore email', 'Hire faster from passive talent', 'Launch outbound as a service for clients', 'Replace manual prospecting and follow-up', 'Consolidate LinkedIn, email, phone and video into one tool', 'See which touchpoints actually create revenue']) })
    ] },
    { id: 'readiness', kicker: '04 · Timing', heading: 'Where you are in the process.', note: 'There\'s no wrong answer — it tells us how to be useful right now.', questions: [
      Q('readiness', 'radio', 'When would you want campaigns live?', { required: true, pinInTable: true, options: opts(["I'm ready to start now", 'Within the next 3 weeks', 'Within a month', 'Within 6 months', "A year or two out — I'm exploring"]) })
    ] },
    { id: 'fit', kicker: '05 · Working together', heading: 'How you\'d want this to run.', note: 'So we only ever propose something that actually fits.', questions: [
      Q('servicePreference', 'radio', 'How would you want to work with Premium Leads?', { hint: 'From hands-on to fully handled.', required: true, system: true, lockedValues: true, options: SERVICE_PREFERENCE_CHOICES }),
      Q('marketingBudget', 'radio', 'What\'s your current monthly marketing / lead-gen budget?', { hint: 'A range is fine — it keeps our recommendations realistic.', required: true, columns: 2, system: true, lockedValues: true, pinInTable: true, options: MARKETING_BUDGET_CHOICES }),
      Q('anythingElse', 'textarea', 'Anything else we should know?', { placeholder: 'Whatever would help us serve you well.' })
    ] }
  ]
};

/* Door-specific questions, inserted as section 02b for the landing page the
   prospect came through. Answers travel with the submission as ordinary keys. */
export const DOOR_SECTIONS = {
  sales: { id: 'door', kicker: '02b · Your team', heading: 'About your sales motion.', note: '', questions: [
    Q('teamSize', 'radio', 'How many people do outbound today?', { required: true, columns: 2, options: opts(['Just me', '2–5', '6–20', '21–50', '50+']) }),
    Q('channelsToday', 'checkbox', 'Channels you use today', { columns: 2, options: opts(['LinkedIn', 'Email', 'Phone', 'Video', 'None yet']) }),
    Q('crm', 'text', 'CRM you use', { placeholder: 'Salesforce, HubSpot, Pipedrive…', width: 'half' })
  ] },
  recruiting: { id: 'door', kicker: '02b · Your hiring', heading: 'About the roles you fill.', note: '', questions: [
    Q('rolesPerQuarter', 'radio', 'Open roles in a typical quarter', { required: true, columns: 2, options: opts(['1–3', '4–10', '11–30', '30+']) }),
    Q('hiringModel', 'checkbox', 'Hiring model', { columns: 2, options: opts(['Remote', 'Hybrid', 'In-office', 'Contract']) }),
    Q('ats', 'text', 'ATS / CRM you use', { placeholder: 'Bullhorn, Greenhouse, Lever…', width: 'half' })
  ] },
  agency: { id: 'door', kicker: '02b · Your agency', heading: 'About the clients you serve.', note: '', questions: [
    Q('clientCount', 'radio', 'Active clients', { required: true, columns: 2, options: opts(['1–5', '6–15', '16–40', '40+']) }),
    Q('offerType', 'checkbox', 'How you\'d offer it', { columns: 2, options: opts(['AI SDR service', 'Appointment setting', 'Outbound retainer', 'Add-on to existing retainers']) }),
    Q('whiteLabel', 'radio', 'Do you need white-label branding?', { options: opts(['Yes — our brand only', 'Co-branded is fine', 'Not important']) })
  ] },
  founders: { id: 'door', kicker: '02b · Your business', heading: 'About what you\'re building.', note: '', questions: [
    Q('businessStage', 'radio', 'Stage', { required: true, columns: 2, options: opts(['Pre-revenue', 'First customers', 'Growing — I\'m the sales team', 'Growing — small team']) }),
    Q('dealSize', 'radio', 'Typical deal size', { columns: 2, options: opts(['Under $1k', '$1k – $10k', '$10k – $50k', '$50k+']) })
  ] },
  enterprise: { id: 'door', kicker: '02b · Your organization', heading: 'About your sales org.', note: '', questions: [
    Q('repCount', 'radio', 'Reps who would use the platform', { required: true, columns: 2, options: opts(['10–25', '26–100', '101–500', '500+']) }),
    Q('crm', 'radio', 'CRM of record', { columns: 2, options: opts(['Salesforce', 'HubSpot', 'Pipedrive', 'Other']) }),
    Q('requirements', 'checkbox', 'Requirements', { columns: 2, options: opts(['SSO', 'Security review', 'Data residency', 'Pilot before rollout']) })
  ] }
};

/* Routing — same three destinations as The Authority Desk (packages/book/nurture). */
export function routeSubmission(a) {
  const exploring = a.readiness === "A year or two out — I'm exploring";
  const noBudget = a.marketingBudget === 'No Budget';
  if (exploring || (noBudget && a.readiness !== "I'm ready to start now")) return 'nurture';
  return 'book';
}
export const ROUTING_LABELS = { packages: 'Sent to pricing', book: 'Asked for a call', nurture: 'Not ready yet' };
