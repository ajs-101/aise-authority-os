// ============================================================
// profiles.js  (BACKEND ONLY - never sent to the browser)
// Six voice profiles, company knowledge, compliance rules,
// and login credentials. Imported by the functions.
// ============================================================

const COMPANIES = {
  aise: {
    name: "AI Search Engineers",
    short: "AISE",
    line: "The #1 AI Certified Agency",
    what: "AI Search Engineers positions businesses inside AI generated answers across ChatGPT, Google Gemini, and Microsoft Copilot. We do not chase rankings. We engineer authority, trust, and structured signals so AI systems recognize and select a business as the answer.",
    framework:
      "AI Visibility Audit, then Authority Engineering, then Deploy Authority, then Reinforce Authority.",
    services:
      "Authority Engineering, Answer Engine Optimization, AI Authority Expansion.",
    proof:
      "50 plus AI visibility gaps found, 5 plus AI platforms covered, visibility engineered within 30 to 90 days.",
    site: "aisearchengineers.ai",
    booking: "calendly.com/contact-aisearchengineers/ai-strategy-session",
    phone: "+1 213 399 3240",
  },
  tpx: {
    name: "Trustpoint Xposure",
    short: "TPX",
    line: "AEO Certified PR Agency With Direct Media Control",
    what: "Trustpoint Xposure is an AEO certified PR agency that engineers who AI search chooses. It combines answer engine optimization with direct access to tier one and tier two media, publishers, podcasts, and broadcast platforms, placing clients inside the sources AI systems already trust. Same AEO mission and services as AI Search Engineers.",
    framework:
      "AI Visibility Audit, then Authority Engineering, then Deploy Authority, then Reinforce Authority.",
    services:
      "Authority Engineering, Answer Engine Optimization, AI Authority Expansion, Direct Media Placement.",
    proof:
      "AEO certified, direct tier one media access, authority placements that AI recognizes and repeats.",
    site: "trustpointxposure.com",
    booking: "calendly.com/contact-aisearchengineers/ai-strategy-session",
    phone: "+1 213 399 3240",
  },
};

const COMPLIANCE = `
WRITING RULES, all non negotiable:
- No em dashes or en dashes anywhere.
- No semicolons.
- No colon used in the middle of a sentence.
- No hyphens joining words inside normal prose.
- Short, human sentences. Use natural line breaks and white space like a real LinkedIn post.
- Never invent statistics. If a number appears it must be general and clearly framed as an estimate, never a fabricated precise figure.
- Never promise or guarantee a specific outcome or ranking. Reframe any guarantee as engineered authority. Use phrasing like helps AI read and cite you, designed to, built to, engineered to.
- No corporate filler and no tired cliches.
- It must read like a specific human wrote it, not a brand account.
- Do not name the agency in a salesy way in the body. A soft, natural mention is fine only inside a call to action.
`.trim();

const PROFILES = {
  // ---------------- AHMED (Admin) ----------------
  ahmed: {
    username: "CAO",
    password: "thisisthenewworld",
    role: "admin",
    name: "Syed Muhammad Ahmed",
    title: "Chief Automation Officer",
    company: "aise",
    headline:
      "Chief Automation Officer (CAO) | Building AI Powered Business Operating Systems | Automating Marketing, Sales and Operations with Intelligent Agents",
    about:
      "Computer science background with a systems first mindset. Builds AI powered operating systems and automation ecosystems across marketing, sales, research, and operations. Specializes in AEO, web development for AI visibility, outreach, and workflow automation. Bridges programming, automation, and digital marketing.",
    audience:
      "founders, business owners, and operators who want to automate growth and get found in AI search",
    fingerprint:
      "Technical and clear. Mixes systems and automation language with clean AEO education. Short stacked lines. Often contrasts SEO versus AEO. Plain spoken, confident, slightly builder energy. Uses simple soft CTAs like Comment AI and we will send you the guide. Comfortable being a little hashtag heavy at the end.",
    samples: [
      "AI Rewards Clarity, Not Keywords\n\nMost businesses are optimizing for robots.\nThey forget AI is optimizing for clarity.\nSEO focuses on keywords.\nAEO focuses on clear, structured answers that AI can extract and repeat.\nIf your content is vague, bloated, or inconsistent, AI skips it.\nAEO is about making your expertise easy to quote.\nIf you want to know how to show up in AI answers, send us a message to check your AI presence.",
      "Traffic Is Not the Real Problem\n\nIf your website traffic is dropping, you are not crazy.\nSEO was built for clicks.\nBut now people are getting answers without visiting websites.\nAEO focuses on where decisions actually happen.\nInside AI answers. Inside Google AI Overviews. Inside AI recommended business lists.\nSo instead of asking, how do I get more traffic.\nAsk, how do I get chosen.\nComment AI and we will send you our zero click guide.",
    ],
  },

  // ---------------- AMAN (Member) ----------------
  aman: {
    username: "COO",
    password: "Deadman",
    role: "member",
    name: "Aman Jamil",
    title: "Founder",
    company: "aise",
    headline:
      "Helping Professionals Become the Trusted Answer Across ChatGPT, Gemini and Google AI Search | Founder | AEO | GEO | Digital Authority",
    about:
      "Founder focused on making real expertise legible to AI search. Helps doctors, lawyers, founders, and business owners become the answer that AI recommends through clarity, structure, media authority, and credible third party signals.",
    audience: "doctors, lawyers, founders, and business owners",
    fingerprint:
      "Calm, educational, zero hype. Opens with a sharp scenario or a quiet contrarian observation, often in two short lines. Lots of white space. Core themes are ranked versus recommended, alignment, corroboration, and signals. Uses light, sparing emoji such as a single magnifier or robot. Soft non pushy CTAs, often a free AI Visibility Audit or Comment audit. Never aggressive, always thoughtful.",
    samples: [
      "A prospect just asked AI who the best is in your field.\n\nYou were not in the answer. And you will never know it happened.\n\nThat is the shift quietly changing how doctors, lawyers, founders, and business owners get found. People used to search and choose. Now they ask a model to shortlist for them.\n\nSo the real question is no longer whether you rank. It is whether you get recommended.\n\nIf you want to see what AI says about you today, I am offering a free AI Visibility Audit to show where you stand.\n\nComment audit or send me a message.",
      "Search rewarded keywords. AI rewards corroboration.\n\nWhen a potential client asks ChatGPT or Gemini to recommend someone, the answer does not come from page one of Google. It comes from whatever the model has learned to trust about you across the wider web.\n\nIf three sources describe your expertise three different ways, an answer engine has no reason to feature you with confidence.\n\nConsistency across your website, media mentions, citations, and expert signals is what creates trust.\n\nWhat does AI currently say when someone asks for the best in your field?",
      "A few months ago, getting recommended by AI felt like luck. Now it is something you can engineer.\n\nPeople do not scroll through ten blue links anymore. They ask AI who the best is and they trust the answer.\n\nA lawyer, a PR firm, a niche practice. Different fields, same pattern. None of them got there by publishing more. They got there because their signals lined up enough for AI to read and cite them.\n\nThat is the quiet shift. Search rewarded ranking. AI rewards being the trusted answer.\n\nCurious what AI says about you today?",
    ],
  },

  // ---------------- DACIA (Member) ----------------
  dacia: {
    username: "CMO",
    password: "Dacia",
    role: "member",
    name: "Dacia Wilder",
    title: "Chief Marketing Officer",
    company: "tpx",
    headline:
      "Chief Marketing Officer | Digital Authority and AI Driven PR Strategist | Growth and Brand Visibility Leader | Executive in Media Strategy and Strategic Communications",
    about:
      "Marketing executive with an edge in AI enhanced brand visibility, digital authority, and strategic media positioning. Leads integrated marketing and PR that scales reach and strengthens authority signals across new search paradigms. Turns strategic communications into growth by combining creativity, data, and next generation technology. Delivers narratives that resonate, authority that converts, and visibility that matters.",
    audience:
      "founders, leaders, and brands that want top tier coverage and authority that converts",
    fingerprint:
      "Polished executive voice with a marketing strategist edge. Clean, declarative, stacked short lines that build to a point. Frames everything around decisions, credibility, citations, and being chosen. Slightly more brand led and narrative than the others. Confident, never loud. Ends with a clear value framing or a soft invite.",
    samples: [
      "SEO Was Built for Pages. AEO Is Built for Decisions.\n\nSEO asks, how do I rank higher.\nAEO asks, how do I become the answer.\nSearch engines used to send options.\nAI sends conclusions.\nThat means optimization is no longer about keywords.\nIt is about credibility, consistency, and context.\nYou can rank well and still lose the decision.\nOr you can be cited once and win it.\nThe businesses that understand this shift do not just get visibility. They get remembered.",
      "Citations Are the New Trust Signal\n\nHere is the fastest way to tell if AEO is working.\nDoes AI cite you.\nSEO fights for blue links. AEO fights for AI citations inside Google AI Overviews and answer engines.\nBecause citations are the new trust signal.\nThey tell the system this source is safe to repeat.\nIf you are not being cited, you are not being recommended. You are just existing online.",
    ],
  },

  // ---------------- DAVID (Member) ----------------
  david: {
    username: "CEO",
    password: "theboss",
    role: "member",
    name: "David Wilder",
    title: "Chief Executive Officer",
    company: "tpx",
    headline:
      "AEO Certified PR Agency With Direct Media Control. We Engineer Who AI Search Chooses. Do It The Right Way.",
    about:
      "CEO of Trustpoint Xposure. Engineers authority into the places that decide outcomes. Combines AEO certification with direct access to tier one and tier two media, publishers, podcasts, and broadcast platforms. Believes SEO ranks websites and AI selects people, and that the businesses AI names are the ones that win.",
    audience:
      "founders, executives, and competitive professional service firms who want to be the default answer in their category",
    fingerprint:
      "Bold, declarative, and high conviction. Two modes. Mode one is punchy AEO and authority selling with very short stacked lines and a hard hook. Mode two is leadership and reputation content that goes viral, built on a strong opening line, short truths stacked one per line, and a closing question or a Follow David Wilder. Big energy, never soft. IMPORTANT, keep the bold edge but do not promise or guarantee outcomes. Reframe any guarantee as engineered authority, built to force visibility, designed to make AI choose you. Authority that compounds, not promises.",
    samples: [
      "A title is a temporary role.\nCharacter is a permanent record.\n\nPositions fade faster than we think.\nTitles last as long as the signature does.\nPower lasts as long as the mandate does.\nOne decision. One restructuring. One updated org chart.\nAnd everything that felt permanent yesterday suddenly is not yours anymore.\nBut the way you treat people outlasts your name on the door.\nReputation is not built when you get the role.\nIt is built in the small moments no one tracks.\nWhat do you think people will remember when the title is gone.",
      "Most people still think visibility starts with Google.\nIt does not anymore.\n\nToday, clients are asking AI tools like ChatGPT and Gemini who to trust before they ever visit a website.\nAnd AI usually gives one answer.\nIf your brand is not that answer, you are invisible at the exact moment decisions are made.\nThis is why Answer Engine Optimization matters.\nNot hype. Not SEO repackaged.\nBut building the signals AI systems actually use to understand credibility.\nThe question is whether your brand is keeping up.",
      "Most agencies focus on visibility.\nWe focus on authority.\n\nAnyone can generate clicks, impressions, and empty attention.\nVery few can build credibility, trust, and recognition that actually moves business forward.\nWe do not chase noise. We engineer presence.\nData driven PR. Authority that compounds and converts.\nYour story should lead the room, not compete for it.",
    ],
  },

  // ---------------- AASHEEN KHAN (Member) ----------------
  aasheen: {
    username: "Client Success Executive",
    password: "Aasheen@AISE",
    role: "member",
    name: "Aasheen Khan",
    title: "Client Success Executive",
    company: "aise",
    headline:
      "Client Success Executive at AI Search Engineers | Cold Outreach, Client Onboarding and Ongoing Project Management",
    about:
      "Client Success Executive at AI Search Engineers and Trustpoint Xposure. Sits between the client and the work, running cold outreach, onboarding new accounts, and managing projects through delivery. Sees firsthand what professionals believe about AI search when they first arrive, what they get wrong, and what actually changes once their signals line up. Focused on making the client experience clear, organized, and genuinely useful.",
    audience:
      "professionals, founders, and firms exploring AI search visibility for the first time",
    fingerprint:
      "Writes from the client facing seat, not the strategist chair. Grounded, warm, and practical. Her strongest angle is what she observes in real conversations, so posts often open with something a client said, a question that keeps coming up in onboarding, or a pattern she notices across accounts. Plain spoken and human, never lecturing and never hypey. Uses the phrase what I keep hearing, or the question I get most. Short clear lines with white space. Ends with a soft question or an open invitation to ask her something. She explains AEO honestly and simply, from the position of someone who watches it land with real people.",
    samples: [
      "The question I get most during onboarding.\n\nWill AI actually mention me.\n\nIt is a fair question, and the honest answer is that it depends on what AI can currently verify about you.\n\nMost people are surprised by how little that is. Their expertise is real. It is just scattered across places that do not agree with each other.\n\nOnce the signals line up, the answer changes.\n\nHappy to walk anyone through what that looks like.",
      "Something I notice with almost every new client.\n\nThey assume the problem is that they need more content.\n\nThen we look at what AI actually says about them, and the gap is not effort. It is clarity.\n\nDifferent bios in different places. A website that says one thing and a profile that says another.\n\nAI has no reason to trust a picture that does not hold together.\n\nWhat would AI say about you today?",
    ],
  },

  // ---------------- MARIUM KHURRAM (Member) ----------------
  marium: {
    username: "AnswerEngineOptimisationSpecialist",
    password: "admin456",
    role: "member",
    name: "Marium Khurram",
    title: "Answer Engine Optimisation Specialist",
    company: "tpx",
    headline:
      "AEO Systems Visibility and Coordinator at Trustpoint Xposure | Strategic Search, Answer Engine Optimization and Growth",
    about:
      "AEO Systems and Visibility Coordinator at Trustpoint Xposure, an AEO certified company. Helps brands become AI citable, visible, and trusted across traditional search and AI powered platforms. Builds content strategies that align with SEO fundamentals while optimizing for AI Overviews and answer engines, so brands show up in machine generated summaries, answer boxes, and conversational search. Background in SEO strategy, AEO content creation, digital PR and authority building, keyword research, and long and short form writing. Passionate about content that not only ranks but becomes reference worthy for AI systems.",
    audience:
      "brands and businesses that want to be cited and recommended by AI search",
    fingerprint:
      "Content writer and SEO strategist voice. Structured, clear, and practical. Explains the how, not just the why. Comfortable bridging classic SEO and new AEO. Warm and approachable, slightly more polished and editorial than the others. Likes the phrase reference worthy. Short scannable lines with a useful takeaway.",
    samples: [
      "SEO gets you found. AEO gets you chosen.\n\nClassic SEO still matters. It earns the click.\n\nBut AI Overviews and answer engines do something different. They summarize, they cite, and they recommend.\n\nThe brands that win now write content that is structured enough for a machine to quote and trustworthy enough for it to repeat.\n\nThat is the real shift. Not ranking for a keyword, but becoming the reference an answer is built from.",
      "Most content is written to rank.\n\nVery little is written to be cited.\n\nThe difference matters more every month. Answer engines do not reward the longest page. They reward the clearest, most trustworthy, most quotable one.\n\nIf you want to show up inside AI answers, start writing content that is easy for a model to extract and safe for it to repeat.",
    ],
  },
  // ---------------- ABDUL REHMAN (Member) ----------------
  abdul: {
    username: "Abdul Rehman",
    password: "thisisthenewworld",
    role: "member",
    name: "Abdul Rehman",
    title: "AI Automation Developer",
    company: "aise",
    headline:
      "AI AutomationDeveloper | MERN Stack | AI Automation | Web Development",
    about:
      "AI AutomationDeveloper focused on building modern web applications, AI powered workflows, and automation systems. Works across frontend and backend development using JavaScript, React, Node.js, Express, and modern web technologies. Interested in building practical products that combine software development, AI, and automation.",
    audience:
      "businesses, founders, and teams looking for modern web applications, automation, and AI powered solutions",
    fingerprint:
      "Technical, practical, and straightforward. Explains development and AI automation concepts in simple language. Focuses on what is being built, how it works, and the practical result. Uses short clear sentences and avoids unnecessary technical jargon.",
    samples: [
      "AI automation is not just about adding a chatbot.\n\nThe real value comes from connecting AI with the workflows a business already uses.\n\nLead research.\nCustomer support.\nContent generation.\nInternal operations.\n\nWhen these systems work together, AI becomes part of the process instead of another tool sitting on the side.\n\nThat is where automation starts becoming useful.",

      "Building a full stack application is more than writing frontend code.\n\nThe UI is only one part of the system.\n\nYou also need APIs.\nAuthentication.\nDatabase design.\nError handling.\nSecurity.\nDeployment.\n\nA good application is not just something that looks good.\n\nIt needs to work reliably from the browser all the way to the backend.",
    ],
  },
};

module.exports = { COMPANIES, COMPLIANCE, PROFILES };
