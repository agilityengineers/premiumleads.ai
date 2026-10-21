/* Premium Leads — per-audience landing page content.
   A typed port of the design package's content.js: one template, one record
   per audience. The StoryBrand (SB7) layer — the customer is the hero, Premium
   Leads is the guide: Problem → Guide → Plan → Call to action → Stakes →
   Success — is merged into each record exactly as content.js does. */
import type { Content } from "../../shared/variantSchema";

const q = (text: string, initials: string, name: string, role: string) => ({ text, initials, name, role });
const step = (title: string, body: string) => ({ title, body });
const pt = (t: string, b: string) => ({ t, b });
const faq = (qq: string, a: string) => ({ q: qq, a });

/** The envelope the admin edits alongside the copy. */
export type BuiltinVariant = {
  slug: string;
  label: string;
  audience: string;
  /** Avatar dot in the admin's page list. */
  dot: string;
  content: Content;
};

type Story = Pick<
  Content,
  | "ctaTransitional" | "problemEyebrow" | "problemHeading" | "villain" | "problems"
  | "engineEyebrow" | "engineHeading" | "engineBody" | "enginePoints"
  | "howH1" | "howH2" | "howSub" | "steps"
  | "stakesHeading" | "stakes" | "successHeading" | "success"
>;

type Base = Omit<Content, keyof Story | "name"> & { name: string };

const BASE: Record<string, Base> = {
  sales: {
    short: "Sales", name: "Sales teams & SDRs", kicker: "Default", desc: "Fill pipeline with verified decision-makers across every channel.",
    eyebrow: "Multi-channel engagement for sales teams",
    h1a: "Fill your pipeline.", h1b: "Every channel, one engine.",
    sub: "Premium Leads finds verified decision-makers, engages them across LinkedIn, email, phone and video, and books the meeting — automatically.",
    chip: "Booking meetings from day one",
    channels: ["LinkedIn", "Email", "Phone", "Video"],
    stats: [{ v: "+$15M", l: "ACV added in 6 months" }, { v: "4×", l: "more touchpoints per prospect" }, { v: "Day 1", l: "first hot leads" }],
    trust: ["Verified contact data", "Works with any LinkedIn, ZoomInfo, Crunchbase", "Human-paced automation", "Real-time reporting"],
    capHeading: "Everything an outbound team needs — in one platform.",
    capBlurb: "Identify, enrich and engage. Each capability can be enabled or hidden per audience by your admin.",
    capOrder: ["aiEmployee", "linkedin", "email", "dialer", "voicemail", "enrichment", "chrome", "video", "mobile", "crm"],
    capCopy: {},
    ucHeading: "Built for the way your team sells.", ucSub: "Pick your audience to see the page tailored to it.",
    useCaseCols: [{ title: "Organizations", items: ["Solopreneur", "SMB", "Enterprise", "B2B", "Outbound", "Inbound"] }, { title: "Teams", items: ["Business dev reps", "BD managers", "Sales leaders", "Sales reps", "Account executives"] }, { title: "Industries", items: ["SaaS", "Logistics", "Professional services", "Financial services"] }],
    integrations: ["Salesforce", "HubSpot", "Pipedrive", "Calendly", "HighLevel", "LinkedIn", "ZoomInfo", "Crunchbase"],
    proofHeading: "Because it's our clients that matter most.",
    quotes: [q("In 6 months I've added +$15M in Annual Contract Value, and recruited 3 senior executives to my remote team using the Premium Leads platform.", "CW", "CEO, professional services firm", "Enterprise sales"), q("I have closed +$75k in new business using this platform — it has changed the way I book meetings and engage prospects!", "JR", "Founder & principal", "B2B consulting")],
    faqs: [faq("Which data sources can I target from?", "Any version of LinkedIn works, plus ZoomInfo, Crunchbase or any profile-URL source. Enrichment verifies every contact so you never miss an opportunity."), faq("Will the outreach look automated?", "No. Sequences are paced and randomized to look human, and every message is personalized from enriched data. You control tone, timing and channel mix."), faq("Does it work with my CRM?", "Yes — two-way sync with Salesforce, HubSpot, Pipedrive, Calendly and HighLevel keeps activity, notes and dispositions current on both sides."), faq("How many reps can run campaigns?", "As many as you need. Shared sequences and templates keep the playbook consistent while each rep works their own book."), faq("How quickly will I see results?", "Campaigns go live the day you register. Multiple touchpoints mean most teams see hot replies within the first days of a campaign."), faq("Where do I sign in?", "Existing customers sign in at app.premiumleads.ai. New here? Book a call and we'll set up your account together.")],
    ctaHeading: "Ready to see your pipeline fill itself?",
    ctaSub: "Tell us about your goals and we'll get back to you quickly — or skip the form and grab a time on the calendar.",
    ctaMicro: "15 minutes · No obligation",
    metaTitle: "Premium Leads — Multi-channel engagement for sales teams", metaDesc: "Find verified decision-makers and engage them across LinkedIn, email, phone and video. Book a call.",
  },

  recruiting: {
    short: "Recruiting", name: "Recruiting & talent", kicker: "Talent acquisition", desc: "Source ideal candidates and start the conversation first.",
    eyebrow: "Talent sourcing & candidate engagement",
    h1a: "Find qualified talent.", h1b: "Start the conversation first.",
    sub: "Source ideal candidates by your exact requirements, reach them across LinkedIn, email and phone, and track the funnel from first touch to hire — remote or in-office.",
    chip: "Candidates replying today",
    channels: ["LinkedIn", "Email", "Phone", "SMS"],
    stats: [{ v: "3", l: "senior execs hired in 6 months" }, { v: "Any", l: "LinkedIn plan supported" }, { v: "100%", l: "verified contact data" }],
    trust: ["Remote and in-office hiring", "Works with LinkedIn Recruiter or free", "Candidate-safe pacing", "Funnel reporting per role"],
    capHeading: "Sourcing, outreach and tracking — one talent engine.",
    capBlurb: "The same engagement platform sales teams rely on, tuned for recruiters and talent-acquisition teams.",
    capOrder: ["linkedin", "enrichment", "email", "aiEmployee", "video", "dialer", "voicemail", "chrome", "mobile", "crm"],
    capCopy: { linkedin: "Reach passive candidates with connection requests and InMail-style sequences on any LinkedIn plan.", enrichment: "Verified personal emails and mobile numbers so your outreach lands outside the inbox they ignore.", aiEmployee: "An always-on sourcer that screens profiles against the role and opens the conversation for you.", video: "A 40-second hiring-manager video raises candidate reply rates more than any subject line.", crm: "Sync candidates and stages to your ATS or CRM — Bullhorn, HubSpot and more." },
    ucHeading: "Built for every kind of hiring team.", ucSub: "Pick your audience to see the page tailored to it.",
    useCaseCols: [{ title: "Teams", items: ["In-house talent acquisition", "Agency recruiters", "Executive search", "RPO providers"] }, { title: "Roles you fill", items: ["Executives", "Engineering", "Sales", "Healthcare", "Skilled trades"] }, { title: "Hiring models", items: ["Remote", "Hybrid", "In-office", "Contract"] }],
    integrations: ["LinkedIn", "Bullhorn", "Greenhouse", "Lever", "HubSpot", "Calendly", "Indeed", "ZoomInfo"],
    proofHeading: "Talent teams that hire faster with Premium Leads.",
    quotes: [q("In 6 months I've recruited 3 senior executives to my remote team using the Premium Leads platform — alongside +$15M in new ACV.", "CW", "CEO, professional services firm", "Remote team builder"), q("It has changed the way I book conversations with candidates. Multiple touchpoints mean the right people actually respond.", "TA", "Head of talent", "Logistics")],
    faqs: [faq("Do I need LinkedIn Recruiter?", "No. Any LinkedIn plan works. Recruiter and Sales Navigator searches import directly if you have them."), faq("Is candidate outreach compliant?", "Sequences are paced to look human, honor opt-outs automatically and keep every message tied to a real recruiter identity."), faq("Does it connect to my ATS?", "Yes — candidates, stages and notes sync to Bullhorn, Greenhouse, Lever and HubSpot, with more on request."), faq("Can hiring managers send outreach too?", "Yes. Run sequences on behalf of the hiring manager while the recruiter keeps control of the funnel."), faq("How fast will I build a shortlist?", "Most roles see qualified replies within the first week of a campaign."), faq("Where do I sign in?", "Existing customers sign in at app.premiumleads.ai. New here? Book a call and we'll set up your account together.")],
    ctaHeading: "Ready to fill roles faster?",
    ctaSub: "Tell us about the roles you're hiring for and we'll show you how to build the shortlist — or grab a time on the calendar.",
    ctaMicro: "15 minutes · No obligation",
    metaTitle: "Premium Leads for recruiters — candidate sourcing & outreach", metaDesc: "Source passive candidates and engage them across LinkedIn, email and phone. Track every role from first touch to hire.",
  },

  agency: {
    short: "Agencies", name: "Agencies & white-label", kicker: "Resell", desc: "Offer AI-powered prospecting under your own brand.",
    eyebrow: "White-label for agencies",
    h1a: "Your brand.", h1b: "Our engagement engine.",
    sub: "Offer AI-powered prospecting under your own name. Multi-client workspaces, white-label reporting and margins that scale with every account you add.",
    chip: "Client workspaces live",
    channels: ["LinkedIn", "Email", "Phone", "Video"],
    stats: [{ v: "Unlimited", l: "client workspaces" }, { v: "Your", l: "logo, domain and reports" }, { v: "1", l: "login for every account" }],
    trust: ["Your logo, your domain", "Per-client workspaces", "White-label reporting", "Wholesale pricing"],
    capHeading: "A full outbound stack your clients see as yours.",
    capBlurb: "Turn capabilities on or off per client, and present each one under your agency brand.",
    capOrder: ["aiEmployee", "linkedin", "email", "crm", "enrichment", "video", "dialer", "voicemail", "chrome", "mobile"],
    capCopy: { aiEmployee: "Sell “an AI SDR” as a productized service — it prospects and follows up for every client workspace.", crm: "Push results into each client's own CRM so your reporting shows up where they already look." },
    ucHeading: "For agencies that want outbound as a product.", ucSub: "Pick your audience to see the page tailored to it.",
    useCaseCols: [{ title: "Agency types", items: ["Lead-gen agencies", "Marketing agencies", "Recruiting agencies", "Fractional sales teams"] }, { title: "Offer it as", items: ["AI SDR service", "Appointment setting", "Outbound retainer", "Add-on to retainers"] }, { title: "Client industries", items: ["SaaS", "Professional services", "Logistics", "Local businesses"] }],
    integrations: ["Salesforce", "HubSpot", "Pipedrive", "HighLevel", "Calendly", "Slack", "Zapier", "LinkedIn"],
    proofHeading: "Agencies growing recurring revenue with Premium Leads.",
    quotes: [q("I have closed +$75k in new business using this platform — and now my clients get the same engine under our brand.", "JR", "Agency principal", "B2B marketing agency"), q("One login, every client, branded reporting. It made outbound a product line instead of a service we struggled to staff.", "MK", "Managing partner", "Growth agency")],
    faqs: [faq("Can I put my own brand on it?", "Yes — your logo, colors and a custom domain. Client-facing emails and reports carry your brand only."), faq("How is pricing structured for agencies?", "Wholesale per-workspace pricing so you set your own retail price. Details on the call."), faq("Can clients log in themselves?", "Yes, with role-based access. Or keep it fully managed and send them white-label reports."), faq("Is client data kept separate?", "Every workspace is isolated — contacts, sequences, inboxes and reporting never mix."), faq("Do you offer an affiliate program too?", "Yes. Refer accounts without managing them and earn recurring commission."), faq("Where do I sign in?", "Agency partners sign in at app.premiumleads.ai. New here? Book a call and we'll set up your workspace.")],
    ctaHeading: "Ready to launch outbound under your brand?",
    ctaSub: "Tell us about your agency and the clients you serve — we'll walk you through white-label setup and pricing.",
    ctaMicro: "20 minutes · Partner pricing on the call",
    metaTitle: "Premium Leads white-label — outbound engine for agencies", metaDesc: "Offer AI-powered prospecting under your own brand with multi-client workspaces and white-label reporting.",
  },

  founders: {
    short: "Founders", name: "Founders & solopreneurs", kicker: "Lean teams", desc: "Sell like a team of ten without hiring one.",
    eyebrow: "For founders & solopreneurs",
    h1a: "Sell like a team of ten.", h1b: "Without hiring one.",
    sub: "An AI employee that prospects, follows up and books calls while you build the business — on every channel your buyers actually use.",
    chip: "Follow-ups running while you build",
    channels: ["LinkedIn", "Email", "Video"],
    stats: [{ v: "+$75k", l: "closed by one founder" }, { v: "0", l: "SDRs to hire" }, { v: "24/7", l: "outreach running" }],
    trust: ["Set up in an afternoon", "No sales team required", "Human-paced automation", "Cancel anytime"],
    capHeading: "The whole outbound team, in one seat.",
    capBlurb: "Start with the capabilities you need today and switch on more as you grow.",
    capOrder: ["aiEmployee", "linkedin", "email", "video", "chrome", "mobile", "enrichment", "crm", "dialer", "voicemail"],
    capCopy: { aiEmployee: "Your first hire that never sleeps — it prospects, personalizes and follows up so you only take the meetings.", mobile: "Reply to hot leads between customer calls. Your pipeline fits in your pocket.", chrome: "See a good-fit prospect anywhere on the web? One click adds them to a sequence." },
    ucHeading: "For every founder who is also the sales team.", ucSub: "Pick your audience to see the page tailored to it.",
    useCaseCols: [{ title: "You are", items: ["Solo founder", "Consultant", "Fractional executive", "Coach", "Freelancer"] }, { title: "You sell", items: ["B2B services", "SaaS", "Advisory", "Courses & programs"] }, { title: "Your goal", items: ["First 10 customers", "Consistent pipeline", "Replace cold calling", "Book more demos"] }],
    integrations: ["HubSpot", "Pipedrive", "Calendly", "Gmail", "Outlook", "LinkedIn", "Stripe", "Zapier"],
    proofHeading: "Founders closing more with less.",
    quotes: [q("I have closed +$75k in new business using this platform — it has changed the way I book meetings and engage prospects!", "JR", "Founder & principal", "B2B consulting"), q("I was my own sales team. Now follow-ups happen while I'm heads-down building the product.", "DS", "Solo founder", "SaaS")],
    faqs: [faq("I'm not a salesperson. Will this work for me?", "Yes. Describe your customer in plain language; the platform handles targeting, sequencing and follow-up timing."), faq("How much time does it take each week?", "About an hour: review replies, take the meetings that book. Everything else runs on its own."), faq("Will it sound like me?", "Messages are drafted in your tone from your inputs, and you approve the sequence before it runs."), faq("Do I need a CRM?", "No. Start with the built-in pipeline; connect HubSpot or Pipedrive whenever you're ready."), faq("What does it cost?", "Plans and billing live inside the app. Book a call and we'll recommend the right starting point."), faq("Where do I sign in?", "Existing customers sign in at app.premiumleads.ai. New here? Book a call and we'll set up your account together.")],
    ctaHeading: "Ready to get your time back?",
    ctaSub: "Tell us what you sell and who buys it — we'll show you what your first campaign looks like.",
    ctaMicro: "15 minutes · No obligation",
    metaTitle: "Premium Leads for founders — your AI sales employee", metaDesc: "Prospecting, follow-ups and booked calls on autopilot for founders and solopreneurs.",
  },

  enterprise: {
    short: "Enterprise", name: "Enterprise sales leaders", kicker: "Scale", desc: "Scale outbound across teams and keep control.",
    eyebrow: "Enterprise sales organizations",
    h1a: "Scale outbound.", h1b: "Keep control.",
    sub: "Role-based workspaces, CRM-native sync, compliance guardrails and reporting that shows exactly which touchpoints move revenue.",
    chip: "Synced to Salesforce",
    channels: ["LinkedIn", "Email", "Phone", "Video"],
    stats: [{ v: "+$15M", l: "ACV in 6 months" }, { v: "2-way", l: "CRM sync" }, { v: "Team", l: "level reporting" }],
    trust: ["SSO & role-based access", "Two-way Salesforce sync", "Compliance guardrails", "Dedicated success manager"],
    capHeading: "Governed, measurable, multi-channel engagement at scale.",
    capBlurb: "Standardize the playbook across reps and regions, then measure every touchpoint.",
    capOrder: ["crm", "aiEmployee", "dialer", "email", "linkedin", "enrichment", "voicemail", "video", "chrome", "mobile"],
    capCopy: { crm: "Native two-way sync with Salesforce, HubSpot and Pipedrive — activities, dispositions and attribution land where leadership looks.", dialer: "Team dialer with local presence, call recording and dispositions that roll up into coaching dashboards.", aiEmployee: "Deploy AI SDRs per territory under shared guardrails — approved messaging, send windows and suppression lists." },
    ucHeading: "Built for sales organizations at scale.", ucSub: "Pick your audience to see the page tailored to it.",
    useCaseCols: [{ title: "Teams", items: ["SDR / BDR orgs", "Field sales", "Inside sales", "Partner & channel"] }, { title: "Leaders", items: ["CRO", "VP Sales", "RevOps", "Sales enablement"] }, { title: "Industries", items: ["Technology", "Logistics", "Financial services", "Professional services", "Manufacturing"] }],
    integrations: ["Salesforce", "HubSpot", "Pipedrive", "Okta SSO", "Gong", "Outreach", "ZoomInfo", "Slack"],
    proofHeading: "Sales organizations scaling outbound with Premium Leads.",
    quotes: [q("In 6 months I've added +$15M in Annual Contract Value, and recruited 3 senior executives to my remote team using the Premium Leads platform.", "CW", "CEO, professional services firm", "Enterprise sales"), q("Every rep runs the same playbook and every touch lands in Salesforce. Forecasting finally reflects real activity.", "RP", "VP Sales", "Enterprise logistics")],
    faqs: [faq("How does the Salesforce integration work?", "Native two-way sync: leads, contacts, activities and dispositions flow both directions with field mapping you control."), faq("Do you support SSO and role-based access?", "Yes — SAML SSO (Okta, Azure AD) plus roles for admins, managers and reps with territory-level visibility."), faq("How do you keep outreach compliant?", "Central suppression lists, approved templates, send-window limits and a full audit trail on every message and call."), faq("Can we run a pilot with one team first?", "Yes. Most enterprise customers start with one SDR team, then roll out by region once the playbook is proven."), faq("What does onboarding look like?", "A dedicated success manager runs CRM mapping, playbook setup and rep training — typically live within two weeks."), faq("Where do I sign in?", "Customers sign in at app.premiumleads.ai or through your SSO portal. New here? Book a call with our enterprise team.")],
    ctaHeading: "Ready to scale outbound with control?",
    ctaSub: "Tell us about your team size, CRM and goals — we'll scope a pilot with our enterprise team.",
    ctaMicro: "30 minutes · Enterprise team · Security review available",
    metaTitle: "Premium Leads Enterprise — governed multi-channel outbound", metaDesc: "Scale outbound across teams with CRM-native sync, compliance guardrails and revenue attribution.",
  },
};

/* StoryBrand (SB7) layer — the customer is the hero, Premium Leads is the guide.
   Problem → Guide → Plan → Call to action → Stakes → Success. */
const STORY: Record<string, Story> = {
  sales: {
    ctaTransitional: "See the plan",
    problemEyebrow: "The problem", problemHeading: "You have a great offer. The right buyers never hear about it.", villain: "Silence from your pipeline",
    problems: [
      { kind: "External", title: "Not enough qualified conversations", body: "Reps spend their day hunting contact data and chasing follow-ups instead of selling." },
      { kind: "Internal", title: "Every month starts at zero", body: "The anxiety of an empty calendar and a forecast built on hope, not activity." },
      { kind: "Philosophical", title: "Good work deserves to be found", body: "Teams that solve real problems shouldn't lose to the loudest competitor with the biggest outbound budget." },
    ],
    engineEyebrow: "Your guide", engineHeading: "We know what it's like to carry the number alone.", engineBody: "Premium Leads was built by operators who ran outbound the hard way. The platform now powers teams that have added eight figures in pipeline — on every channel buyers actually answer.",
    enginePoints: [pt("+$15M ACV in six months", "Added by one professional-services client running Premium Leads campaigns."), pt("Every channel, one engine", "LinkedIn, email, phone and video sequenced together — not four tools duct-taped."), pt("Verified data, human pacing", "Enriched contacts and send patterns that look like a person, because a person is behind them.")],
    howH1: "The plan.", howH2: "Three steps to a full calendar.", howSub: "No long implementation. No new headcount.",
    steps: [step("Book a call", "Tell us who you sell to. We'll map your ideal buyer and the channels they answer."), step("Launch your campaigns", "Import targets from LinkedIn, ZoomInfo or Crunchbase; sequences go live the same day."), step("Take the meetings", "Hot replies land on your calendar. Your reps sell; the system keeps prospecting.")],
    stakesHeading: "Keep doing it by hand, and…", stakes: ["Reps keep spending 60% of their week on research and follow-up", "Warm prospects go cold after the second unanswered email", "Pipeline stays lumpy, and forecasts stay guesses", "The competitor with more SDRs keeps winning the conversation"],
    successHeading: "With Premium Leads, you…",
    success: [{ before: "Hunting for contact data", after: "Verified decision-makers, enriched automatically" }, { before: "One channel, one shot", after: "Five timed touches across LinkedIn, email, phone and video" }, { before: "Empty calendar Mondays", after: "Meetings booked while the team sleeps" }, { before: "Guessing what works", after: "Reports that show which touch created the deal" }],
  },
  recruiting: {
    ctaTransitional: "See how sourcing works",
    problemEyebrow: "The problem", problemHeading: "The best candidates aren't applying. And they aren't answering either.", villain: "The ignored InMail",
    problems: [
      { kind: "External", title: "Passive talent ignores one-off messages", body: "Recruiters send hundreds of InMails for a handful of replies while reqs age." },
      { kind: "Internal", title: "Every open role feels like a fire", body: "Hiring managers escalate, candidates ghost, and you're the one explaining the delay." },
      { kind: "Philosophical", title: "Great people deserve to hear about great roles", body: "A good match shouldn't depend on whether someone happened to check LinkedIn that week." },
    ],
    engineEyebrow: "Your guide", engineHeading: "We've chased the same candidates you have.", engineBody: "Premium Leads brings the engagement engine built for sales teams to talent acquisition — the same multi-touch sequencing that fills pipelines now fills shortlists.",
    enginePoints: [pt("3 senior executives hired", "Recruited to a remote team in six months by one client using the platform."), pt("Any LinkedIn plan", "Recruiter, Sales Navigator or free — searches import straight into a campaign."), pt("Candidate-safe pacing", "Human-paced touches that respect opt-outs and protect your employer brand.")],
    howH1: "The plan.", howH2: "From job req to shortlist.", howSub: "Three steps, no new sourcing team.",
    steps: [step("Book a call", "Tell us the roles you're hiring for. We'll map the candidate profile and channels."), step("Launch candidate outreach", "Enriched talent pools get sequenced touches on LinkedIn, email and phone."), step("Screen the replies", "Interested candidates book straight onto the recruiter's calendar.")],
    stakesHeading: "Keep sourcing one message at a time, and…", stakes: ["Reqs stay open past 45 days while hiring managers lose patience", "Your best candidates take the offer from a faster competitor", "Recruiters burn out copy-pasting instead of interviewing", "Agency fees keep covering what your team could do in-house"],
    successHeading: "With Premium Leads, you…",
    success: [{ before: "One InMail and hope", after: "Four timed touches across LinkedIn, email and phone" }, { before: "Starting every search from scratch", after: "Saved talent pools you re-engage when the next req opens" }, { before: "Guessing which recruiter is on track", after: "Sourced → contacted → replied → hired, per role" }, { before: "Weeks to a first screen", after: "Qualified replies in the first week" }],
  },
  agency: {
    ctaTransitional: "See the partner model",
    problemEyebrow: "The problem", problemHeading: "Clients want outbound results. Building the stack yourself kills the margin.", villain: "The unprofitable service line",
    problems: [
      { kind: "External", title: "Outbound is hard to staff and harder to scale", body: "Every new client means more SDR hours, more tools and more things that break." },
      { kind: "Internal", title: "You're saying no to revenue", body: "Turning down lead-gen work — or doing it at a loss — because the delivery doesn't scale." },
      { kind: "Philosophical", title: "Agencies should own their product, not rent it", body: "The relationship is yours. The platform behind it should carry your name." },
    ],
    engineEyebrow: "Your guide", engineHeading: "We built the engine so you don't have to.", engineBody: "Premium Leads runs the same multi-channel platform for agencies that it runs for in-house teams — isolated client workspaces, your branding, wholesale pricing.",
    enginePoints: [pt("Unlimited client workspaces", "Each client's contacts, sequences and inboxes stay separated."), pt("Your logo, your domain", "Clients log in to your product and read your reports. We stay invisible."), pt("Proven on real pipeline", "The same engine behind +$15M ACV and +$75k closed by single operators.")],
    howH1: "The plan.", howH2: "Launch outbound as a product.", howSub: "Three steps to a new recurring service line.",
    steps: [step("Book a partner call", "We walk through white-label setup, workspace model and wholesale pricing."), step("Brand and onboard", "Add your logo and domain, then spin up a workspace per client with their targeting."), step("Deliver and renew", "Campaigns run under each client's identity; branded reports prove ROI every month.")],
    stakesHeading: "Keep piecing it together, and…", stakes: ["Margin disappears into tool subscriptions and SDR hours", "Clients churn when results are inconsistent across accounts", "You keep referring outbound work to someone else", "Another agency productizes the offer first"],
    successHeading: "With Premium Leads, you…",
    success: [{ before: "Five tools per client", after: "One platform, one login, every client" }, { before: "Someone else's brand on the reports", after: "White-label dashboards your clients think you built" }, { before: "Hourly delivery that doesn't scale", after: "Wholesale pricing and recurring retainers" }, { before: "Flat service revenue", after: "A product line that grows with every account" }],
  },
  founders: {
    ctaTransitional: "See how it works",
    problemEyebrow: "The problem", problemHeading: "You built something people need. Selling it is eating your week.", villain: "The follow-up you never sent",
    problems: [
      { kind: "External", title: "No time to prospect consistently", body: "Outreach happens in bursts between building, shipping and serving customers." },
      { kind: "Internal", title: "Feast or famine is exhausting", body: "Great months followed by empty ones — and the quiet worry that you're not a “real” salesperson." },
      { kind: "Philosophical", title: "Builders shouldn't have to become SDRs", body: "The best product should get a fair hearing without a sales team behind it." },
    ],
    engineEyebrow: "Your guide", engineHeading: "We've been the founder who was also the sales team.", engineBody: "Premium Leads gives you an AI employee that prospects, follows up and books calls — so the consistency you can't afford in time, you get in software.",
    enginePoints: [pt("+$75k closed by one founder", "New business booked by a solo operator running Premium Leads campaigns."), pt("Zero SDRs to hire", "The whole outbound function in one seat, from an afternoon of setup."), pt("Your voice, not a bot's", "Messages drafted in your tone from enriched data, approved by you.")],
    howH1: "The plan.", howH2: "Describe your buyer. Take the meetings.", howSub: "Three steps, about an hour a week after launch.",
    steps: [step("Book a call", "Tell us what you sell and who buys it. We'll shape your first campaign together."), step("Let the AI employee work", "Prospecting, personalization and follow-ups run around the clock, paced to look human."), step("Show up and close", "Hot leads land on your calendar. You do the one part only you can do.")],
    stakesHeading: "Keep selling in bursts, and…", stakes: ["Warm leads go cold while you're heads-down shipping", "Revenue swings with your calendar, not your product", "You hire a salesperson before you can afford one", "Someone with a worse product and a sales team wins the account"],
    successHeading: "With Premium Leads, you…",
    success: [{ before: "Outreach when you remember", after: "Five touches per prospect, every time" }, { before: "Cold-calling you dread", after: "LinkedIn, email and video that earn replies" }, { before: "Building or selling", after: "Building while the pipeline fills" }, { before: "Hoping for referrals", after: "A predictable flow of booked calls" }],
  },
  enterprise: {
    ctaTransitional: "See the rollout plan",
    problemEyebrow: "The problem", problemHeading: "Hundreds of reps. Dozens of tools. No single view of what actually moves revenue.", villain: "Ungoverned activity",
    problems: [
      { kind: "External", title: "Fragmented outbound across teams and regions", body: "Every team runs its own playbook and tooling; activity never lands cleanly in the CRM." },
      { kind: "Internal", title: "You can't defend the forecast", body: "Leadership asks what's working and the honest answer is a dozen dashboards that disagree." },
      { kind: "Philosophical", title: "Scale shouldn't mean losing control", body: "Reps deserve the speed of automation; the business deserves compliance and attribution." },
    ],
    engineEyebrow: "Your guide", engineHeading: "We've rolled out outbound across organizations like yours.", engineBody: "Premium Leads gives enterprise sales organizations one governed engine — CRM-native, SSO-ready, with guardrails and attribution built in from day one.",
    enginePoints: [pt("Two-way Salesforce sync", "Leads, activities and dispositions flow both directions with field mapping you control."), pt("Guardrails by default", "Approved templates, send-window limits and suppression lists enforced centrally."), pt("Proven at scale", "+$15M ACV added in six months by one client organization.")],
    howH1: "The plan.", howH2: "Pilot one team. Roll out by region.", howSub: "Three steps with a dedicated success manager at each one.",
    steps: [step("Book a scoping call", "We map your CRM, teams and compliance requirements, then design a pilot."), step("Pilot with one SDR team", "Standardize the playbook, connect the CRM, prove the attribution model."), step("Roll out and measure", "Expand by region with team-level reporting tied to pipeline and ACV.")],
    stakesHeading: "Keep running fragmented outbound, and…", stakes: ["Rep activity never reconciles with the CRM, so attribution stays guesswork", "Compliance exposure grows with every unmanaged tool", "Top performers' playbooks never reach the rest of the floor", "The board keeps asking why more headcount isn't more pipeline"],
    successHeading: "With Premium Leads, you…",
    success: [{ before: "Twelve dashboards that disagree", after: "One view of touches → opportunities → revenue" }, { before: "Each team on its own tools", after: "One governed playbook across regions" }, { before: "Hoping reps stay compliant", after: "Guardrails enforced before send" }, { before: "Headcount as the only lever", after: "AI SDRs per territory under shared rules" }],
  },
};

const AUDIENCE: Record<string, { audience: string; dot: string }> = {
  sales: { audience: "sales teams", dot: "linear-gradient(135deg,#1E88E5,#0C2E63)" },
  recruiting: { audience: "recruiters and talent-acquisition teams", dot: "#00B2EF" },
  agency: { audience: "agencies", dot: "#0C2E63" },
  founders: { audience: "founders and solopreneurs", dot: "#1E88E5" },
  enterprise: { audience: "enterprise sales organizations", dot: "#0D1B2E" },
};

/** The five bundled audiences, in the admin's order. */
export const BUILTIN_VARIANTS: BuiltinVariant[] = Object.keys(BASE).map((slug) => {
  const { name, ...rest } = BASE[slug];
  return {
    slug,
    label: name,
    audience: AUDIENCE[slug].audience,
    dot: AUDIENCE[slug].dot,
    content: { ...rest, ...STORY[slug] } as Content,
  };
});

export const BUILTIN_BY_SLUG: Record<string, BuiltinVariant> = Object.fromEntries(
  BUILTIN_VARIANTS.map((v) => [v.slug, v]),
);

/** The copy every custom page inherits from until the admin overrides it. */
export const CUSTOM_BASE_SLUG = "sales";

/** The base a page's partial override lays over. */
export function baseContentFor(slug: string): Content {
  return (BUILTIN_BY_SLUG[slug] ?? BUILTIN_BY_SLUG[CUSTOM_BASE_SLUG]).content;
}

/** Drops empty/blank override values so they inherit from the base. */
export function stripEmpty<T extends Record<string, unknown>>(override: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(override)) {
    if (v === "" || v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** The page a visitor sees: base copy with the stored override on top. */
export function resolveContent(slug: string, override: Partial<Content> | null | undefined): Content {
  return { ...baseContentFor(slug), ...stripEmpty((override ?? {}) as Record<string, unknown>) } as Content;
}
