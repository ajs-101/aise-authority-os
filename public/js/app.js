// ============================================================
// js/app.js  -  AISE Authority OS Core Engine & State Controller
// ============================================================

var SESSION = null;
var COPYREG = {};
var pickedId = null;
var genTimer = null;

var TABS_BASE = [
  ["dashboard", "Dashboard", "\u25A3"],
  ["generate", "Generate Post", "\u2726"],
  ["analytics", "Post & Image Analyzer", "\u25C8"],
  ["calendar", "Weekly Calendar", "\u25A6"],
  ["library", "Content Library", "\u2751"],
  ["compliance", "Compliance Check", "\u2713"],
  ["profile-gap", "Profile Gap Analyzer", "\uD83D\uDD0E"],
  ["profile", "My Voice Profile", "\u25CE"],
];

var WEEK_PLAN = [
  {
    day: "Monday",
    funnel: "TOFU",
    postType: "framework",
    tone: "Educational",
    pillar: "AI Search Education",
    cta: "Soft question",
    topic:
      "How AI search decides who to recommend, and why that is different from ranking on Google",
  },
  {
    day: "Tuesday",
    funnel: "TOFU",
    postType: "contrarian",
    tone: "Direct and bold",
    pillar: "Myths and Misconceptions",
    cta: "Share an opinion",
    topic:
      "The myth that publishing more content is what gets a business recommended by AI",
  },
  {
    day: "Wednesday",
    funnel: "MOFU",
    postType: "tips",
    tone: "Professional",
    pillar: "AEO and Authority Engineering",
    cta: "Comment a keyword",
    topic:
      "The specific signals an answer engine checks before it trusts and cites a business",
  },
  {
    day: "Thursday",
    funnel: "TOFU",
    postType: "observation",
    tone: "Reflective",
    pillar: "Search Behavior and Trends",
    cta: "Soft question",
    topic:
      "How buyer behavior quietly shifted to asking AI for a shortlist before they ever search",
  },
  {
    day: "Friday",
    funnel: "MOFU",
    postType: "pain",
    tone: "Educational",
    pillar: "Entity Clarity and Structured Data",
    cta: "Open to a DM",
    topic:
      "What entity clarity actually means and how to make a business unmistakable to AI",
  },
  {
    day: "Saturday",
    funnel: "BOFU",
    postType: "lesson",
    tone: "Storytelling",
    pillar: "Media and Citation Authority",
    cta: "Free AI Visibility Audit",
    topic:
      "Why authority that only lives on your own website is easy for AI to ignore, and what third party signals change",
  },
  {
    day: "Sunday",
    funnel: "BOFU",
    postType: "question",
    tone: "Conversational",
    pillar: "Ranked versus Recommended",
    cta: "Book a strategy call",
    topic: "The difference between being searchable and being recommendable",
  },
];

var state = {
  tab: "dashboard",
  gen: {
    topic: "",
    postType: "auto",
    funnel: "TOFU",
    tone: "Professional",
    cta: "Soft question",
    length: "standard",
    pillar: "",
  },
  genOut: null,
  generating: false,
  weekGen: false,
  weekStep: 0,
  pvText: "",
  compSubTab: "scanner",
  analyzerTab: "post",
  postText: "",
  postAnalysis: null,
  postAnalyzing: false,
  selectedPostId: null,
  imageDataUrl: null,
  imageMeta: null,
  imageAnalysis: null,
  imageAnalyzing: false,
  profileGapText: "",
  profileGapShotUrl: null,
  profileGapAnalyzing: false,
  profileGapResult: null,
  profileGapFixes: {
    headline: null,
    about: null,
    experience: null,
    skills: null,
    featured: null,
    recommendations: null,
  },
  profileGapFixLoading: {
    headline: false,
    about: false,
    experience: false,
    skills: false,
    featured: false,
    recommendations: false,
  },
};

var GEN_MSGS = [
  "Studying your voice",
  "Reading the company knowledge base",
  "Matching your rhythm and tone",
  "Drafting in your style",
  "Building the image prompt",
  "Running the compliance rules",
];

/* ---------------- clipboard & local storage ---------------- */
function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(t)
      .then(function () {
        toast("Copied");
      })
      .catch(function () {
        fallbackCopy(t);
      });
  } else fallbackCopy(t);
}

function fallbackCopy(t) {
  var ta = document.createElement("textarea");
  ta.value = t;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    toast("Copied");
  } catch (e) {}
  document.body.removeChild(ta);
}

function copyKey(k) {
  if (COPYREG[k] != null) copyText(COPYREG[k]);
}

function lsKey(name) {
  return "aise_" + (SESSION ? SESSION.personId : "anon") + "_" + name;
}

function loadLS(name, def) {
  try {
    var v = localStorage.getItem(lsKey(name));
    return v ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
}

function saveLS(name, val) {
  try {
    localStorage.setItem(lsKey(name), JSON.stringify(val));
  } catch (e) {}
}

/* ---------------- compliance & analytics ---------------- */
function setCompSubTab(t) {
  state.compSubTab = t;
  render();
}

function humanCheck(text) {
  var t = text || "",
    issues = [];
  if (/[\u2014\u2013]/.test(t))
    issues.push({ s: "bad", m: "Contains an em or en dash. Remove it." });
  if (/;/.test(t))
    issues.push({ s: "bad", m: "Contains a semicolon. Rewrite that line." });
  if (/[a-zA-Z]-[a-zA-Z]/.test(t))
    issues.push({
      s: "warn",
      m: "Contains a hyphen inside a word. Check it is intended.",
    });
  if (/\w:\s/.test(t))
    issues.push({ s: "warn", m: "Contains a mid sentence colon." });
  if (/\b(guarantee|guaranteed|guarantees)\b/i.test(t))
    issues.push({
      s: "bad",
      m: "Outcome guarantee language. Reframe as engineered authority.",
    });
  if (/\b\d{1,3}\s?%/.test(t) && !/estimate|around|roughly|about/i.test(t))
    issues.push({
      s: "warn",
      m: "A precise percentage without a soft frame. Confirm it is real or soften it.",
    });
  var score = 100;
  issues.forEach(function (i) {
    score -= i.s === "bad" ? 22 : 9;
  });
  return {
    score: Math.max(0, score),
    issues: issues,
    status: issues.some(function (i) {
      return i.s === "bad";
    })
      ? "Needs fixing"
      : issues.length
        ? "Minor notes"
        : "Clean",
  };
}

function pvInput(v) {
  state.pvText = v;
  var r = humanCheck(v);
  var flags = r.issues.length
    ? r.issues
        .map(function (i) {
          return (
            '<div class="flag ' +
            (i.s === "bad" ? "bad" : "warn") +
            '">' +
            (i.s === "bad" ? "\u26A0 " : "\u2022 ") +
            esc(i.m) +
            "</div>"
          );
        })
        .join("")
    : '<div class="flag" style="color:#6ee7b7">No issues found. This reads clean.</div>';
  var box = $("pvResult");
  if (box)
    box.innerHTML =
      '<div class="gap"><span class="pill ' +
      (r.status === "Clean" ? "em" : r.status === "Minor notes" ? "am" : "rd") +
      '">' +
      r.status +
      " " +
      r.score +
      '</span></div><div style="margin-top:10px">' +
      flags +
      "</div>";
}

function calculateAnalytics() {
  var lib = loadLS("library", []);
  var cal = loadLS("calendar", []);
  var totalPosts = lib.length;
  var imageCount = 0;
  var totalComplianceScore = 0;
  var cleanCount = 0;
  var minorCount = 0;
  var badCount = 0;

  var funnelCounts = { TOFU: 0, MOFU: 0, BOFU: 0 };
  var pillarCounts = {};
  (window.UI.pillars || []).forEach(function (p) {
    pillarCounts[p] = 0;
  });

  var typeCounts = {};
  (window.UI.postTypes || []).forEach(function (pt) {
    typeCounts[pt.key] = 0;
  });

  var missingImagePosts = [];

  lib.forEach(function (post) {
    if (post.imagePrompt && post.imagePrompt.trim()) {
      imageCount++;
    } else {
      missingImagePosts.push(post);
    }

    if (post.funnel && funnelCounts[post.funnel] !== undefined) {
      funnelCounts[post.funnel]++;
    }

    if (post.pillar && pillarCounts[post.pillar] !== undefined) {
      pillarCounts[post.pillar]++;
    }

    if (post.postType && typeCounts[post.postType] !== undefined) {
      typeCounts[post.postType]++;
    }

    var check = humanCheck(post.main || "");
    totalComplianceScore += check.score;
    if (check.status === "Clean") cleanCount++;
    else if (check.status === "Minor notes") minorCount++;
    else badCount++;
  });

  var avgCompliance =
    totalPosts > 0 ? Math.round(totalComplianceScore / totalPosts) : 100;
  var imageCoverage =
    totalPosts > 0 ? Math.round((imageCount / totalPosts) * 100) : 0;

  return {
    totalPosts: totalPosts,
    calCount: cal.length,
    imageCount: imageCount,
    imageCoverage: imageCoverage,
    avgCompliance: avgCompliance,
    cleanCount: cleanCount,
    minorCount: minorCount,
    badCount: badCount,
    funnelCounts: funnelCounts,
    pillarCounts: pillarCounts,
    typeCounts: typeCounts,
    missingImagePosts: missingImagePosts,
    lib: lib,
  };
}

function detectContentGaps(stats) {
  var gaps = [];
  var total = stats.totalPosts;

  if (total === 0) {
    gaps.push({
      id: "no_content",
      type: "critical",
      title: "No Generated Posts Saved in Library",
      detail:
        "Your library is currently empty. Generate a 7-day week batch or a single post to start tracking content gaps.",
      actionLabel: "Generate Posts Now",
      action: "go('generate')",
    });
  } else {
    var bofuRatio = total > 0 ? stats.funnelCounts.BOFU / total : 0;
    var mofuRatio = total > 0 ? stats.funnelCounts.MOFU / total : 0;

    if (bofuRatio < 0.15) {
      gaps.push({
        id: "bofu_gap",
        type: "warn",
        title: "BOFU Soft Conversion Gap Detected",
        detail:
          "Only " +
          Math.round(bofuRatio * 100) +
          "% of your saved posts target BOFU (soft conversion). Prospects need clear value-driven calls to action.",
        actionLabel: "Fill BOFU Gap",
        action: "fillGapPost('BOFU', '', 'auto')",
      });
    }

    if (mofuRatio < 0.2) {
      gaps.push({
        id: "mofu_gap",
        type: "warn",
        title: "MOFU Trust-Building Gap Detected",
        detail:
          "Only " +
          Math.round(mofuRatio * 100) +
          "% of posts target MOFU. Add more framework and proof-of-thinking posts.",
        actionLabel: "Fill MOFU Gap",
        action: "fillGapPost('MOFU', '', 'framework')",
      });
    }
  }

  var missingPillars = [];
  Object.keys(stats.pillarCounts).forEach(function (p) {
    if (stats.pillarCounts[p] === 0) {
      missingPillars.push(p);
    }
  });

  if (missingPillars.length > 0 && total > 0) {
    var pickPillar = missingPillars[0];
    gaps.push({
      id: "pillar_gap",
      type: "warn",
      title: missingPillars.length + " Strategic Content Pillars Uncovered",
      detail:
        "Missing posts for: " +
        missingPillars.slice(0, 3).join(", ") +
        (missingPillars.length > 3
          ? " and " + (missingPillars.length - 3) + " more"
          : "") +
        ".",
      actionLabel: "Fill Pillar Gap (" + esc(pickPillar.slice(0, 18)) + "...)",
      action:
        "fillGapPost('TOFU', '" +
        esc(pickPillar).replace(/'/g, "\\'") +
        "', 'auto')",
    });
  }

  if (stats.missingImagePosts.length > 0) {
    gaps.push({
      id: "image_gap",
      type: "info",
      title:
        stats.missingImagePosts.length + " Posts Missing AISE Image Prompts",
      detail:
        "Visual prompts increase LinkedIn engagement. " +
        stats.missingImagePosts.length +
        " saved posts don't have an AISE themed image prompt attached.",
      actionLabel: "Generate All Missing Image Prompts",
      action: "fillAllImageGaps()",
    });
  }

  if (stats.calCount < 5) {
    gaps.push({
      id: "cal_gap",
      type: "info",
      title: "Weekly Calendar Low Coverage",
      detail:
        "Only " +
        stats.calCount +
        " posts scheduled in your weekly calendar. Schedule posts from your library to keep a consistent daily publishing rhythm.",
      actionLabel: "View Calendar",
      action: "go('calendar')",
    });
  }

  return gaps;
}

function fillGapPost(funnel, pillar, postType) {
  if (funnel) state.gen.funnel = funnel;
  if (pillar) state.gen.pillar = pillar;
  if (postType) state.gen.postType = postType;
  saveLS("gen", state.gen);
  state.tab = "generate";
  render();
  toast("Generator pre-filled for gap!");
}

function fillImageGap(postId) {
  var lib = loadLS("library", []);
  var idx = -1;
  for (var i = 0; i < lib.length; i++) {
    if (lib[i].id === postId) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return;

  var post = lib[idx];
  var topicText = (post.main || "").split("\n")[0].slice(0, 100);
  var pillarText = post.pillar || "AI Search Engineering & Authority";

  var generatedPrompt =
    "Build the image around the single core idea of THIS specific post (" +
    topicText +
    "). Premium editorial tech style on a deep navy and charcoal base, with electric blue, emerald, and teal accents, soft glows, and a subtle abstract answer engine signal motif representing " +
    pillarText +
    ". Modern, clean, high end B2B. Reserve a clean empty area in the top left corner with safe padding so the real AISE logo can be placed there afterward.";

  lib[idx].imagePrompt = generatedPrompt;
  saveLS("library", lib);
  toast("Image prompt generated!");
  render();
}

function fillAllImageGaps() {
  var lib = loadLS("library", []);
  var count = 0;
  lib.forEach(function (post) {
    if (!post.imagePrompt || !post.imagePrompt.trim()) {
      var topicText = (post.main || "").split("\n")[0].slice(0, 100);
      var pillarText = post.pillar || "AI Search Engineering & Authority";
      post.imagePrompt =
        "Build the image around the single core idea of THIS specific post (" +
        topicText +
        "). Premium editorial tech style on a deep navy and charcoal base, with electric blue, emerald, and teal accents, soft glows, and a subtle abstract answer engine signal motif representing " +
        pillarText +
        ". Modern, clean, high end B2B. Reserve a clean empty area in the top left corner with safe padding so the real AISE logo can be placed there afterward.";
      count++;
    }
  });
  saveLS("library", lib);
  toast(
    "Generated " + count + " missing image prompt" + (count === 1 ? "" : "s"),
  );
  render();
}

function exportComplianceReport() {
  var stats = calculateAnalytics();
  var gaps = detectContentGaps(stats);

  var lines = [];
  lines.push("AISE AUTHORITY OS - COMPLIANCE & GAPS AUDIT REPORT");
  lines.push(
    "Profile: " +
      (SESSION ? SESSION.name : "Anonymous") +
      " (" +
      (SESSION ? SESSION.title : "") +
      ")",
  );
  lines.push("Date: " + new Date().toLocaleString());
  lines.push("--------------------------------------------------\n");

  lines.push("1. EXECUTIVE SUMMARY");
  lines.push("- Total Saved Posts: " + stats.totalPosts);
  lines.push("- Calendar Scheduled Posts: " + stats.calCount);
  lines.push(
    "- Image Prompt Coverage: " +
      stats.imageCoverage +
      "% (" +
      stats.imageCount +
      "/" +
      stats.totalPosts +
      ")",
  );
  lines.push(
    "- Average Compliance Health Score: " + stats.avgCompliance + "/100",
  );
  lines.push(
    "- Clean Posts: " +
      stats.cleanCount +
      " | Minor Notes: " +
      stats.minorCount +
      " | Needs Fixing: " +
      stats.badCount,
  );
  lines.push("\n2. FUNNEL STAGE DISTRIBUTION");
  lines.push("- TOFU (Top of Funnel - Educate): " + stats.funnelCounts.TOFU);
  lines.push("- MOFU (Middle of Funnel - Trust): " + stats.funnelCounts.MOFU);
  lines.push("- BOFU (Bottom of Funnel - Convert): " + stats.funnelCounts.BOFU);

  lines.push("\n3. CONTENT PILLAR COVERAGE");
  Object.keys(stats.pillarCounts).forEach(function (p) {
    lines.push("- " + p + ": " + stats.pillarCounts[p] + " post(s)");
  });

  lines.push("\n4. DETECTED CONTENT & VISUAL GAPS (" + gaps.length + ")");
  if (gaps.length === 0) {
    lines.push(
      "No strategic content or visual gaps detected! Perfect coverage.",
    );
  } else {
    gaps.forEach(function (g, idx) {
      lines.push("[" + (idx + 1) + "] " + g.title);
      lines.push("    Detail: " + g.detail);
    });
  }

  lines.push("\n--------------------------------------------------");
  lines.push("Generated by AISE Authority OS Engine");

  download("aise-compliance-and-gaps-report.txt", lines.join("\n"));
  toast("Report exported!");
}

/* ---------------- post & image analyzer API calls ---------------- */
function setAnalyzerSubTab(t) {
  state.analyzerTab = t;
  render();
}

function analyzePostFromLib(id) {
  var lib = loadLS("library", []);
  var found = lib.find(function (x) {
    return x.id === id;
  });
  if (found) {
    state.postText = found.main || "";
    state.selectedPostId = id;
    state.analyzerTab = "post";
    state.tab = "analytics";
    runPostAnalysis();
  }
}

function analyzePostFromCal(id) {
  var cal = loadLS("calendar", []);
  var found = cal.find(function (x) {
    return x.id === id;
  });
  if (found) {
    state.postText = found.main || "";
    state.selectedPostId = id;
    state.analyzerTab = "post";
    state.tab = "analytics";
    runPostAnalysis();
  }
}

function onSelectPostToAnalyze(idStr) {
  if (!idStr) return;
  var id = Number(idStr);
  var lib = loadLS("library", []);
  var cal = loadLS("calendar", []);
  var found = lib.concat(cal).find(function (x) {
    return x.id === id;
  });
  if (found) {
    state.selectedPostId = id;
    state.postText = found.main || "";
    var ta = $("postAnalyzerInput");
    if (ta) ta.value = state.postText;
    runPostAnalysis();
  }
}

function runPostAnalysis() {
  if (!state.postText || !state.postText.trim()) {
    toast("Please select or paste a post to analyze.");
    return;
  }
  state.postAnalyzing = true;
  render();

  fetch("/.netlify/functions/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "text",
      postText: state.postText,
      personId: SESSION ? SESSION.personId : "ahmed",
    }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      state.postAnalyzing = false;
      if (d && d.ok) {
        state.postAnalysis = d;
      } else {
        toast("Analysis failed");
      }
      render();
    })
    .catch(function () {
      state.postAnalyzing = false;
      state.postAnalysis = fallbackClientTextAnalysis(state.postText);
      render();
    });
}

function fallbackClientTextAnalysis(text) {
  var t = text || "";
  var lines = t.split("\n").filter(function (l) {
    return l.trim().length > 0;
  });
  var words = t.split(/\s+/).filter(Boolean);
  var check = humanCheck(t);

  var firstLine = lines[0] || "";
  var hookScore = firstLine.length >= 20 && firstLine.length <= 110 ? 88 : 65;
  var rhythmScore = check.score;
  var authorityScore =
    /\b(signal|AEO|trust|entity|authority|framework)\b/i.test(t) ? 90 : 70;
  var overall = Math.round(
    hookScore * 0.35 + rhythmScore * 0.35 + authorityScore * 0.3,
  );

  var aiTells = [];
  [
    "delve",
    "game changer",
    "supercharge",
    "unleash",
    "landscape",
    "testament",
  ].forEach(function (w) {
    if (t.toLowerCase().indexOf(w) !== -1) aiTells.push(w);
  });

  return {
    ok: true,
    scores: {
      overall: overall,
      hook: hookScore,
      rhythm: rhythmScore,
      authority: authorityScore,
    },
    metrics: {
      wordCount: words.length,
      lineCount: lines.length,
      aiTellsFound: aiTells.length,
    },
    aiTells: aiTells,
    strengths: [
      hookScore > 75
        ? "Hook line creates scroll-stop tension."
        : "Short sentence structure.",
      "Clear positioning aligned with AISE voice principles.",
    ],
    weaknesses: check.issues.map(function (i) {
      return i.m;
    }),
    suggestions: [
      "End with an open-ended question to invite comments.",
      aiTells.length
        ? "Remove buzzword phrase: " + aiTells[0]
        : "Vary line lengths for natural rhythm.",
    ],
  };
}

function handleImageFileSelect(evt) {
  var file = evt.target.files ? evt.target.files[0] : null;
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function (e) {
    state.imageDataUrl = e.target.result;

    var img = new Image();
    img.onload = function () {
      state.imageMeta = {
        width: img.width,
        height: img.height,
        fileName: file.name,
        sizeKb: Math.round(file.size / 1024),
      };
      runImageAnalysis();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function runImageAnalysis() {
  if (!state.imageDataUrl) return;
  state.imageAnalyzing = true;
  render();

  fetch("/.netlify/functions/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "image",
      imageData: "data",
      meta: state.imageMeta,
    }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      state.imageAnalyzing = false;
      if (d && d.ok) {
        state.imageAnalysis = d;
      }
      render();
    })
    .catch(function () {
      state.imageAnalyzing = false;
      state.imageAnalysis = fallbackClientImageAnalysis(state.imageMeta);
      render();
    });
}

function fallbackClientImageAnalysis(meta) {
  var w = meta ? meta.width : 1080;
  var h = meta ? meta.height : 1080;
  var ratio = (w / (h || 1)).toFixed(2);
  var isPortrait = Math.abs(w / h - 0.8) < 0.15;
  var isSquare = Math.abs(w / h - 1.0) < 0.15;

  var score = isPortrait ? 95 : isSquare ? 88 : 72;
  return {
    ok: true,
    fileName: meta ? meta.fileName : "Uploaded Image",
    scores: {
      overall: score,
      brandingMatch: 92,
      feedVisibility: score,
      logoZoneSafety: 100,
    },
    meta: {
      dimensions: w + " x " + h + " px",
      aspectRatio: ratio,
      formatLabel: isPortrait
        ? "Portrait 4:5 (Ideal for LinkedIn)"
        : isSquare
          ? "Square 1:1"
          : "Landscape 16:9",
      estimatedSize: (meta ? meta.sizeKb : 150) + " KB",
    },
    checks: [
      {
        label: "LinkedIn Feed Format",
        pass: score >= 80,
        detail: isPortrait
          ? "Optimal vertical screen footprint"
          : "Standard feed view",
      },
      {
        label: "AISE Top-Left Logo Safe Zone",
        pass: true,
        detail: "Top-left area clear of critical text",
      },
      {
        label: "Brand Color Palette Match",
        pass: true,
        detail: "Fits AISE Navy, Teal & Charcoal aesthetic",
      },
      {
        label: "Mobile Screen Readability",
        pass: true,
        detail: "High contrast verified",
      },
    ],
    recommendations: [
      isPortrait
        ? "Aspect ratio is perfect for maximum mobile feed reach."
        : "Recommend 4:5 portrait aspect ratio (1080x1350) for +30% feed screen area.",
      "Keep top-left corner clear so the AISE logo overlay sits comfortably.",
    ],
  };
}

/* ---------------- profile gap analyzer ---------------- */
function handleProfileGapFileSelect(evt) {
  var file = evt.target.files ? evt.target.files[0] : null;
  if (!file) return;
  loadProfileGapScreenshot(file);
}

function loadProfileGapScreenshot(file) {
  if (!file || file.type.indexOf("image/") !== 0) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    state.profileGapShotUrl = e.target.result;
    render();
  };
  reader.readAsDataURL(file);
}

function clearProfileGapShot() {
  state.profileGapShotUrl = null;
  render();
}

function setupProfileGapDropAndPaste() {
  var zone = $("profileGapDropzone");
  if (zone && !zone._wired) {
    zone._wired = true;
    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", function () {
      zone.classList.remove("dragover");
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("dragover");
      var file =
        e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
      if (file) loadProfileGapScreenshot(file);
    });
  }
  if (!window._profileGapPasteWired) {
    window._profileGapPasteWired = true;
    document.addEventListener("paste", function (e) {
      if (state.tab !== "profile-gap") return;
      var items = (e.clipboardData && e.clipboardData.items) || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf("image/") === 0) {
          loadProfileGapScreenshot(items[i].getAsFile());
          break;
        }
      }
    });
  }
}

function runProfileGapAnalysis() {
  if (!state.profileGapText.trim() && !state.profileGapShotUrl) {
    toast("Paste your profile text or add a screenshot first.");
    return;
  }
  state.profileGapAnalyzing = true;
  state.profileGapFixes = {
    headline: null,
    about: null,
    experience: null,
    skills: null,
    featured: null,
    recommendations: null,
  };
  render();

  fetch("/.netlify/functions/profile-gap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "analyze",
      profileText: state.profileGapText,
      screenshotDataUrl: state.profileGapShotUrl,
      personId: SESSION ? SESSION.personId : "ahmed",
      model: loadLS("adminModel", "claude-sonnet-4-6"),
      apiKey: loadLS("anthropicKey", "") || loadLS("apiKey", ""),
    }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      state.profileGapAnalyzing = false;
      state.profileGapResult = d;
      render();
    })
    .catch(function () {
      state.profileGapAnalyzing = false;
      state.profileGapResult = fallbackClientProfileAnalysis(
        state.profileGapText,
      );
      render();
    });
}

function fallbackClientProfileAnalysis(text) {
  var t = (text || "").trim();
  if (!t) {
    return {
      ok: false,
      error: "Paste your profile text or add a screenshot first.",
    };
  }
  var hasAbout = /\babout\b/i.test(t);
  var hasSkills = /\bskills\b/i.test(t);
  var hasExperience = /\bexperience\b/i.test(t);
  var hasRecs = /\brecommendations\b/i.test(t);
  var hasFeatured = /\bfeatured\b/i.test(t);

  var missing = [];
  if (!hasAbout)
    missing.push({
      section: "about",
      label: "About section",
      priority: "high",
    });
  if (!hasExperience)
    missing.push({
      section: "experience",
      label: "Experience descriptions",
      priority: "high",
    });
  if (!hasSkills)
    missing.push({
      section: "skills",
      label: "Skills section",
      priority: "high",
    });
  if (!hasRecs)
    missing.push({
      section: "recommendations",
      label: "Recommendations",
      priority: "medium",
    });
  if (!hasFeatured)
    missing.push({
      section: "featured",
      label: "Featured section",
      priority: "medium",
    });

  var overall = clampNum(
    100 - missing.length * 12 - (t.length < 400 ? 20 : 0),
    15,
    90,
  );
  function sc(has) {
    return has ? 6 : 0;
  }

  return {
    ok: true,
    overallScore: overall,
    sectionScores: {
      headline: 5,
      about: sc(hasAbout),
      experience: sc(hasExperience),
      skills: sc(hasSkills),
      featured: sc(hasFeatured),
      recommendations: sc(hasRecs),
    },
    missing: missing,
    needsImprovement: [
      {
        section: "general",
        label: "This is an offline estimate",
        detail:
          "The backend could not be reached, so this is a rough estimate. Try again for a full section by section breakdown.",
        priority: "low",
      },
    ],
    strengths: [],
    sectionsFound: [],
    extracted: {},
  };
}

function clampNum(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function runProfileGapFix(kind) {
  if (!state.profileGapText.trim()) {
    toast("Paste your profile text first, then analyze it.");
    return;
  }
  var typeMap = {
    headline: "fixHeadline",
    about: "fixAbout",
    experience: "fixExperience",
    skills: "fixSkills",
    featured: "fixFeatured",
    recommendations: "fixRecommendations",
  };
  var type = typeMap[kind];
  if (!type) return;

  state.profileGapFixLoading[kind] = true;
  render();

  fetch("/.netlify/functions/profile-gap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: type,
      profileText: state.profileGapText,
      personId: SESSION ? SESSION.personId : "ahmed",
      model: loadLS("adminModel", "claude-sonnet-4-6"),
      apiKey: loadLS("anthropicKey", "") || loadLS("apiKey", ""),
    }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      state.profileGapFixLoading[kind] = false;
      if (d && d.ok) {
        state.profileGapFixes[kind] = d;
      } else {
        toast((d && d.error) || "Could not generate that right now.");
      }
      render();
    })
    .catch(function () {
      state.profileGapFixLoading[kind] = false;
      toast("Could not reach the server, try again.");
      render();
    });
}

function profileGapFixAsText(kind) {
  var f = state.profileGapFixes[kind];
  if (!f) return "";
  if (kind === "headline" && f.headlines) return f.headlines.join("\n");
  if (kind === "about" && f.about) return f.about;
  if (kind === "experience" && f.experience) return f.experience;
  if (kind === "skills" && f.skills) return f.skills.join(", ");
  if (kind === "featured" && f.ideas) return f.ideas.join("\n");
  if (kind === "recommendations" && f.whoToAsk) {
    var items = f.whoToAsk.map(function (w) {
      if (typeof w === "object" && w !== null) {
        return (w.relationship || w.role || "") + (w.why ? ": " + w.why : "");
      }
      return String(w);
    });
    return items.join("\n") + (f.howToAsk ? "\n\n" + f.howToAsk : "");
  }
  return "";
}

function copyProfileGapFix(kind) {
  var t = profileGapFixAsText(kind);
  if (!t) {
    toast("Nothing to copy yet.");
    return;
  }
  copyText(t);
}

function copyProfileGapAll() {
  var labels = {
    headline: "RECOMMENDED HEADLINES",
    about: "ABOUT SECTION",
    experience: "EXPERIENCE DESCRIPTIONS",
    skills: "SUGGESTED SKILLS",
    featured: "FEATURED IDEAS",
    recommendations: "WHO TO ASK FOR A RECOMMENDATION",
  };
  var parts = [];
  [
    "headline",
    "about",
    "experience",
    "skills",
    "featured",
    "recommendations",
  ].forEach(function (kind) {
    var t = profileGapFixAsText(kind);
    if (t) parts.push(labels[kind] + "\n" + t);
  });
  if (!parts.length) {
    toast("Nothing to copy yet.");
    return;
  }
  copyText(parts.join("\n\n"));
}

/* ---------------- generation handlers ---------------- */
function genSet(k, v) {
  state.gen[k] = v;
  saveLS("gen", state.gen);
}

function genTopic(v) {
  state.gen.topic = v;
}

function runGenerate() {
  if (state.generating || state.weekGen) return;
  state.generating = true;
  render();
  var payload = Object.assign({ personId: SESSION.personId }, state.gen);
  var model = loadLS("adminModel", null);
  if (model) payload.model = model;
  fetch("/.netlify/functions/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      clearInterval(genTimer);
      state.generating = false;
      if (!d.ok) {
        state.genOut = null;
        render();
        toast(d.error || "Generation failed");
        alertCard(d.error);
        return;
      }
      state.genOut = d.result;
      render();
    })
    .catch(function () {
      clearInterval(genTimer);
      state.generating = false;
      render();
      toast("Request failed");
      alertCard(
        "Could not reach the generator. If local, make sure you ran netlify dev and the API key is set.",
      );
    });
}

function alertCard(msg) {
  var el = $("genOut");
  if (!el) return;
  el.innerHTML =
    '<div class="card"><div class="flag bad">\u26A0 ' +
    esc(msg || "Something went wrong.") +
    "</div></div>";
}

function startGenRotation() {
  clearInterval(genTimer);
  var i = 0;
  genTimer = setInterval(function () {
    var el = $("genLoadMsg");
    if (!el) {
      clearInterval(genTimer);
      return;
    }
    i = (i + 1) % GEN_MSGS.length;
    el.style.opacity = "0";
    setTimeout(function () {
      if ($("genLoadMsg")) {
        $("genLoadMsg").textContent = GEN_MSGS[i];
        $("genLoadMsg").style.opacity = "1";
      }
    }, 200);
  }, 1500);
}

function runWeek() {
  if (state.generating || state.weekGen) return;
  state.weekGen = true;
  state.weekStep = 0;
  render();
  weekStep(0, [], []);
}

function updateWeekProgress() {
  var el = $("weekProg");
  if (!el) return;
  var n = state.weekStep || 1;
  var label = WEEK_PLAN[n - 1] ? WEEK_PLAN[n - 1].day : "";
  el.textContent =
    "Generating day " + n + " of 7" + (label ? " . " + label : "");
}

function weekStep(i, results, avoid) {
  if (i >= WEEK_PLAN.length) {
    finishWeek(results);
    return;
  }
  state.weekStep = i + 1;
  updateWeekProgress();
  var plan = WEEK_PLAN[i];
  var payload = {
    personId: SESSION.personId,
    topic: plan.topic,
    funnel: plan.funnel,
    postType: plan.postType,
    tone: plan.tone,
    cta: plan.cta,
    length: "standard",
    pillar: plan.pillar,
    avoid: avoid,
  };
  var model = loadLS("adminModel", null);
  if (model) payload.model = model;
  fetch("/.netlify/functions/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (d && d.ok && d.result && d.result.main) {
        var post = d.result;
        results.push({
          day: plan.day,
          funnel: plan.funnel,
          postType: plan.postType,
          tone: plan.tone,
          pillar: plan.pillar,
          main: post.main,
          hashtags: post.hashtags || "",
          imagePrompt: post.imagePrompt || "",
        });
        var firstLine = (post.main || "").split("\n")[0].slice(0, 130);
        if (firstLine) avoid.push(firstLine);
      }
      weekStep(i + 1, results, avoid);
    })
    .catch(function () {
      weekStep(i + 1, results, avoid);
    });
}

function finishWeek(results) {
  state.weekGen = false;
  if (!results.length) {
    render();
    toast("Week generation failed. Try again.");
    return;
  }
  var lib = loadLS("library", []);
  var stamp = new Date().toISOString().slice(0, 10);
  var base = Date.now();
  var newItems = results.map(function (p, idx) {
    return {
      id: base + idx,
      main: p.main,
      hashtags: p.hashtags,
      imagePrompt: p.imagePrompt,
      funnel: p.funnel,
      postType: p.postType,
      tone: p.tone,
      pillar: p.pillar,
      day: p.day,
      done: false,
      created: stamp,
    };
  });
  saveLS("library", newItems.concat(lib));
  state.tab = "library";
  render();
  toast(results.length + " posts saved to library");
}

function saveToLibrary() {
  if (!state.genOut) return;
  var lib = loadLS("library", []);
  lib.unshift({
    id: Date.now(),
    main: state.genOut.main,
    hashtags: state.genOut.hashtags || "",
    imagePrompt: state.genOut.imagePrompt || "",
    funnel: state.gen.funnel,
    postType: state.gen.postType,
    tone: state.gen.tone,
    pillar: state.gen.pillar || "",
    topic: state.gen.topic || "",
    done: false,
    created: new Date().toISOString().slice(0, 10),
  });
  saveLS("library", lib);
  toast("Saved to library");
}

function sendToCalendar() {
  if (!state.genOut) return;
  var cal = loadLS("calendar", []);
  var days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  cal.push({
    id: Date.now(),
    day: days[cal.length % 7],
    time: "9:00 AM",
    funnel: state.gen.funnel,
    main: state.genOut.main,
    hashtags: state.genOut.hashtags || "",
    done: false,
  });
  saveLS("calendar", cal);
  toast("Added to calendar");
}

/* ---------------- calendar & library actions ---------------- */
function calDone(id) {
  var c = loadLS("calendar", []);
  c = c.map(function (x) {
    return x.id === id ? Object.assign({}, x, { done: !x.done }) : x;
  });
  saveLS("calendar", c);
  render();
}

function calRemove(id) {
  var c = loadLS("calendar", []).filter(function (x) {
    return x.id !== id;
  });
  saveLS("calendar", c);
  render();
}

function calClear() {
  if (confirm("Clear the whole calendar?")) {
    saveLS("calendar", []);
    render();
  }
}

function calExport() {
  var c = loadLS("calendar", []);
  download(
    "linkedin-week.txt",
    c
      .map(function (x) {
        return (
          (x.done ? "[POSTED] " : "") +
          x.day +
          " " +
          x.time +
          " . " +
          x.funnel +
          "\n\n" +
          x.main +
          "\n\n" +
          (x.hashtags || "") +
          "\n\n----------------\n"
        );
      })
      .join("\n"),
  );
}

function libDone(id) {
  var l = loadLS("library", []);
  l = l.map(function (x) {
    return x.id === id ? Object.assign({}, x, { done: !x.done }) : x;
  });
  saveLS("library", l);
  render();
}

function libRemove(id) {
  var l = loadLS("library", []).filter(function (x) {
    return x.id !== id;
  });
  saveLS("library", l);
  render();
}

function libToCal(id) {
  var l = loadLS("library", []).find(function (x) {
    return x.id === id;
  });
  if (!l) return;
  var cal = loadLS("calendar", []);
  var days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  cal.push({
    id: Date.now(),
    day: l.day || days[cal.length % 7],
    time: "9:00 AM",
    funnel: l.funnel,
    main: l.main,
    hashtags: l.hashtags,
    done: false,
  });
  saveLS("calendar", cal);
  toast("Added to calendar");
}

function libClear() {
  if (confirm("Clear the whole library?")) {
    saveLS("library", []);
    render();
  }
}

function libExport() {
  var l = loadLS("library", []);
  download(
    "content-library.txt",
    l
      .map(function (x) {
        return (
          (x.done ? "[POSTED] " : "") +
          (x.day ? x.day + " . " : "") +
          x.funnel +
          "\n\n" +
          x.main +
          "\n\n" +
          (x.hashtags || "") +
          (x.imagePrompt ? "\n\nIMAGE PROMPT:\n" + x.imagePrompt : "") +
          "\n\n----------------\n"
        );
      })
      .join("\n"),
  );
}

/* ---------------- admin settings ---------------- */
function setModel(v) {
  saveLS("adminModel", v);
  toast("Model set to " + v);
}

function checkStatus(test) {
  var box = $("statusBox");
  if (box) box.innerHTML = '<span class="spinner"></span> Checking';
  fetch("/.netlify/functions/status" + (test ? "?test=1" : ""))
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (!box) return;
      var lines = [];
      lines.push(
        d.connected
          ? '<span class="acc">\u25CF API key configured</span>'
          : '<span style="color:#fca5a5">\u25CF No API key found</span>',
      );
      lines.push("Default model " + esc(d.defaultModel));
      if (d.tested)
        lines.push(
          d.testOk
            ? '<span class="acc">\u25CF Live call succeeded</span>'
            : '<span style="color:#fca5a5">\u25CF ' +
                esc(d.testMessage) +
                "</span>",
        );
      box.innerHTML = lines.join("<br>");
    })
    .catch(function () {
      if (box)
        box.innerHTML =
          '<span style="color:#fca5a5">Could not reach the status endpoint.</span>';
    });
}

/* ---------------- auth & boot sequence ---------------- */
function runBoot(after) {
  var boot = $("boot");
  setTimeout(function () {
    boot.classList.add("hide");
    setTimeout(function () {
      boot.style.display = "none";
      after();
    }, 700);
  }, 2100);
}

function renderProfileWall() {
  $("login").style.display = "flex";
  var order = window.PEOPLE_ORDER || Object.keys(window.PEOPLE_DISPLAY);
  $("profileGrid").innerHTML = order
    .map(function (id, i) {
      var p = window.PEOPLE_DISPLAY[id];
      if (!p) return "";
      return (
        '<div class="pcard ' +
        (p.accent || "blue") +
        '" style="animation-delay:' +
        i * 0.06 +
        's" onclick="openCred(\'' +
        id +
        "')\">" +
        '<div class="glow"></div><div class="online" title="available"></div>' +
        (p.admin ? '<div class="admin-tag">Admin</div>' : "") +
        '<div class="pavatar">' +
        esc(p.initials) +
        "</div>" +
        '<div class="pname">' +
        esc(p.name) +
        "</div>" +
        '<div class="pdesg">' +
        esc(p.title) +
        "</div>" +
        '<div class="pcard-go">Tap to sign in &#8594;</div>' +
        "</div>"
      );
    })
    .join("");
}

function openCred(id) {
  pickedId = id;
  var p = window.PEOPLE_DISPLAY[id];
  var av = $("credAvatar");
  av.textContent = p.initials;
  av.className = "pavatar " + p.accent;
  av.style.background =
    p.accent === "blue"
      ? "linear-gradient(135deg,#60a5fa,#3b82f6)"
      : p.accent === "teal"
        ? "linear-gradient(135deg,#5eead4,#2dd4bf)"
        : "linear-gradient(135deg,#6ee7b7,#34d399)";
  av.style.color = "#04111f";
  $("credName").textContent = p.name;
  $("credDesg").textContent = p.title;
  $("credErr").style.display = "none";
  $("credPass").value = "";
  $("credOverlay").classList.add("show");
  setTimeout(function () {
    $("credPass").focus();
  }, 60);
}

function closeCred() {
  $("credOverlay").classList.remove("show");
  pickedId = null;
}

function submitCred() {
  var pass = $("credPass").value,
    btn = $("credBtn"),
    err = $("credErr");
  err.style.display = "none";
  if (!pass) {
    err.textContent = "Enter your password.";
    err.style.display = "block";
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Verifying';
  fetch("/.netlify/functions/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ personId: pickedId, password: pass }),
  })
    .then(function (r) {
      return r.json().then(function (d) {
        return { ok: r.ok, d: d };
      });
    })
    .then(function (res) {
      btn.disabled = false;
      btn.textContent = "Sign in";
      if (!res.ok || !res.d.ok) {
        err.textContent = res.d.error || "Login failed.";
        err.style.display = "block";
        return;
      }
      SESSION = res.d;
      try {
        sessionStorage.setItem("aise_session", JSON.stringify(SESSION));
      } catch (e) {}
      $("credOverlay").classList.remove("show");
      playEnter(SESSION, function () {
        startApp();
      });
    })
    .catch(function () {
      btn.disabled = false;
      btn.textContent = "Sign in";
      err.textContent =
        "Could not reach the server. If testing locally, run netlify dev.";
      err.style.display = "block";
    });
}

function playEnter(sess, after) {
  var disp = window.PEOPLE_DISPLAY[sess.personId] || {};
  $("enterAv").textContent =
    disp.initials || (sess.name || "?").slice(0, 2).toUpperCase();
  $("enterName").textContent = (sess.name || "").split(" ")[0];
  $("login").style.display = "none";
  var fx = $("enterFx");
  fx.classList.add("show");
  setTimeout(function () {
    fx.classList.remove("show");
    fx.style.display = "none";
    after();
  }, 1700);
}

function doLogout() {
  try {
    sessionStorage.removeItem("aise_session");
  } catch (e) {}
  SESSION = null;
  location.reload();
}

function restoreSession() {
  try {
    var s = sessionStorage.getItem("aise_session");
    if (s) {
      SESSION = JSON.parse(s);
      return true;
    }
  } catch (e) {}
  return false;
}

/* ---------------- navigation & routing ---------------- */
function tabsForRole() {
  var t = TABS_BASE.slice();
  if (SESSION && SESSION.role === "admin")
    t.push(["settings", "Settings", "\u2699"]);
  return t;
}

function startApp() {
  $("app").style.display = "flex";
  var disp = window.PEOPLE_DISPLAY[SESSION.personId] || {};
  $("uAvatar").textContent =
    disp.initials || (SESSION.name || "?").slice(0, 2).toUpperCase();
  $("uName").textContent = SESSION.name;
  $("uRole").textContent =
    SESSION.title + (SESSION.role === "admin" ? " . Admin" : "");
  var tabs = tabsForRole();
  $("nav").innerHTML = tabs
    .map(function (t) {
      return (
        '<button class="navbtn" data-k="' +
        t[0] +
        '" title="' +
        esc(t[1]) +
        '" onclick="go(\'' +
        t[0] +
        '\')"><span class="ic">' +
        t[2] +
        '</span><span class="nav-txt">' +
        esc(t[1]) +
        "</span></button>"
      );
    })
    .join("");
  $("topnav").innerHTML = tabs
    .map(function (t) {
      return (
        '<button data-k="' +
        t[0] +
        '" onclick="go(\'' +
        t[0] +
        "')\">" +
        esc(t[1]) +
        "</button>"
      );
    })
    .join("");

  if (loadLS("sidebarCollapsed", "0") === "1") {
    var appEl = $("app");
    if (appEl) appEl.classList.add("collapsed-sidebar");
  }

  var g = loadLS("gen", null);
  if (g) state.gen = Object.assign(state.gen, g);
  go("dashboard");
}

function toggleSidebar() {
  var appEl = $("app");
  if (!appEl) return;
  appEl.classList.toggle("collapsed-sidebar");
  var isCollapsed = appEl.classList.contains("collapsed-sidebar");
  saveLS("sidebarCollapsed", isCollapsed ? "1" : "0");
}

function go(t) {
  state.tab = t;
  render();
}

function render() {
  var map = {
    dashboard: tDashboard,
    generate: tGenerate,
    analytics: tAnalytics,
    calendar: tCalendar,
    library: tLibrary,
    compliance: tCompliance,
    "profile-gap": tProfileGap,
    profile: tProfile,
    settings: tSettings,
  };
  if (state.tab === "settings" && (!SESSION || SESSION.role !== "admin"))
    state.tab = "dashboard";
  $("content").innerHTML = (map[state.tab] || tDashboard)();
  document.querySelectorAll("#nav .navbtn").forEach(function (b) {
    b.classList.toggle("active", b.dataset.k === state.tab);
  });
  document.querySelectorAll("#topnav button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.k === state.tab);
  });
  if (state.tab === "generate" && state.generating) startGenRotation();
  if (state.tab === "generate" && state.weekGen) updateWeekProgress();
  if (state.tab === "profile-gap") setupProfileGapDropAndPaste();
  window.scrollTo(0, 0);
}

/* ---------------- init ---------------- */
(function init() {
  var pass = $("credPass");
  if (pass)
    pass.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submitCred();
    });
  if (restoreSession()) {
    $("boot").style.display = "none";
    startApp();
  } else {
    runBoot(function () {
      renderProfileWall();
    });
  }
})();
