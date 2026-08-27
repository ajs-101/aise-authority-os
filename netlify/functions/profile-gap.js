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

// ============================================================
// DATA NORMALIZATION: Remove noise from messy LinkedIn dumps
// ============================================================
// When users Ctrl+A / Ctrl+C from LinkedIn, they often get
// significant noise: nav bar, ads, duplicates, excessive
// whitespace, and non-standard section headers. This normalization
// pipeline cleans the input to ensure accurate analysis.
// ============================================================

// LinkedIn UI and ad patterns that commonly appear in Ctrl+A/Ctrl+C dumps
const LINKEDIN_UI_PATTERNS = [
  /^\s*Ad\s*$/i,
  /^\s*Suggested\s*$/i,
  /^\s*Premium\s+feature/i,
  /^\s*See who's\s+viewed/i,
  /^\s*People\s+also\s+(viewed|liked)/i,
  /^\s*See all/i,
  /^\s*Show more|Show less/i,
  /^\s*View profile|Follow/i,
  /^\s*Message|Connect|Save/i,
  /^\s*Dismiss/i,
  /^\s*Report\s+this(?: profile)?/i,
  /^\s*Block\s+this\s+member/i,
  /^\s*Turn\s+on\s+notifications/i,
  /^\s*Undo/i,
  /^\s*Like/i,
  /^\s*Comment/i,
  /^\s*Share/i,
  /^\s*See.*connections?/i,
  /^\s*\d+\s+(followers?|connections?|posts?)/i,
  /^\s*•\s*(followers?|connections?|posts?)/i,
  /^\s*You have \d+ new/i,
];

/**
 * normalizeProfileData: 6-stage normalization pipeline for messy LinkedIn dumps
 *
 * When users Ctrl+A / Ctrl+C from LinkedIn, they get noise: nav bar, ads,
 * duplicates, excessive whitespace, and non-standard headers. This function
 * cleans the input to ensure accurate profile analysis.
 *
 * Pipeline stages:
 * 1. Remove empty lines and LinkedIn UI patterns (ads, buttons, counters)
 * 2. Collapse excessive whitespace into single newlines
 * 3. De-duplicate adjacent identical lines (case-insensitive)
 * 4. Normalize section header variations (e.g., "Work Experience" -> "experience")
 * 5. Preserve actual profile content as-is
 * 6. Return cleaned text ready for section extraction
 *
 * Example transformation:
 * Input: "Search\nHome\n\nJohn Smith\nAd\n\nAbout\nI build things"
 * Output: "John Smith\nAbout\nI build things"
 */
function normalizeProfileData(text) {
  let lines = String(text || "").split("\n");

  // Stage 1: Remove empty lines and lines matching LinkedIn UI patterns
  lines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return !LINKEDIN_UI_PATTERNS.some((pattern) => pattern.test(trimmed));
  });

  // Stage 2-3: Collapse multiple consecutive whitespace into single newlines
  const collapsed = [];
  let lastNonEmpty = -2;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed) {
      collapsed.push(lines[i]);
      lastNonEmpty = i;
    }
  }

  // Stage 3: De-duplicate adjacent identical lines (case-insensitive)
  // Handles cases where user expanded sections multiple times
  const deduped = [];
  const lastLower = {};
  collapsed.forEach((line) => {
    const lower = line.trim().toLowerCase();
    if (lower !== lastLower.value) {
      deduped.push(line);
      lastLower.value = lower;
    }
  });

  // Stage 4: Normalize section headers to canonical forms
  // Handles variations like "Work Experience", "Professional Experience", etc.
  const normalized = deduped.map((line) => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    // Check if this is a section header and normalize it
    for (const header of SECTION_HEADERS) {
      if (lower === header) {
        return header; // Return the canonical form
      }
    }

    // Handle common variations
    if (/^(work\s+)?experience/i.test(lower)) return "experience";
    if (/^(professional\s+)?experience/i.test(lower)) return "experience";
    if (/^(formal\s+)?education/i.test(lower)) return "education";
    if (/^(licenses?|certifications?|certificates)/i.test(lower))
      return "licenses & certifications";
    if (/^(my\s+)?skills?/i.test(lower)) return "skills";
    if (/^(professional\s+)?headline/i.test(lower)) return "headline";
    if (/^(about\s+(me|yourself))/i.test(lower)) return "about";
    if (/^(recommendations?|testimonials?)/i.test(lower))
      return "recommendations";

    return line; // Not a header, return as-is
  });

  // Stage 5-6: Join and return cleaned text
  return normalized.join("\n");
}

function splitSections(text) {
  // First, normalize the raw pasted data
  const normalized = normalizeProfileData(text);
  const lines = normalized.split("\n");
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
  "premium",
  "learning",
];

const CHROME_PATTERNS = [
  /^\d+$/, // bare counters like "13"
  /^\d+\s*notifications?$/, // "5 notifications"
  /^try premium/i,
  /^see (all|who)/i,
  /^message|connect|save|follow|endorse|recommend/i,
  /^congratulations/i,
  /^unfollow|unfriend/i,
];

/**
 * isChromeLine: Detect if a line is LinkedIn navigation/UI chrome
 * not actual profile content.
 *
 * Detects:
 * - Navigation items (Home, Jobs, Messaging, etc.)
 * - UI counters (bare numbers, "5 notifications", etc.)
 * - Action buttons (Message, Connect, Save, Follow, etc.)
 * - Empty lines
 *
 * Used by extractHeadline() and normalizeProfileData() to filter
 * out nav bar noise that often gets pasted with Ctrl+A/Ctrl+C.
 */
function isChromeLine(l) {
  const t = l.trim().toLowerCase();
  if (!t) return true;
  if (LINKEDIN_CHROME_WORDS.indexOf(t) !== -1) return true;
  return CHROME_PATTERNS.some((p) => p.test(t));
}

/**
 * extractHeadline: Intelligently extract the LinkedIn headline from noisy header lines
 *
 * Improved extraction handles:
 * - Filters out chrome lines (nav bar items) early
 * - Skips metadata (connection counts, endorsements, contact info)
 * - Enforces reasonable length (8-250 chars, matching LinkedIn's limit)
 * - Looks for role indicators and keywords (at, CEO, engineer, etc.)
 * - Recognizes headline format patterns (•, |, separators)
 * - Falls back to first reasonable line if no obvious headline found
 *
 * This prevents false positives where "Search" or "Home" from the nav bar
 * were incorrectly identified as the profile headline.
 *
 * Example inputs/outputs:
 * - ["home", "my network", "john smith"] → "john smith" (chrome filtered)
 * - ["john smith", "senior engineer at acme"] → "senior engineer at acme"
 * - ["ad", "product manager | ai specialist"] → "product manager | ai specialist"
 */
function extractHeadline(headerLines) {
  const nonEmpty = (headerLines || [])
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !isChromeLine(l)); // Filter out chrome lines early

  if (!nonEmpty.length) return "";

  // Look for the headline: typically a line with 8-250 characters
  // that describes a role/title and value proposition
  for (let i = 0; i < nonEmpty.length; i++) {
    const l = nonEmpty[i];
    if (/connections?\s*$/i.test(l)) continue; // Skip metadata
    if (/^contact\s+info$/i.test(l)) continue; // Skip metadata
    if (/^[•·]?\s*(1st|2nd|3rd)\b/i.test(l)) continue; // Skip connection badges
    if (/^\d+\+?\s*(followers|connections)/i.test(l)) continue; // Skip metrics
    if (/^\d+\s*(endorsements?|recommendations?)/i.test(l)) continue; // Skip metrics
    if (/^open to work/i.test(l)) continue; // Skip status badge
    if (/^linkedin member/i.test(l)) continue; // Skip label
    if (l.length < 8) continue; // Too short
    if (l.length > 250) continue; // LinkedIn headlines have a 220-char limit

    // If it looks like a headline (contains role indicators or format patterns)
    if (
      /\b(at|CEO|founder|manager|engineer|designer|director|specialist)\b/i.test(
        l,
      ) ||
      l.includes("•") ||
      l.includes(" | ")
    ) {
      return l;
    }
  }

  // Fallback: return first line that's not chrome and is reasonable length
  for (let i = 0; i < nonEmpty.length; i++) {
    const l = nonEmpty[i];
    if (l.length >= 8 && l.length <= 250) return l;
  }

  return "";
}

function guessRole(headline) {
  if (!headline) return "Professional";
  const clean = headline.trim();

  // If headline contains standard separators like |, •, -, –, —
  const parts = clean.split(/[|•\-–—]/);
  let firstPart = parts[0].trim();

  const atMatch = firstPart.split(/\bat\b/i);
  let roleCandidate = atMatch[0].trim().replace(/\.$/, "");

  // If roleCandidate starts with action verbs (Helping, Building, etc.) or is too long (> 45 chars)
  if (
    /^(helping|building|driving|transforming|scaling|empowering|leading|guiding|connecting|creating|developing|accelerating)\b/i.test(
      roleCandidate,
    ) ||
    roleCandidate.length > 45
  ) {
    // Check if subsequent parts have a concise role title
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i]
        .trim()
        .split(/\bat\b/i)[0]
        .trim()
        .replace(/\.$/, "");
      if (
        p &&
        !/^(helping|building|driving|transforming|scaling|empowering|leading|guiding|connecting)/i.test(
          p,
        ) &&
        p.length <= 45
      ) {
        return p;
      }
    }
    // Search for domain keywords in the headline string
    if (/\b(ai|chatgpt|gemini|search|seo|aeo)\b/i.test(clean)) {
      return "AI & Search Strategy Consultant";
    }
    if (
      /\b(software|developer|engineer|tech|code|fullstack|full-stack)\b/i.test(
        clean,
      )
    ) {
      return "Software Engineer";
    }
    if (/\b(marketing|growth|brand|content)\b/i.test(clean)) {
      return "Growth & Marketing Strategist";
    }
    if (/\b(product|pm|po)\b/i.test(clean)) {
      return "Product Leader";
    }
    return "Industry Specialist";
  }

  return roleCandidate || "Professional";
}

function getPluralRole(role) {
  if (!role) return "Professionals";
  const r = role.trim();
  if (
    /\b(professionals|executives|engineers|managers|leaders|strategists|consultants|founders|developers|specialists|practitioners)\b/i.test(
      r,
    )
  ) {
    return r;
  }
  if (
    r.endsWith("s") ||
    r.endsWith("ch") ||
    r.endsWith("sh") ||
    r.endsWith("x") ||
    r.endsWith("z")
  ) {
    if (r.endsWith("s")) return r;
    return r + "es";
  }
  if (r.endsWith("y") && !/[aeiou]y$/i.test(r)) {
    return r.slice(0, -1) + "ies";
  }
  return r + "s";
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
      fullAbout: about || "",
      fullExperience: experience || "",
      fullSkills: skills || "",
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

function resolveModelName(model) {
  if (!model) return "claude-3-5-sonnet-20241022";
  const m = String(model).toLowerCase();
  if (m.includes("haiku")) return "claude-3-5-haiku-20241022";
  if (m.includes("opus")) return "claude-3-opus-20240229";
  if (m.includes("3-7") || m.includes("3.7"))
    return "claude-3-7-sonnet-20250219";
  return "claude-3-5-sonnet-20241022";
}

async function callClaude(key, model, content, maxTokens) {
  const modelName = resolveModelName(model);
  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
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
  } catch (e) {
    return {
      ok: false,
      error: "Network error calling Anthropic API: " + (e.message || e),
    };
  }

  if (!response.ok) {
    let errDetail = `Anthropic API error (${response.status} ${response.statusText})`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error && errJson.error.message) {
        errDetail += `: ${errJson.error.message}`;
      }
    } catch (e) {}
    console.error(errDetail);
    return { ok: false, error: errDetail };
  }

  try {
    const data = await response.json();
    const aiText = data.content?.[0]?.text || "";
    const firstBrace = aiText.indexOf("{");
    const lastBrace = aiText.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      return {
        ok: false,
        error: "Anthropic response did not contain a valid JSON object",
      };
    }
    const parsed = JSON.parse(aiText.slice(firstBrace, lastBrace + 1));
    return { ok: true, data: parsed };
  } catch (e) {
    return {
      ok: false,
      error: "Failed to parse Anthropic JSON response: " + e.message,
    };
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

// ============================================================
// PREMIUM CONTENT GENERATION: Top-tier LinkedIn standards
// ============================================================
// The content generated must match the quality of LinkedIn's
// most successful profiles: professional, compelling, specific,
// and achievement-focused. Generic templates destroy credibility.
// ============================================================

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
      maxTokens: 600,
      prompt:
        base +
        `You are a world-class LinkedIn personal branding strategist, executive recruiter, and professional positioning expert.

Your job is NOT to simply rewrite the candidate's existing headline.

First analyze the supplied profile and determine:
1. The candidate's actual professional identity.
2. Their strongest areas of expertise.
3. Their most credible differentiators.
4. Their likely target roles.
5. Their strongest evidence of impact.
6. The keywords recruiters would realistically search for.
7. The positioning that would make this candidate immediately understandable and memorable.

EVIDENCE POLICY:
- Use ONLY information supported by PROFILE DATA.
- NEVER invent achievements, revenue, percentages, clients, years of experience, job titles, technologies, certifications, responsibilities, or business outcomes.
- If a metric is not explicitly provided, do not fabricate one.
- Do not convert ordinary responsibilities into fake achievements.
- When evidence is limited, use precise positioning rather than invented numbers.

HEADLINE QUALITY STANDARD:
A premium LinkedIn headline should:
- Immediately communicate who the candidate is.
- Clearly communicate what they specialize in.
- Contain relevant recruiter-search keywords naturally.
- Communicate value or differentiation.
- Sound like a real accomplished professional, not an AI-generated resume.
- Be concise, confident, specific, and memorable.
- Avoid buzzword stacking.
- Avoid empty claims such as "passionate", "results-driven", "innovative", "dynamic", "visionary", "expert" unless directly justified by evidence.
- Avoid excessive separators and keyword stuffing.
- Never sound desperate or overly promotional.

Create THREE substantially different strategic directions:

1. POSITIONING:
A strong personal-brand statement emphasizing what the candidate does and what they are known for.

2. VALUE:
A headline emphasizing the problem the candidate solves and the value they create.

3. RECRUITER SEARCH:
A highly searchable headline using the candidate's strongest legitimate job title, specialization, technologies, and domain keywords.

IMPORTANT:
Do not make all three headlines minor variations of each other.

Before returning the answer, internally evaluate each headline on:
- Specificity
- Credibility
- Recruiter searchability
- Differentiation
- Professional tone
- Clarity
- Memorability
- Evidence grounding

Rewrite any version that feels generic, exaggerated, repetitive, or AI-generated.

Every headline MUST be under 220 characters.

Return ONLY valid JSON:

{
  "headlines": [
    "...",
    "...",
    "..."
  ]
}`,
    };
  }
  if (type === "fixAbout") {
    return {
      maxTokens: 1200,
      prompt:
        base +
        `

Act as an executive headhunter and personal branding expert. Rewrite this LinkedIn 'About' section to mirror a high-performing industry practitioner.

RULES FOR WRITING:
1. First-Person Voice: Write in "I" / "my" tone. Sound like a human talking to a peer, not a third-person corporate press release.
2. Structure for Scannability:
   - Hook (2 sentences): Who I am and the core problem I solve.
   - Core Strengths / What I Do (Bullet points with bold leads): 3-4 key pillars of expertise based strictly on the provided profile text.
   - Proven Track Record: Highlight 2-3 specific achievements or project outcomes.
   - Current Focus / Tech Stack: Tools, frameworks, or methodologies used.
   - Call to Action (CTA): A direct invitation (e.g., "Reach out via DM or email at [email] to discuss [topic]").
3. Absolutely NO AI filler words ("tapestry", "delve", "testament", "realm", "synergy", "unleash").

Return ONLY valid JSON: {"about": "..."}`,
    };
  }
  if (type === "fixExperience") {
    return {
      maxTokens: 1200,
      prompt:
        base +
        `

Act as a Senior Tech Recruiter. Rewrite the Experience section entries using the Google XYZ Formula: "Accomplished [X] as measured by [Y], by doing [Z]".

RULES:
1. Lead with action verbs (Architected, Deployed, Engineered, Reduced, Scaled, Spearheaded).
2. Quantify everything possible (e.g., "reduced render times by 40%", "managed $50K budget", "scaled platform to 10K active users"). If exact metrics aren't provided in the source text, use realistic contextual estimates marked with '~' or placeholder metrics like '[X]%'.
3. Highlight tech stack/tools used inside the bullets (e.g., "...using Next.js, Tailwind, and Node.js").
4. Structure each role cleanly with a 1-sentence role overview followed by 3-4 high-impact accomplishment bullets.

Return ONLY valid JSON: {"experience": "..."}`,
    };
  }
  if (type === "fixSkills") {
    return {
      maxTokens: 600,
      prompt:
        base +
        `

Select and organize 15-20 highly relevant LinkedIn skills extracted directly from this profile.

RULES:
1. Prioritize exact-match search terms recruiters search for on LinkedIn Recruiter.
2. Remove filler skills (e.g., replace "Hard Worker" or "Microsoft Word" with "System Architecture", "REST API Development", "Performance Optimization").
3. Mix primary industry tools (e.g., React, Node.js, Figma) with domain skills (e.g., Agile Development, Frontend Architecture).

Return ONLY valid JSON: {"skills": ["...", "...", "..."]}`,
    };
  }
  if (type === "fixFeatured") {
    return {
      maxTokens: 500,
      prompt:
        base +
        `

You are suggesting Featured section content for a top-tier LinkedIn profile. Featured items should showcase:
1. BEST WORK: Strongest case studies, projects, or portfolio pieces
2. THOUGHT LEADERSHIP: Articles, posts, or insights they've created
3. PROOF OF EXPERTISE: Client testimonials, media mentions, speaking engagements
4. PORTFOLIO LINKS: Websites, portfolios, or booking pages
5. SOCIAL PROOF: Awards, publications, or recognition

Suggest 3-5 specific, actionable ideas based on their role and experience. Make suggestions concrete—not generic.

Return ONLY JSON: {"ideas": ["...", "...", "..."]}`,
    };
  }
  if (type === "fixRecommendations") {
    return {
      maxTokens: 500,
      prompt:
        base +
        `

You are advising on LinkedIn Recommendations strategy for a top profile. Suggest:
1. SPECIFIC RELATIONSHIPS to ask (by role/relationship type, not names)
2. WHY EACH RELATIONSHIP: What specific work or collaboration would they speak to
3. TIMING: When/how to ask (after completing a project, milestone, or successful collaboration)
4. REQUEST STRATEGY: Specific approach to get authentic, detailed recommendations

Return ONLY JSON: {"whoToAsk": [{"relationship": "...", "why": "..."}, ...], "howToAsk": "..."}`,
    };
  }
  return null;
}

const fs = require("fs");
const path = require("path");

function getApiKey(req, event) {
  if (req && req.apiKey) return req.apiKey;
  if (req && req.anthropicKey) return req.anthropicKey;
  if (event && event.headers) {
    if (event.headers["x-api-key"]) return event.headers["x-api-key"];
    if (event.headers["authorization"]) {
      const auth = event.headers["authorization"];
      if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
    }
  }
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

/**
 * localFixFallback: Premium templates for when Claude API is unavailable
 *
 * Dynamically synthesizes content from the extracted profile text so that
 * NO raw bracketed placeholders ([your core expertise], etc.) or spelling
 * errors (like "Searchs") remain.
 */
function localFixFallback(type, localAnalysis) {
  const sectionsFound = (localAnalysis && localAnalysis.sectionsFound) || [];
  const role =
    (localAnalysis &&
      localAnalysis.extracted &&
      localAnalysis.extracted.role) ||
    "Professional";
  const pluralRole = getPluralRole(role);

  // Refuse if we don't have real profile signal
  const noRealSignal =
    sectionsFound.length === 0 && (!role || role === "Professional");
  if (
    noRealSignal &&
    (type === "fixHeadline" || type === "fixAbout" || type === "fixExperience")
  ) {
    return {
      ok: false,
      error:
        "Not enough real profile content detected to safely generate this without Claude API. Please re-check that you pasted your complete LinkedIn profile (not just the nav bar), and make sure your headline and at least one other section (About, Experience, Skills) are included. Or ask an admin to enable the Claude API key in Settings for personalized, AI-generated content.",
    };
  }

  const extractedSkills =
    (localAnalysis &&
      localAnalysis.extracted &&
      localAnalysis.extracted.mentionedButUnlistedSkills) ||
    [];

  if (type === "fixHeadline") {
    const skill1 = extractedSkills[0] || "System Architecture";
    const skill2 = extractedSkills[1] || "Full-Stack Engineering";
    const skill3 = extractedSkills[2] || "AI Automation";

    const headline1 = `Senior ${role} | ${skill1} • ${skill2} • Scalable Web Applications`;
    const headline2 = `${role} Specializing in ${skill1} & ${skill3} | Driving Product Execution & ROI`;
    const headline3 = `Lead ${role} | Re-architecting Legacy Workflows into High-Performance Systems`;

    return {
      ok: true,
      aiGenerated: false,
      warning:
        "Headlines generated based on your profile signals. Connect Claude API key in Settings for AI rewrites.",
      headlines: [headline1, headline2, headline3],
    };
  }

  if (type === "fixAbout") {
    const skillsText =
      extractedSkills.length > 0
        ? extractedSkills.slice(0, 4).join(", ")
        : "modern web architecture, backend APIs, and system optimization";

    const aboutTemplate = `As a ${role}, my focus is on clean architecture, speed, and real business impact using ${skillsText}.

Core Expertise & Pillars:
• Architecture & Design: Engineering scalable, maintainable codebase structures designed for reliability.
• Performance & Scalability: Optimizing application speed, API bottlenecks, and database performance.
• Product Alignment: Bridging technical execution directly with user adoption and organizational ROI.

Proven Track Record:
• Designed and launched scalable platform features that improved user workflow speed and system uptime.
• Streamlined internal development pipelines, improving deployment speed and code quality across projects.

Currently focused on advancing ${role} initiatives and building high-authority software products.

📩 Open to technical discussions, executive advisory, and strategic opportunities. Feel free to connect or send a message directly.`;

    return {
      ok: true,
      aiGenerated: false,
      warning:
        "This personalized draft was synthesized from your profile text. Connect the Claude API key in Settings for a full AI rewrite.",
      about: aboutTemplate,
    };
  }

  if (type === "fixExperience") {
    const skillLead =
      extractedSkills.length > 0
        ? extractedSkills.slice(0, 2).join(" & ")
        : "modern full-stack systems";

    const experienceTemplate = `Lead ${role} — Key Engineering & Business Accomplishments:
• Engineered high-availability ${skillLead} infrastructure, improving system response times and API reliability.
• Re-architected core workflow modules into modular, maintainable components, reducing software defects and build times.
• Partnered closely with product teams to ship key features on schedule, directly improving user engagement metrics.
• Optimized database queries and backend logic, reducing infrastructure overhead while accommodating active user growth.`;

    return {
      ok: true,
      aiGenerated: false,
      warning:
        "Impact-first experience bullets generated from your profile signals. Quantify with your specific numbers where applicable.",
      experience: experienceTemplate,
    };
  }

  if (type === "fixSkills") {
    const mentionedSkills =
      (localAnalysis &&
        localAnalysis.extracted &&
        localAnalysis.extracted.mentionedButUnlistedSkills) ||
      [];

    // Premium skills list: mentioned in profile + strategic additions
    const coreSkills = mentionedSkills.length
      ? mentionedSkills.slice(0, 12)
      : [
          "Strategic Planning",
          "Executive Leadership",
          "Business Strategy",
          "Project Management",
          "Process Optimization",
          "Cross-functional Leadership",
        ];

    // Add high-leverage skills based on role
    const strategySkills = /marketing|product|business|strategy|growth/i.test(
      role,
    )
      ? [
          "Go-to-Market Strategy",
          "Product Strategy",
          "Data-Driven Decision Making",
        ]
      : /engineer|tech|developer|architect/i.test(role)
        ? [
            "System Architecture",
            "Technical Leadership",
            "Software Engineering",
          ]
        : /sales|business dev/i.test(role)
          ? ["Enterprise Sales", "Account Management", "Relationship Building"]
          : ["Strategic Thinking", "Business Acumen", "Team Leadership"];

    const premiumSkills = [...coreSkills, ...strategySkills].slice(0, 20);

    return {
      ok: true,
      aiGenerated: false,
      warning:
        "These skills are extracted from your profile + strategic additions. Prioritize the top 8-12 that best represent your expertise and are most searchable in your field.",
      skills: premiumSkills,
    };
  }

  if (type === "fixFeatured") {
    return {
      ok: true,
      aiGenerated: false,
      ideas: [
        "Case study or portfolio piece: Showcase your strongest or most recent completed project with measurable results",
        "Thought leadership content: Original article, LinkedIn post, or insight that demonstrates your expertise and unique perspective",
        "Media or speaking: Podcast appearances, conference talks, press mentions, or interviews in your industry",
        "Recommendation or testimonial: A strong client testimonial or recommendation that speaks to impact and credibility",
        "Portfolio or services page: Link to your website, portfolio, services page, or booking link for easy next steps",
      ],
    };
  }

  if (type === "fixRecommendations") {
    return {
      ok: true,
      aiGenerated: false,
      whoToAsk: [
        {
          relationship: "Direct manager or executive sponsor",
          why: "Can speak to your performance, impact, and growth trajectory firsthand",
        },
        {
          relationship:
            "Client or key stakeholder you delivered major results for",
          why: "Can validate your expertise and external impact—very credible to prospects",
        },
        {
          relationship: "Peer or colleague from a successful collaboration",
          why: "Can speak to collaboration style, problem-solving, and work quality",
        },
      ],
      howToAsk:
        "Reach out privately with a specific ask: 'I'm strengthening my LinkedIn profile. Would you be open to writing a short recommendation highlighting [specific project/achievement we worked on together]? I'd be happy to reciprocate.' Reference a specific shared success to make it easy for them.",
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

  const key = getApiKey(req, event);
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
      const res = await callClaude(key, req.model, content, fixReq.maxTokens);
      if (res && res.ok && res.data) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.assign({ ok: true, aiGenerated: true }, res.data),
          ),
        };
      }
      const localAnalysis = profileText.trim()
        ? analyzeProfileLocally(profileText)
        : null;
      const fallback = localFixFallback(type, localAnalysis);
      if (res && res.error) fallback.aiError = res.error;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallback),
      };
    } catch (e) {
      const localAnalysis = profileText.trim()
        ? analyzeProfileLocally(profileText)
        : null;
      const fallback = localFixFallback(type, localAnalysis);
      fallback.aiError = e.message || String(e);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallback),
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
        ? "A screenshot of the profile is attached. Evaluate: (1) Professional photo quality and composition, (2) Banner image relevance and visual impact, (3) Overall layout and visual hierarchy, (4) Color and design consistency."
        : "";
      const promptParts = [
        "You are an elite LinkedIn profile strategist specializing in building authority and searchability for high-impact professionals.",
        "Your goal: Identify the SPECIFIC gaps that are costing this person visibility, credibility, and opportunity.",
        "",
        "Evaluate against the standards of top-ranked profiles in their field:",
        "• Headline: Does it convey specific expertise and value (not just a job title)?",
        "• About: Does it tell a compelling story and demonstrate authority with specifics?",
        "• Experience: Are achievements quantified and outcome-focused, not duty-focused?",
        "• Skills: Are they strategic (in-demand + unique) or just obvious/generic?",
        "• Overall: Does the profile position them for their goals? Would a recruiter/client/partner be impressed?",
        "",
        "Provide ACTIONABLE, specific recommendations. Reference their actual experience, role, and content—never generic advice.",
        "Prioritize by impact: What single change would move the needle most?",
        "",
        img,
        "",
        profileText.trim()
          ? `PROFILE TEXT:\n${profileText.trim().slice(0, 12000)}`
          : "No raw text was pasted—rely on the screenshot only.",
        "",
        "Return ONLY a JSON object:",
        '{"overallSummary": "2-3 sentences on their current positioning and biggest opportunity",',
        '"personalizedRecommendations": [{"section": "headline|about|experience|skills|featured|recommendations", "priority": "high|medium|low", "title": "Brief actionable title", "text": "Specific recommendation referencing actual profile content"}],',
        '"visualNotes": "If screenshot provided, evaluation of visual presentation; otherwise null"}',
      ]
        .filter(Boolean)
        .join("\n");
      const content = buildProfileContent(profileText, screenshot, promptParts);
      const res = await callClaude(key, req.model, content, 1500);
      if (res && res.ok && res.data) {
        localResult.aiReview = res.data;
      } else if (res && res.error) {
        localResult.aiError = res.error;
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
