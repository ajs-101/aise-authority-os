// ============================================================
// profile-gap.js  -  LinkedIn Profile Gap & Weakness Analyzer
// Takes a raw pasted LinkedIn profile (Ctrl+A / Ctrl+C dump)
// and, optionally, a profile screenshot, and reports concrete
// gaps and fixes across headline, about, experience, skills,
// featured and recommendations, each scored out of 10, with an
// overall score out of 100, split into Missing / Needs
// Improvement / Strengths, each with a priority level.
//
// Also handles the "Fix It" actions (type: fixHeadline,
// fixAbout, fixExperience, fixSkills, fixFeatured,
// fixRecommendations) that generate the Optimized Profile
// Preview content.
//
// Local rule based analysis always runs so the base report
// works with no API key. If ANTHROPIC_API_KEY is set, Claude
// adds a deeper, personalized review and powers the Fix It
// actions.
// ============================================================

const SECTION_HEADERS = [
  "about",
  "experience",
  "education",
  "licenses & certifications",
  "licenses and certifications",
  "volunteering",
  "skills",
  "recommendations",
  "interests",
  "featured",
  "courses",
  "projects",
  "publications",
  "honors & awards",
  "languages",
  "organizations",
  "activity",
  "causes i support",
];

const GENERIC_WEAK_PHRASES = [
  "responsible for",
  "worked on",
  "duties included",
  "helped with",
  "in charge of",
  "tasked with",
  "involved in",
];

const AI_BUZZWORDS = [
  "delve",
  "dive in",
  "unlock",
  "unleash",
  "elevate",
  "leverage",
  "harness",
  "realm",
  "landscape",
  "tapestry",
  "testament",
  "game changer",
  "supercharge",
  "passionate about",
  "synergy",
  "results-driven",
  "team player",
  "go-getter",
  "results driven",
];

// A broad, cross-discipline keyword library used to spot skills a person
// clearly mentions in About / Experience but has not listed under Skills.
const KEYWORD_LIBRARY = [
  "React.js",
  "React",
  "Node.js",
  "Express.js",
  "MongoDB",
  "TypeScript",
  "JavaScript",
  "Python",
  "Java",
  "REST APIs",
  "GraphQL",
  "AWS",
  "Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "CI/CD",
  "Next.js",
  "Vue.js",
  "Angular",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "Figma",
  "UI/UX Design",
  "Product Management",
  "Project Management",
  "Agile",
  "Scrum",
  "Digital Marketing",
  "SEO",
  "SEM",
  "Content Strategy",
  "Copywriting",
  "Email Marketing",
  "Paid Media",
  "Google Ads",
  "HubSpot",
  "Salesforce",
  "Sales",
  "Business Development",
  "Account Management",
  "Negotiation",
  "Data Analysis",
  "Data Analytics",
  "Power BI",
  "Tableau",
  "Excel",
  "Machine Learning",
  "Artificial Intelligence",
  "Prompt Engineering",
  "Public Speaking",
  "Leadership",
  "Team Management",
  "Recruiting",
  "Customer Success",
  "Client Relations",
  "Branding",
  "Graphic Design",
  "Video Editing",
  "Photography",
  "Content Creation",
  "Storytelling",
];

const PRIORITY = { HIGH: "high", MEDIUM: "medium", LOW: "low" };

function splitSections(text) {
  const lines = String(text || "").split("\n");
  const sections = { header: [] };
  let current = "header";
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim().toLowerCase();
    if (SECTION_HEADERS.indexOf(t) !== -1) {
      current = t;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    sections[current].push(raw);
  }
  return sections;
}

function blockText(lines) {
  return (lines || []).join("\n").trim();
}

// Lines that are LinkedIn chrome (top nav, notifications panel, sidebar),
// not actual profile content. Seen in the wild when someone Ctrl+A's the
// nav bar instead of scrolling to their profile page first.
const LINKEDIN_CHROME_WORDS = [
  "notifications",
  "search",
  "home",
  "my network",
  "jobs",
  "messaging",
  "notification",
  "me",
  "network",
  "for business",
  "try premium for",
];

function isChromeLine(l) {
  const t = l.trim().toLowerCase();
  if (!t) return true;
  if (/^\d+$/.test(t)) return true; // bare counters like "13"
  if (/^\d+\s*notifications?$/.test(t)) return true;
  return LINKEDIN_CHROME_WORDS.indexOf(t) !== -1;
}

function extractHeadline(headerLines) {
  const nonEmpty = (headerLines || []).map((l) => l.trim()).filter(Boolean);
  if (!nonEmpty.length) return "";
  for (let i = 1; i < Math.min(nonEmpty.length, 8); i++) {
    const l = nonEmpty[i];
    if (/connections?\s*$/i.test(l)) continue;
    if (/^contact info$/i.test(l)) continue;
    if (/^[•·]?\s*(1st|2nd|3rd)\b/i.test(l)) continue;
    if (/^\d+\+?\s*(followers|connections)/i.test(l)) continue;
    if (isChromeLine(l)) continue;
    if (l.length < 4) continue;
    return l;
  }
  return "";
}

function guessRole(headline) {
  if (!headline) return "";
  const atSplit = headline.split(/\bat\b/i);
  let role = atSplit[0] || headline;
  role = role.split(/[|•\-–—]/)[0];
  return role.trim().replace(/\.$/, "");
}

function countMetrics(text) {
  const m = String(text || "").match(
    /\d+(\.\d+)?\s?(%|percent\b|x\b|\+|k\b|K\b)|\$\s?\d+/g,
  );
  return m ? m.length : 0;
}

function countExperienceEntries(text) {
  const t = String(text || "");
  const m = t.match(/\b(19|20)\d{2}\b\s*(-|–|—|to)\s*(present|(19|20)\d{2})/gi);
  return m ? m.length : 0;
}

function countSkillLines(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/endorsements?$/i.test(l)).length;
}

function countRecommendationBlocks(text) {
  const t = String(text || "").trim();
  if (!t) return 0;
  return t.split(/\n\s*\n/).filter((b) => b.trim().length > 20).length || 1;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function findMentionedButUnlisted(fullTextLower, skillsTextLower) {
  return KEYWORD_LIBRARY.filter((k) => {
    const kl = k.toLowerCase();
    return (
      fullTextLower.indexOf(kl) !== -1 && skillsTextLower.indexOf(kl) === -1
    );
  });
}

function dedupeKeywords(list) {
  const seen = {};
  const out = [];
  list.forEach((k) => {
    const key = k.toLowerCase().replace(/\.js$/, "");
    if (!seen[key]) {
      seen[key] = true;
      out.push(k);
    }
  });
  return out;
}

function analyzeProfileLocally(profileText) {
  const text = String(profileText || "").trim();
  if (!text) {
    return {
      ok: false,
      error:
        "No profile text provided. Paste your full LinkedIn profile text first.",
    };
  }

  const sections = splitSections(text);
  const found = Object.keys(sections).filter(
    (k) => k !== "header" && blockText(sections[k]).length > 0,
  );

  if (found.length === 0) {
    return {
      ok: false,
      error:
        'This does not look like your LinkedIn profile content, no About, Experience, Skills, or other profile sections were found. This usually happens when the top navigation bar or notifications panel got copied instead of the profile page. Go to your profile at linkedin.com/in/your-username, click "See more" on every section, then press Ctrl+A and Ctrl+C on that page and paste it here.',
    };
  }

  const headline = extractHeadline(sections.header);
  const role = guessRole(headline);
  const about = blockText(sections.about);
  const experience = blockText(sections.experience);
  const skills = blockText(sections.skills);
  const recommendations = blockText(sections.recommendations);
  const featured = blockText(sections.featured);
  const certifications = blockText(
    sections["licenses & certifications"] ||
      sections["licenses and certifications"],
  );

  const missing = [];
  const needsImprovement = [];
  const strengths = [];

  function addMissing(section, label, priority) {
    missing.push({ section, label, priority });
  }
  function addImprove(section, label, detail, priority) {
    needsImprovement.push({ section, label, detail: detail || "", priority });
  }
  function addStrength(section, label, detail) {
    strengths.push({ section, label, detail: detail || "" });
  }

  // ---- Headline (score /10) ----
  let headlineScore = 9;
  if (!headline) {
    headlineScore = 0;
    addMissing("headline", "Headline", PRIORITY.HIGH);
  } else {
    const isGeneric =
      /^[^|•\-–—]+\bat\b[^|•\-–—]+$/i.test(headline) && headline.length < 50;
    if (headline.length < 15) {
      headlineScore = 3;
      addImprove(
        "headline",
        "Headline is too short",
        'Your headline "' +
          headline +
          '" gives search and AI systems almost nothing to match you on.',
        PRIORITY.HIGH,
      );
    } else if (isGeneric) {
      headlineScore = 5;
      addImprove(
        "headline",
        "Headline is too generic",
        role
          ? 'Your headline reads as "' +
              headline +
              '". It states the title but not who you help, how, or the keywords people search for a ' +
              role +
              "."
          : 'Your headline "' +
              headline +
              '" states the title but not the value you deliver or searchable keywords.',
        PRIORITY.HIGH,
      );
    } else {
      addStrength(
        "headline",
        "Headline goes beyond a plain job title",
        headline,
      );
    }
  }

  // ---- About (score /10) ----
  let aboutScore = 9;
  const aboutLower = about.toLowerCase();
  const aboutBuzzwords = AI_BUZZWORDS.filter((w) => aboutLower.includes(w));
  const aboutMetrics = countMetrics(about);
  if (!about) {
    aboutScore = 0;
    addMissing("about", "About section", PRIORITY.HIGH);
  } else {
    if (about.length < 150) {
      aboutScore = 3;
      addImprove(
        "about",
        "About section is too short",
        "At " +
          about.length +
          " characters it will not build authority. LinkedIn allows up to 2600, aim for at least 800 to 1200.",
        PRIORITY.MEDIUM,
      );
    } else {
      aboutScore = 6;
      addStrength(
        "about",
        "About section has sufficient length",
        about.length + " characters",
      );
    }
    if (aboutMetrics === 0) {
      aboutScore -= 2;
      addImprove(
        "about",
        "About section lacks specific achievements",
        "No numbers, outcomes, or measurable results found in the About section. Add a specific achievement with a number, scale, or result.",
        PRIORITY.MEDIUM,
      );
    } else {
      aboutScore += 1;
    }
    if (aboutBuzzwords.length) {
      aboutScore -= 1;
      addImprove(
        "about",
        "About section leans on generic filler phrases",
        'Found phrase(s) like "' +
          aboutBuzzwords.slice(0, 3).join('", "') +
          '" that read as generic rather than specific to you.',
        PRIORITY.LOW,
      );
    }
    if (
      !/\?|contact|dm me|message me|reach out|book a|let's talk|email me/i.test(
        about,
      )
    ) {
      aboutScore -= 1;
      addImprove(
        "about",
        "About section has no clear next step",
        "It does not end with a question, invitation, or way to reach you.",
        PRIORITY.LOW,
      );
    }
  }
  aboutScore = clamp(Math.round(aboutScore), 0, 10);

  // ---- Experience (score /10) ----
  let experienceScore = 9;
  const entryCount = countExperienceEntries(experience);
  const metricCount = countMetrics(experience);
  const weakPhrasesFound = GENERIC_WEAK_PHRASES.filter((p) =>
    experience.toLowerCase().includes(p),
  );
  if (!experience) {
    experienceScore = 0;
    addMissing("experience", "Experience descriptions", PRIORITY.HIGH);
  } else if (experience.length < 100) {
    experienceScore = 2;
    addImprove(
      "experience",
      "Experience descriptions only contain job titles",
      "Roles are listed with little or no description underneath them.",
      PRIORITY.HIGH,
    );
  } else {
    experienceScore = 6;
    if (metricCount === 0) {
      experienceScore -= 2;
      addImprove(
        "experience",
        "Experience has no measurable outcomes",
        "No numbers, percentages, or scale found under Experience. Add at least one measurable result per recent role.",
        PRIORITY.HIGH,
      );
    } else {
      experienceScore += 2;
      addStrength(
        "experience",
        "Experience includes measurable results",
        metricCount + " metric-like value(s) found",
      );
    }
    if (weakPhrasesFound.length) {
      experienceScore -= 1;
      addImprove(
        "experience",
        "Experience uses generic duty language",
        'Phrases like "' +
          weakPhrasesFound.slice(0, 2).join('", "') +
          '" describe a duty, not an outcome.',
        PRIORITY.MEDIUM,
      );
    }
  }
  experienceScore = clamp(Math.round(experienceScore), 0, 10);

  // ---- Skills (score /10) ----
  let skillsScore;
  const skillCount = countSkillLines(skills);
  const fullTextLower = text.toLowerCase();
  const skillsLower = skills.toLowerCase();
  const mentionedButUnlisted = dedupeKeywords(
    findMentionedButUnlisted(fullTextLower, skillsLower),
  );
  if (!skills) {
    skillsScore = 0;
    addMissing("skills", "Skills section", PRIORITY.HIGH);
  } else if (skillCount < 5) {
    skillsScore = 3;
    addImprove(
      "skills",
      "Skills section is incomplete",
      "Only about " +
        skillCount +
        " skill(s) listed. LinkedIn allows up to 50 and they power search matching.",
      PRIORITY.HIGH,
    );
  } else if (skillCount < 15) {
    skillsScore = 6;
  } else {
    skillsScore = 9;
    addStrength(
      "skills",
      skillCount + " skills listed",
      "Good coverage for search visibility",
    );
  }
  if (mentionedButUnlisted.length) {
    const roleLine = role
      ? "Your profile is positioned as a " +
        role +
        ", but the Skills section is incomplete."
      : "The Skills section does not list everything you clearly work with.";
    addImprove(
      "skills",
      "Skills mentioned elsewhere are missing from the Skills list",
      roleLine +
        " Based on your experience, consider adding " +
        mentionedButUnlisted.slice(0, 8).join(", ") +
        ".",
      skills ? PRIORITY.MEDIUM : PRIORITY.HIGH,
    );
  }
  skillsScore = clamp(skillsScore, 0, 10);

  // ---- Featured (score /10) ----
  let featuredScore = featured ? 7 : 0;
  if (!featured) {
    addMissing("featured", "Featured section", PRIORITY.MEDIUM);
  } else {
    addStrength(
      "featured",
      "Featured section is present",
      "Best work is pinned to the top of the profile",
    );
  }

  // ---- Recommendations (score /10) ----
  const recCount = countRecommendationBlocks(recommendations);
  let recommendationsScore;
  if (!recommendations) {
    recommendationsScore = 0;
    addMissing("recommendations", "Recommendations", PRIORITY.MEDIUM);
  } else if (recCount < 2) {
    recommendationsScore = 5;
    addImprove(
      "recommendations",
      "Only one recommendation found",
      "A single recommendation is a start, but 3 or more from different relationships builds stronger social proof.",
      PRIORITY.MEDIUM,
    );
  } else {
    recommendationsScore = 9;
    addStrength(
      "recommendations",
      recCount + " recommendation(s) found",
      "Good social proof",
    );
  }

  // ---- Certifications (low priority extra, not part of the 6 core scores) ----
  if (!certifications) {
    addImprove(
      "certifications",
      "No licenses or certifications listed",
      "Adding relevant certifications reinforces expertise and can improve search matching.",
      PRIORITY.LOW,
    );
  }

  // General strength
  if (found.length >= 4) {
    addStrength(
      "general",
      "Good profile information",
      found.length + " section(s) detected on the profile",
    );
  }

  const sectionScores = {
    headline: headlineScore,
    about: aboutScore,
    experience: experienceScore,
    skills: skillsScore,
    featured: featuredScore,
    recommendations: recommendationsScore,
  };

  const sum = Object.keys(sectionScores).reduce(
    (a, k) => a + sectionScores[k],
    0,
  );
  const overallScore = Math.round((sum / 60) * 100);

  return {
    ok: true,
    overallScore,
    sectionScores,
    missing,
    needsImprovement,
    strengths,
    sectionsFound: found,
    extracted: {
      headline: headline || null,
      role: role || null,
      aboutPreview: about ? about.slice(0, 220) : null,
      experienceEntries: entryCount,
      skillsCount: skillCount,
      mentionedButUnlistedSkills: mentionedButUnlisted,
    },
  };
}

function parseDataUrl(dataUrl) {
  const m = /^data:(.+?);base64,(.+)$/.exec(String(dataUrl || ""));
  if (!m) return null;
  return { mediaType: m[1], data: m[2] };
}

async function callClaude(key, model, content, maxTokens) {
  const modelName =
    model === "claude-haiku-4-5"
      ? "claude-3-5-haiku-20241022"
      : "claude-3-5-sonnet-20241022";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: maxTokens || 1200,
      messages: [{ role: "user", content }],
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const aiText = data.content?.[0]?.text || "";
  const firstBrace = aiText.indexOf("{");
  const lastBrace = aiText.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(aiText.slice(firstBrace, lastBrace + 1));
  } catch (e) {
    return null;
  }
}

function buildProfileContent(profileText, screenshotDataUrl, promptText) {
  const content = [];
  const img = screenshotDataUrl ? parseDataUrl(screenshotDataUrl) : null;
  if (img) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    });
  }
  content.push({ type: "text", text: promptText });
  return content;
}

// ---- Fix It action prompt builders. Each returns {content, maxTokens} ----
function fixActionRequest(type, profileText, extra) {
  const text = String(profileText || "")
    .trim()
    .slice(0, 12000);
  const base = text
    ? `PROFILE TEXT:\n${text}`
    : "No profile text was provided.";

  if (type === "fixHeadline") {
    return {
      maxTokens: 500,
      prompt:
        base +
        '\n\nWrite 3 distinct, improved LinkedIn headline options, each under 220 characters, that state who this person helps, how, and include relevant searchable keywords. Base them only on facts present above, do not invent employers or credentials. Return ONLY JSON: {"headlines": ["...", "...", "..."]}',
    };
  }
  if (type === "fixAbout") {
    return {
      maxTokens: 900,
      prompt:
        base +
        '\n\nRewrite the About section. Make it specific and achievement focused, 3 to 5 short paragraphs, end with a clear next step (a question or a way to reach them). Use only facts present above, never invent employers, numbers, or credentials that are not implied by the source text. Return ONLY JSON: {"about": "..."}',
    };
  }
  if (type === "fixExperience") {
    return {
      maxTokens: 900,
      prompt:
        base +
        '\n\nRewrite the Experience section descriptions to be outcome focused. Each bullet should start with a strong action verb and describe a result, not just a duty. Stay truthful to the source, do not invent numbers or facts not implied above. Return ONLY JSON: {"experience": "..."}',
    };
  }
  if (type === "fixSkills") {
    return {
      maxTokens: 400,
      prompt:
        base +
        '\n\nList 10 to 20 specific skills this person should list on LinkedIn, based only on their actual experience and role described above. Return ONLY JSON: {"skills": ["...", "..."]}',
    };
  }
  if (type === "fixFeatured") {
    return {
      maxTokens: 400,
      prompt:
        base +
        '\n\nSuggest 3 to 5 specific ideas for what this person could pin in their LinkedIn Featured section, based on their role and content above. Return ONLY JSON: {"ideas": ["...", "..."]}',
    };
  }
  if (type === "fixRecommendations") {
    return {
      maxTokens: 400,
      prompt:
        base +
        '\n\nSuggest which roles or relationships (not names) this person should ask for a LinkedIn recommendation, based on their career above, plus one short tip on how to ask well. Return ONLY JSON: {"whoToAsk": ["...", "..."], "howToAsk": "..."}',
    };
  }
  return null;
}

const fs = require("fs");
const path = require("path");

function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envPath = path.resolve(__dirname, "../../.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    }
  } catch (e) {}
  return null;
}

function localFixFallback(type, localAnalysis) {
  const sectionsFound = (localAnalysis && localAnalysis.sectionsFound) || [];
  const role =
    (localAnalysis &&
      localAnalysis.extracted &&
      localAnalysis.extracted.role) ||
    "";

  // Without an API key we can only offer a generic template for
  // headline/about/experience, and a generic template is actively
  // misleading if we could not even detect a real role or any real
  // profile sections (e.g. the nav bar got pasted instead of the
  // profile page). Refuse rather than hand back fabricated content.
  const noRealSignal = sectionsFound.length === 0 || !role;
  if (
    noRealSignal &&
    (type === "fixHeadline" || type === "fixAbout" || type === "fixExperience")
  ) {
    return {
      ok: false,
      error:
        "Not enough real profile content was detected to generate this safely without the Claude API key. Re-check that you pasted your full profile text (not the LinkedIn nav bar), or ask an admin to configure the API key in Settings for a personalized rewrite.",
    };
  }

  if (type === "fixHeadline") {
    return {
      ok: true,
      aiGenerated: false,
      headlines: [
        `${role} | Helping Businesses & Teams Scale with Proven Frameworks & Strategy`,
        `Senior ${role} | Driving Growth, System Optimization & Measured Results`,
        `${role} | Specialized in Authority Building, AEO & High-Impact Execution`,
      ],
    };
  }
  if (type === "fixAbout") {
    return {
      ok: true,
      aiGenerated: false,
      about: `I am a ${role} focused on delivering measurable results and building sustainable systems.\n\nOver the course of my career, I have specialized in turning complex challenges into clear, actionable frameworks. My approach combines strategic clarity with hands-on execution.\n\nKey Focus Areas:\n- Strategy & System Architecture\n- Scalable Operations & Process Optimization\n- Measurable Growth & Impact\n\nIf you'd like to discuss collaboration, strategy, or industry trends, feel free to reach out via DM or connect.`,
    };
  }
  if (type === "fixExperience") {
    return {
      ok: true,
      aiGenerated: false,
      experience: `• Spearheaded key initiatives as ${role}, driving measurable performance improvements across core projects.\n• Designed and deployed structured workflows that increased operational efficiency and team output.\n• Collaborated with cross-functional stakeholders to deliver high-quality outcomes on tight schedules.`,
    };
  }
  if (type === "fixSkills") {
    const list =
      (localAnalysis &&
        localAnalysis.extracted &&
        localAnalysis.extracted.mentionedButUnlistedSkills) ||
      [];
    return {
      ok: true,
      aiGenerated: false,
      skills: list.length
        ? list
        : [
            "Strategic Planning",
            "Project Management",
            "Process Optimization",
            "Leadership",
            "Team Collaboration",
          ],
    };
  }
  if (type === "fixFeatured") {
    return {
      ok: true,
      aiGenerated: false,
      ideas: [
        "Pin your strongest recent LinkedIn post or industry breakdown",
        "Pin a case study, client testimonial, or project result",
        "Pin a link to your portfolio, booking page, or website",
      ],
    };
  }
  if (type === "fixRecommendations") {
    return {
      ok: true,
      aiGenerated: false,
      whoToAsk: [
        "A former manager or executive who evaluated your performance",
        "A client or key stakeholder you delivered strong results for",
        "A colleague who worked closely with you on major projects",
      ],
      howToAsk:
        "Reach out privately with a short message recalling a specific shared project, and offer to write a recommendation for them in return.",
    };
  }
  return {
    ok: false,
    error: "Unknown action type.",
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  let req = {};
  try {
    req = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
    };
  }

  const key = getApiKey();
  const type = req.type || "analyze";
  const profileText = req.profileText || req.text || "";
  const screenshot = req.screenshotDataUrl || req.imageDataUrl || null;

  // ---- Fix It actions ----
  if (type !== "analyze") {
    const fixReq = fixActionRequest(type, profileText);
    if (!fixReq) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Unknown action type." }),
      };
    }
    if (!key) {
      const localAnalysis = profileText.trim()
        ? analyzeProfileLocally(profileText)
        : null;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localFixFallback(type, localAnalysis)),
      };
    }
    try {
      const content = buildProfileContent(profileText, null, fixReq.prompt);
      const parsed = await callClaude(
        key,
        req.model,
        content,
        fixReq.maxTokens,
      );
      if (parsed) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.assign({ ok: true, aiGenerated: true }, parsed),
          ),
        };
      }
      const localAnalysis = profileText.trim()
        ? analyzeProfileLocally(profileText)
        : null;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localFixFallback(type, localAnalysis)),
      };
    } catch (e) {
      const localAnalysis = profileText.trim()
        ? analyzeProfileLocally(profileText)
        : null;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localFixFallback(type, localAnalysis)),
      };
    }
  }

  // ---- Main analysis ----
  if (!profileText.trim() && !screenshot) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error:
          "Paste your profile text (Ctrl+A, Ctrl+C from LinkedIn) or upload a screenshot first.",
      }),
    };
  }

  const localResult = profileText.trim()
    ? analyzeProfileLocally(profileText)
    : {
        ok: true,
        overallScore: null,
        sectionScores: null,
        missing: [],
        needsImprovement: [],
        strengths: [],
        sectionsFound: [],
        extracted: {},
      };

  // If the pasted text was not recognizable profile content (e.g. the nav
  // bar or notifications panel got copied instead), stop here rather than
  // spend an AI call trying to make sense of it.
  if (localResult.ok === false) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(localResult),
    };
  }

  if (key && (req.useAI === undefined || req.useAI)) {
    try {
      const img = screenshot
        ? "A screenshot of the profile is attached, use it to also judge the profile photo, banner image, and overall visual presentation."
        : "";
      const promptParts = [
        "You are an expert LinkedIn profile auditor for AI Search Engineers / Trustpoint Xposure.",
        "Review the profile below and find the real gaps, weaknesses, and missing pieces that hurt authority, credibility, and being found in search.",
        "Personalize every recommendation to the actual role, skills, and experience in the text below, never give generic advice that could apply to anyone.",
        img,
        profileText.trim()
          ? `RAW PASTED PROFILE TEXT:\n${profileText.trim().slice(0, 12000)}`
          : "No raw text was pasted, rely on the screenshot only.",
        "",
        'Return ONLY a JSON object with keys: "overallSummary" (2 to 3 sentences), "personalizedRecommendations" (array of up to 6 objects with "section" one of headline/about/experience/skills/featured/recommendations, "priority" one of high/medium/low, and "text" a specific recommendation that references the actual profile content), "visualNotes" (string or null, only fill if a screenshot was given).',
      ]
        .filter(Boolean)
        .join("\n\n");
      const content = buildProfileContent(profileText, screenshot, promptParts);
      const parsed = await callClaude(key, req.model, content, 1500);
      if (parsed) {
        localResult.aiReview = parsed;
      }
    } catch (e) {
      // Fall back to the local rule based result only.
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(localResult),
  };
};
