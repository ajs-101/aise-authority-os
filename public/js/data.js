// ============================================================
// js/data.js  -  frontend display data only. NO passwords here.
// ============================================================

window.UI = {
  funnels: [
    { key: "TOFU", label: "Top of funnel, educate" },
    { key: "MOFU", label: "Middle, build trust" },
    { key: "BOFU", label: "Bottom, soft convert" },
  ],
  formats: [
    "Educational",
    "Storytelling",
    "Contrarian take",
    "Personal observation",
    "Framework",
    "Checklist",
    "Myth versus reality",
    "Prediction",
    "Short opinion",
    "Question led",
  ],
  tones: [
    "Professional",
    "Conversational",
    "Executive",
    "Educational",
    "Direct and bold",
    "Analytical",
    "Storytelling",
    "Reflective",
  ],
  ctas: [
    "No CTA",
    "Soft question",
    "Share an opinion",
    "Comment a keyword",
    "Open to a DM",
    "Free AI Visibility Audit",
    "Book a strategy call",
    "Follow for more",
  ],
  lengths: [
    { key: "short", label: "Short" },
    { key: "standard", label: "Standard" },
    { key: "long", label: "Long" },
  ],
  postTypes: [
    { key: "auto", label: "Auto (let it choose)" },
    { key: "contrarian", label: "Contrarian take" },
    { key: "pain", label: "Pain-point story" },
    { key: "framework", label: "Framework / how it works" },
    { key: "lesson", label: "Personal lesson" },
    { key: "myth", label: "Myth vs reality" },
    { key: "observation", label: "Observation / trend" },
    { key: "prediction", label: "Bold prediction" },
    { key: "tips", label: "Quick tips / checklist" },
    { key: "question", label: "Question-led" },
  ],
  pillars: [
    "AI Search Education",
    "AEO and Authority Engineering",
    "Search Behavior and Trends",
    "Ranked versus Recommended",
    "Entity Clarity and Structured Data",
    "Media and Citation Authority",
    "Founder and Executive Authority",
    "Leadership and Reputation",
    "Automation and Systems",
    "Myths and Misconceptions",
    "Contrarian Opinions",
    "Future of Discovery",
  ],
  models: [
    { key: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (best balance)" },
    { key: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest)" },
    { key: "claude-opus-4-8", label: "Claude Opus 4.8 (highest quality)" },
  ],
};

// Order shown on the login wall. CEO first.
window.PEOPLE_ORDER = ["david", "dacia", "aman", "ahmed", "aasheen", "marium", "abdul"];

// Display only. The server returns the live profile on login.
window.PEOPLE_DISPLAY = {
  david: {
    name: "David Wilder",
    title: "Chief Executive Officer",
    company: "Trustpoint Xposure",
    initials: "DW",
    accent: "blue",
    admin: false,
  },
  dacia: {
    name: "Dacia Wilder",
    title: "Chief Marketing Officer",
    company: "Trustpoint Xposure",
    initials: "DW",
    accent: "teal",
    admin: false,
  },
  aman: {
    name: "Aman Jamil",
    title: "Founder",
    company: "AI Search Engineers",
    initials: "AJ",
    accent: "emerald",
    admin: false,
  },
  ahmed: {
    name: "Syed Muhammad Ahmed",
    title: "Chief Automation Officer",
    company: "AI Search Engineers",
    initials: "SA",
    accent: "blue",
    admin: true,
  },
  aasheen: {
    name: "Aasheen Khan",
    title: "Client Success Executive",
    company: "AI Search Engineers",
    initials: "AK",
    accent: "emerald",
    admin: false,
  },
  marium: {
    name: "Marium Khurram",
    title: "Answer Engine Optimisation Specialist",
    company: "Trustpoint Xposure",
    initials: "MK",
    accent: "teal",
    admin: false,
  },
  abdul: {
    name: "Abdul Rehman",
    title: "AI Automation Developer",
    company: "AI Search Engineers",
    initials: "AR",
    accent: "blue",
    admin: true,
  },
};
