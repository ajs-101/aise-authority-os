// ============================================================
// js/views.js  -  Tab View Renderers for AISE Authority OS
// ============================================================

/* ---------------- DASHBOARD ---------------- */
function tDashboard() {
  var lib = loadLS("library", []),
    cal = loadLS("calendar", []);
  var posted =
    lib.filter(function (l) {
      return l.done;
    }).length +
    cal.filter(function (c) {
      return c.done;
    }).length;
  return (
    head(
      "Dashboard",
      "Welcome back, " +
        SESSION.name.split(" ")[0] +
        ". Generate LinkedIn content written in your own voice, on top of the company knowledge base.",
    ) +
    '<div class="g4">' +
    statCard("Saved drafts", lib.length) +
    statCard("Calendar slots", cal.length) +
    statCard("Marked posted", posted) +
    statCard("Voice samples", SESSION.sampleCount || 0) +
    "</div>" +
    '<div class="g2">' +
    '<div class="card"><div class="fm">Generate in your voice</div><p class="sm mut">Write one post, or a full unique 7 day week in one go. Every post is built from your real LinkedIn style plus ' +
    esc(SESSION.companyName) +
    ' context, with the compliance rules enforced.</p><button class="btn p" onclick="go(\'generate\')">\u2726 Open the generator</button></div>' +
    '<div class="card"><div class="fm">Your positioning</div><p class="sm" style="color:#cdd9ec">' +
    esc(SESSION.headline) +
    '</p><div class="gap" style="margin-top:10px"><span class="pill bl">' +
    esc(SESSION.companyName) +
    '</span><span class="pill te">' +
    esc((SESSION.audience || "").split(",")[0]) +
    "</span></div></div>" +
    "</div>" +
    '<div class="card"><div class="fm">How this works</div><ol class="sm mut" style="padding-left:18px;line-height:1.7;margin:0">' +
    "<li>Pick a topic and tone for a single post, or hit Generate 7 day week for a full set.</li>" +
    "<li>Weekly posts land in your Content Library, each a different angle, with a copy button, an image prompt, and a posted toggle.</li>" +
    "<li>Run anything through Compliance Check before you publish.</li>" +
    "</ol></div>"
  );
}

function statCard(label, val) {
  return (
    '<div class="card" style="text-align:center"><div class="stat">' +
    val +
    '</div><div class="xs mut" style="margin-top:4px">' +
    esc(label) +
    "</div></div>"
  );
}

/* ---------------- GENERATE ---------------- */
function tGenerate() {
  var g = state.gen;
  var busy = state.generating || state.weekGen;
  var form =
    '<div class="card">' +
    '<label class="fl">Topic, angle, or idea (optional)</label><textarea rows="2" oninput="genTopic(this.value)" placeholder="Leave blank to let it choose">' +
    esc(g.topic) +
    "</textarea>" +
    selField(
      "Post type",
      window.UI.postTypes,
      g.postType,
      "genSet('postType',this.value)",
    ) +
    selField(
      "Content pillar (optional)",
      [""].concat(window.UI.pillars),
      g.pillar,
      "genSet('pillar',this.value)",
    ) +
    selField(
      "Funnel stage",
      window.UI.funnels,
      g.funnel,
      "genSet('funnel',this.value)",
    ) +
    selField("Tone", window.UI.tones, g.tone, "genSet('tone',this.value)") +
    selField(
      "Call to action",
      window.UI.ctas,
      g.cta,
      "genSet('cta',this.value)",
    ) +
    selField(
      "Length",
      window.UI.lengths,
      g.length,
      "genSet('length',this.value)",
    ) +
    '<button class="btn p" style="width:100%;justify-content:center" id="genBtn" onclick="runGenerate()"' +
    (busy ? " disabled" : "") +
    ">" +
    (state.generating
      ? '<span class="spinner"></span> Writing'
      : "\u2726 Generate post") +
    "</button>" +
    '<div style="text-align:center;margin:12px 0 10px;color:var(--mut);font-size:11px;letter-spacing:.1em">OR</div>' +
    '<button class="btn g" style="width:100%;justify-content:center" onclick="runWeek()"' +
    (busy ? " disabled" : "") +
    ">" +
    (state.weekGen
      ? '<span class="spinner"></span> Building week'
      : "\u25A6 Generate 7 day week") +
    "</button>" +
    '<p class="xs mut" style="margin-top:8px">The weekly option writes seven different posts, each with its own AISE themed image prompt, and saves them to your Content Library.</p>' +
    "</div>";
  var right = state.weekGen
    ? weeklyLoaderHTML()
    : state.generating
      ? genLoaderHTML()
      : genOutputHTML();
  return (
    head(
      "Generate Post",
      "Written as " +
        esc(SESSION.name) +
        ", in your real LinkedIn voice, with " +
        esc(SESSION.companyName) +
        " context baked in.",
    ) +
    '<div style="display:grid;grid-template-columns:1fr 1.6fr;gap:16px" class="genwrap">' +
    form +
    '<div id="genOut">' +
    right +
    "</div></div>" +
    "<style>@media(max-width:820px){.genwrap{grid-template-columns:1fr !important;}}</style>"
  );
}

function genLoaderHTML() {
  return (
    '<div class="card"><div class="genload"><div class="orbit"><div class="ring a"></div><div class="ring b"></div><div class="ring c"></div></div>' +
    '<div class="msg" id="genLoadMsg">Studying your voice</div><div class="dots"><i></i><i></i><i></i></div></div></div>'
  );
}

function weeklyLoaderHTML() {
  return (
    '<div class="card"><div class="genload"><div class="orbit"><div class="ring a"></div><div class="ring b"></div><div class="ring c"></div></div>' +
    '<div class="msg" id="weekProg">Generating day 1 of 7</div><div class="dots"><i></i><i></i><i></i></div>' +
    '<div class="xs mut" style="margin-top:12px;text-align:center">Writing a full unique week. This runs seven posts back to back, give it a moment.</div></div></div>'
  );
}

function genOutputHTML() {
  var out = state.genOut;
  if (!out)
    return '<div class="card"><div class="empty">Your generated post will appear here. Fill the form and hit Generate, or build a full week.</div></div>';
  COPYREG.gmain =
    (out.main || "") + (out.hashtags ? "\n\n" + out.hashtags : "");
  COPYREG.galt = out.alt || "";
  COPYREG.gimg = out.imagePrompt || "";
  COPYREG.gpin = out.pinnedComment || "";
  var hw = humanCheck(out.main || "");
  var hooks = (out.hooks || [])
    .map(function (h, i) {
      return (
        '<div class="box" style="margin-bottom:8px"><div class="xs mut">Hook ' +
        (i + 1) +
        '</div><div class="sm">' +
        esc(h) +
        "</div></div>"
      );
    })
    .join("");
  var html =
    '<div class="card"><div class="flexb"><div class="fm">Your post</div><div class="gap">' +
    '<span class="pill ' +
    (hw.status === "Clean" ? "em" : hw.status === "Minor notes" ? "am" : "rd") +
    '">' +
    hw.status +
    " " +
    hw.score +
    "</span>" +
    cbtn("gmain") +
    "</div></div>" +
    '<div class="box pre">' +
    esc(out.main || "") +
    "</div>" +
    (out.hashtags
      ? '<div class="sm acc" style="margin-top:8px">' +
        esc(out.hashtags) +
        "</div>"
      : "") +
    '<div class="gap" style="margin-top:12px"><button class="btn g" onclick="saveToLibrary()">\u2751 Save to library</button><button class="btn g" onclick="sendToCalendar()">\u25A6 Add to calendar</button></div></div>';
  if (hooks)
    html +=
      '<div class="card"><div class="fm">Alternative hooks</div>' +
      hooks +
      "</div>";
  if (out.alt)
    html +=
      '<div class="card"><div class="flexb"><div class="fm">Shorter version</div>' +
      cbtn("galt") +
      '</div><div class="box pre">' +
      esc(out.alt) +
      "</div></div>";
  if (out.pinnedComment)
    html +=
      '<div class="card"><div class="flexb"><div class="fm">Pinned first comment</div>' +
      cbtn("gpin") +
      '</div><div class="box sm">' +
      esc(out.pinnedComment) +
      "</div></div>";
  if (out.imagePrompt)
    html +=
      '<div class="card"><div class="flexb"><div class="fm">Image prompt</div>' +
      cbtn("gimg") +
      '</div><div class="box pre xs">' +
      esc(out.imagePrompt) +
      '</div><p class="xs mut" style="margin-top:6px">Paste into ChatGPT or your image tool. It leaves a clean top left corner so you can drop the real AISE logo on top.</p></div>';
  return html;
}

function cbtn(key) {
  return (
    '<button class="icon" onclick="copyKey(\'' + key + "')\">Copy</button>"
  );
}

function ptLabel(k) {
  if (!k) return "";
  var f = (window.UI.postTypes || []).find(function (x) {
    return x.key === k;
  });
  return f ? f.label : k;
}

/* ---------------- ANALYTICS & POST ANALYZER ---------------- */
function tAnalytics() {
  var activeTab = state.analyzerTab || "post";
  var navHTML =
    '<div class="comp-nav">' +
    '<button class="comp-tab-btn ' +
    (activeTab === "post" ? "active" : "") +
    '" onclick="setAnalyzerSubTab(\'post\')"><span class="ic">\u270E</span> Existing Post Analysis</button>' +
    '<button class="comp-tab-btn ' +
    (activeTab === "image" ? "active" : "") +
    '" onclick="setAnalyzerSubTab(\'image\')"><span class="ic">\uD83D\uDDBC</span> Image Upload & Analysis</button>' +
    "</div>";

  if (activeTab === "image") {
    return (
      head(
        "Image Upload & Visual Analysis",
        "Upload an image or visual graphic to inspect brand palette match, aspect ratio, text contrast, and top-left logo safety.",
      ) +
      navHTML +
      renderImageAnalyzerHTML()
    );
  }

  return (
    head(
      "Existing Post Analysis",
      "Analyze any existing LinkedIn post or saved draft for hook power, human rhythm, AI tell detection, and AEO authority.",
    ) +
    navHTML +
    renderPostAnalyzerHTML()
  );
}

function renderPostAnalyzerHTML() {
  var lib = loadLS("library", []);
  var cal = loadLS("calendar", []);
  var allPosts = lib.concat(cal);

  var selectOptions =
    '<option value="">-- Select a saved post or paste custom text below --</option>' +
    allPosts
      .map(function (p) {
        var snippet = (p.main || "").split("\n")[0].slice(0, 60);
        return (
          '<option value="' +
          p.id +
          '"' +
          (state.selectedPostId === p.id ? " selected" : "") +
          ">" +
          esc(p.day ? p.day + ": " : "") +
          esc(snippet) +
          "...</option>"
        );
      })
      .join("");

  var leftCol =
    '<div class="card">' +
    '<label class="fl">Select Saved Draft</label>' +
    '<select onchange="onSelectPostToAnalyze(this.value)">' +
    selectOptions +
    "</select>" +
    '<label class="fl" style="margin-top:10px">Or Paste / Edit Post Content</label>' +
    '<textarea id="postAnalyzerInput" rows="12" oninput="state.postText=this.value" placeholder="Paste any LinkedIn post text here to analyze...">' +
    esc(state.postText) +
    "</textarea>" +
    '<button class="btn p" style="width:100%;justify-content:center" onclick="runPostAnalysis()"' +
    (state.postAnalyzing ? " disabled" : "") +
    ">" +
    (state.postAnalyzing
      ? '<span class="spinner"></span> Analyzing Post...'
      : "\u25C8 Run Deep Post Analysis") +
    "</button>" +
    "</div>";

  var rightCol = state.postAnalyzing
    ? '<div class="card"><div class="genload"><div class="orbit"><div class="ring a"></div><div class="ring b"></div><div class="ring c"></div></div><div class="msg">Analyzing hook, line rhythm & AI tells</div></div></div>'
    : state.postAnalysis
      ? renderPostAnalysisReport(state.postAnalysis)
      : '<div class="card"><div class="empty">Select a saved post or paste text, then hit <b>Run Deep Post Analysis</b> to inspect scores, AI tells, and suggestions.</div></div>';

  return '<div class="g2">' + leftCol + "<div>" + rightCol + "</div></div>";
}

function renderPostAnalysisReport(res) {
  var s = res.scores || {};
  var overallCls = s.overall >= 80 ? "high" : s.overall >= 60 ? "mid" : "low";

  var scoresHTML =
    '<div class="g4" style="margin-bottom:14px">' +
    '<div class="card" style="text-align:center"><div class="score-badge ' +
    overallCls +
    '">' +
    s.overall +
    '</div><div class="xs mut" style="margin-top:6px">Overall Health</div></div>' +
    '<div class="card" style="text-align:center"><div class="stat">' +
    s.hook +
    '</div><div class="xs mut" style="margin-top:4px">Hook Score</div></div>' +
    '<div class="card" style="text-align:center"><div class="stat">' +
    s.rhythm +
    '</div><div class="xs mut" style="margin-top:4px">Human Rhythm</div></div>' +
    '<div class="card" style="text-align:center"><div class="stat">' +
    s.authority +
    '</div><div class="xs mut" style="margin-top:4px">AEO Authority</div></div>' +
    "</div>";

  var aiTellsHTML = "";
  if (res.aiTells && res.aiTells.length) {
    aiTellsHTML =
      '<div class="card" style="border-left:4px solid var(--red);background:rgba(248,113,113,.06)"><div class="fm bad">\u26A0 AI Tell Buzzwords Detected (' +
      res.aiTells.length +
      ")</div>" +
      '<p class="sm mut" style="margin-bottom:8px">These words flag the post as AI-generated on LinkedIn:</p>' +
      '<div class="gap">' +
      res.aiTells
        .map(function (w) {
          return '<span class="pill rd">' + esc(w) + "</span>";
        })
        .join("") +
      "</div></div>";
  } else {
    aiTellsHTML =
      '<div class="card" style="border-left:4px solid var(--emerald);background:rgba(52,211,153,.04)"><div class="fm acc">\u2713 Zero AI Tell Buzzwords</div><p class="sm mut" style="margin:0">Reads cleanly like authentic human writing.</p></div>';
  }

  var strengthsHTML = (res.strengths || [])
    .map(function (st) {
      return (
        '<div class="flag" style="color:var(--emerald)">\u2713 ' +
        esc(st) +
        "</div>"
      );
    })
    .join("");

  var suggestionsHTML = (res.suggestions || [])
    .map(function (sg) {
      return '<div class="flag warn">\u2022 ' + esc(sg) + "</div>";
    })
    .join("");

  var hookFixHTML = res.improvedHook
    ? '<div class="card" style="border-left:4px solid var(--teal)"><div class="fm teal">\u2726 Recommended Hook Rewrite</div><div class="box sm pre">' +
      esc(res.improvedHook) +
      "</div></div>"
    : "";

  return (
    scoresHTML +
    aiTellsHTML +
    '<div class="card"><div class="fm">Analysis & Diagnosis</div>' +
    (strengthsHTML
      ? '<div style="margin-bottom:10px"><div class="xs mut" style="margin-bottom:4px">STRENGTHS</div>' +
        strengthsHTML +
        "</div>"
      : "") +
    (suggestionsHTML
      ? '<div><div class="xs mut" style="margin-bottom:4px">IMPROVEMENT SUGGESTIONS</div>' +
        suggestionsHTML +
        "</div>"
      : "") +
    "</div>" +
    hookFixHTML
  );
}

function renderImageAnalyzerHTML() {
  var uploaderCard =
    '<div class="card">' +
    '<div class="upload-dropzone" onclick="document.getElementById(\'imgFileInput\').click()">' +
    '<div class="up-icon">\uD83D\uDDBC</div>' +
    '<div class="fm">Click or Drag & Drop Image Here</div>' +
    '<div class="xs mut">Supports PNG, JPG, WEBP, SVG (Max 5MB)</div>' +
    '<input type="file" id="imgFileInput" accept="image/*" onchange="handleImageFileSelect(event)">' +
    "</div></div>";

  if (state.imageDataUrl) {
    var previewCard =
      '<div class="card">' +
      '<div class="flexb" style="margin-bottom:10px"><div class="fm">Uploaded Visual Preview</div><button class="btn g xs" onclick="document.getElementById(\'imgFileInput\').click()">Change Image</button></div>' +
      '<div class="img-preview-wrapper">' +
      '<img src="' +
      esc(state.imageDataUrl) +
      '" alt="Uploaded Preview">' +
      '<div class="safety-grid-overlay"><span>AISE LOGO</span><span>SAFE ZONE</span></div>' +
      "</div>" +
      '<p class="xs mut" style="margin-top:8px;text-align:center">The top-left green box indicates the clean area reserved for placing the official AISE logo overlay.</p>' +
      "</div>";

    var reportCard = state.imageAnalyzing
      ? '<div class="card"><div class="genload"><div class="orbit"><div class="ring a"></div><div class="ring b"></div><div class="ring c"></div></div><div class="msg">Inspecting contrast, brand palette & logo zone</div></div></div>'
      : state.imageAnalysis
        ? renderImageAnalysisReport(state.imageAnalysis)
        : '<div class="card"><div class="empty">Image loaded. Click <b>Run Visual Audit</b> to analyze.</div></div>';

    return (
      '<div class="g2">' +
      uploaderCard +
      previewCard +
      "</div><div>" +
      reportCard +
      "</div>"
    );
  }

  return (
    uploaderCard +
    '<div class="card"><div class="empty">Upload an image file above to visually audit contrast, brand colors, logo safe area, and feed visibility.</div></div>'
  );
}

function renderImageAnalysisReport(res) {
  var s = res.scores || {};
  var m = res.meta || {};

  var scoresHTML =
    '<div class="g4" style="margin-bottom:14px">' +
    '<div class="card" style="text-align:center"><div class="score-badge high">' +
    s.overall +
    '</div><div class="xs mut" style="margin-top:6px">Visual Score</div></div>' +
    '<div class="card" style="text-align:center"><div class="stat">' +
    s.brandingMatch +
    '%</div><div class="xs mut" style="margin-top:4px">Brand Match</div></div>' +
    '<div class="card" style="text-align:center"><div class="stat">' +
    s.feedVisibility +
    '%</div><div class="xs mut" style="margin-top:4px">Feed Reach</div></div>' +
    '<div class="card" style="text-align:center"><div class="stat" style="color:var(--emerald)">100%</div><div class="xs mut" style="margin-top:4px">Logo Zone</div></div>' +
    "</div>";

  var checksHTML = (res.checks || [])
    .map(function (c) {
      return (
        '<div class="flexb" style="padding:8px 0;border-bottom:1px solid var(--line)">' +
        '<div><div class="sm" style="font-weight:600">' +
        esc(c.label) +
        '</div><div class="xs mut">' +
        esc(c.detail) +
        "</div></div>" +
        '<span class="pill ' +
        (c.pass ? "em" : "am") +
        '">' +
        (c.pass ? "PASS \u2713" : "CHECK") +
        "</span>" +
        "</div>"
      );
    })
    .join("");

  var recsHTML = (res.recommendations || [])
    .map(function (r) {
      return '<div class="flag warn">\u2022 ' + esc(r) + "</div>";
    })
    .join("");

  return (
    scoresHTML +
    '<div class="g2">' +
    '<div class="card"><div class="fm">Image Format Specs</div>' +
    '<div class="sm" style="line-height:1.8">' +
    "<div><b>Dimensions:</b> " +
    esc(m.dimensions) +
    "</div>" +
    "<div><b>Aspect Ratio:</b> " +
    esc(m.aspectRatio) +
    " (" +
    esc(m.formatLabel) +
    ")</div>" +
    "<div><b>Estimated Size:</b> " +
    esc(m.estimatedSize) +
    "</div>" +
    "</div></div>" +
    '<div class="card"><div class="fm">Visual Audit Checklist</div>' +
    checksHTML +
    "</div>" +
    "</div>" +
    '<div class="card"><div class="fm">Visual Recommendations</div>' +
    recsHTML +
    "</div>"
  );
}

/* ---------------- CALENDAR ---------------- */
function tCalendar() {
  var cal = loadLS("calendar", []);
  var done = cal.filter(function (c) {
    return c.done;
  }).length;
  var rows = cal.length
    ? cal
        .map(function (c) {
          COPYREG["cal_" + c.id] =
            c.main + (c.hashtags ? "\n\n" + c.hashtags : "");
          var hw = humanCheck(c.main);
          return (
            '<div class="card"><div class="flexb" style="margin-bottom:8px"><div class="gap">' +
            '<span class="fm" style="margin:0">' +
            esc(c.day) +
            '</span><span class="xs mut">' +
            esc(c.time) +
            "</span>" +
            '<span class="pill ' +
            (c.funnel === "BOFU" ? "te" : "bl") +
            '">' +
            esc(c.funnel) +
            "</span>" +
            '<span class="pill ' +
            (hw.status === "Clean"
              ? "em"
              : hw.status === "Minor notes"
                ? "am"
                : "rd") +
            '">' +
            hw.status +
            "</span>" +
            (c.done ? '<span class="pill em">Posted</span>' : "") +
            '</div><div class="gap">' +
            '<button class="icon" onclick="analyzePostFromCal(' +
            c.id +
            ')" title="Analyze post">\u25C8 Analyze</button>' +
            '<button class="icon" onclick="calDone(' +
            c.id +
            ')">' +
            (c.done ? "Posted \u2713" : "Mark posted") +
            "</button>" +
            cbtn("cal_" + c.id) +
            '<button class="icon" onclick="calRemove(' +
            c.id +
            ')">\u2715</button></div></div>' +
            '<div class="pre sm' +
            (c.done ? " mut" : "") +
            '">' +
            esc(c.main) +
            "</div>" +
            (c.hashtags
              ? '<div class="xs acc" style="margin-top:6px">' +
                esc(c.hashtags) +
                "</div>"
              : "") +
            "</div>"
          );
        })
        .join("")
    : '<div class="card"><div class="empty">No posts scheduled yet. Generate a post and add it to the calendar.</div></div>';
  return (
    head(
      "Weekly Calendar",
      "Your scheduled posts. Mark them as posted to track the week. Saved in this browser.",
    ) +
    '<div class="card"><div class="flexb"><div class="fm">This week</div><span class="sm acc">' +
    done +
    " of " +
    cal.length +
    " posted</span></div>" +
    (cal.length
      ? '<div class="gap" style="margin-top:8px"><button class="btn g" onclick="calExport()">\u2913 Export week</button><button class="btn g" onclick="calClear()">Clear all</button></div>'
      : "") +
    "</div>" +
    rows
  );
}

/* ---------------- LIBRARY ---------------- */
function tLibrary() {
  var lib = loadLS("library", []);
  if (!lib.length)
    return (
      head(
        "Content Library",
        "Saved drafts live here. Copy, mark posted, or remove them.",
      ) +
      '<div class="card"><div class="empty">Nothing saved yet. Generate a post or a full week and it will show up here.</div></div>'
    );
  var posted = lib.filter(function (l) {
    return l.done;
  }).length;
  var cards = lib
    .map(function (l) {
      COPYREG["lib_" + l.id] = l.main + (l.hashtags ? "\n\n" + l.hashtags : "");
      COPYREG["libimg_" + l.id] = l.imagePrompt || "";
      var hw = humanCheck(l.main);
      return (
        '<div class="card"><div class="flexb" style="margin-bottom:8px"><div class="gap">' +
        (l.day ? '<span class="pill bl">' + esc(l.day) + "</span>" : "") +
        '<span class="pill ' +
        (l.funnel === "BOFU" ? "te" : "bl") +
        '">' +
        esc(l.funnel) +
        "</span>" +
        (ptLabel(l.postType || l.format)
          ? '<span class="pill">' +
            esc(ptLabel(l.postType || l.format)) +
            "</span>"
          : "") +
        (l.pillar ? '<span class="pill te">' + esc(l.pillar) + "</span>" : "") +
        '<span class="pill ' +
        (hw.status === "Clean"
          ? "em"
          : hw.status === "Minor notes"
            ? "am"
            : "rd") +
        '">' +
        hw.status +
        "</span>" +
        (l.done ? '<span class="pill em">Posted</span>' : "") +
        '<span class="xs mut">' +
        esc(l.created) +
        '</span></div><div class="gap">' +
        '<button class="icon" onclick="analyzePostFromLib(' +
        l.id +
        ')" title="Analyze post">\u25C8 Analyze</button>' +
        '<button class="icon" onclick="libDone(' +
        l.id +
        ')">' +
        (l.done ? "Posted \u2713" : "Mark posted") +
        "</button>" +
        cbtn("lib_" + l.id) +
        '<button class="icon" onclick="libToCal(' +
        l.id +
        ')" title="Add to calendar">\u25A6</button>' +
        '<button class="icon" onclick="libRemove(' +
        l.id +
        ')">\u2715</button></div></div>' +
        '<div class="pre sm' +
        (l.done ? " mut" : "") +
        '">' +
        esc(l.main) +
        "</div>" +
        (l.hashtags
          ? '<div class="xs acc" style="margin-top:8px">' +
            esc(l.hashtags) +
            "</div>"
          : "") +
        (l.imagePrompt
          ? '<div class="flexb" style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><div class="xs mut">\uD83D\uDDBC Image prompt (AISE themed)</div><button class="icon" onclick="copyKey(\'libimg_' +
            l.id +
            '\')">Copy</button></div><div class="box pre xs" style="margin-top:6px">' +
            esc(l.imagePrompt) +
            "</div>"
          : "") +
        "</div>"
      );
    })
    .join("");
  return (
    head(
      "Content Library",
      lib.length +
        " saved post" +
        (lib.length === 1 ? "" : "s") +
        ". " +
        posted +
        " marked posted. Each shows the full post, hashtags, and an AISE themed image prompt.",
    ) +
    '<div class="card"><div class="gap"><button class="btn g" onclick="libExport()">\u2913 Export all</button><button class="btn g" onclick="libClear()">Clear all</button></div></div>' +
    cards
  );
}

/* ---------------- COMPLIANCE ---------------- */
function tCompliance() {
  var activeSubTab = state.compSubTab || "scanner";

  var navHTML =
    '<div class="comp-nav">' +
    '<button class="comp-tab-btn ' +
    (activeSubTab === "scanner" ? "active" : "") +
    '" onclick="setCompSubTab(\'scanner\')"><span class="ic">\u2713</span> Draft Scanner</button>' +
    '<button class="comp-tab-btn ' +
    (activeSubTab === "analytics" ? "active" : "") +
    '" onclick="setCompSubTab(\'analytics\')"><span class="ic">\u25C8</span> Post & Image Gaps & Analytics</button>' +
    "</div>";

  if (activeSubTab === "analytics") {
    return (
      head(
        "Compliance & Strategy Audit",
        "Analyze generated posts and image prompts, detect funnel & pillar gaps, and export audit reports.",
      ) +
      navHTML +
      compAnalyticsHTML()
    );
  }

  var r = humanCheck(state.pvText);
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
  var rules = [
    "No em or en dashes",
    "No semicolons",
    "No mid sentence colons",
    "No hyphens inside words in prose",
    "No outcome guarantees, reframe as engineered authority",
    "No fabricated precise statistics",
    "Short human sentences, real person voice",
  ];
  return (
    head(
      "Compliance Check",
      "Paste any draft to scan it against the house style and compliance rules before you publish.",
    ) +
    navHTML +
    '<div class="g2"><div class="card"><label class="fl">Paste a draft</label><textarea rows="12" oninput="pvInput(this.value)" placeholder="Paste your post here">' +
    esc(state.pvText) +
    "</textarea>" +
    '<div id="pvResult"><div class="gap"><span class="pill ' +
    (r.status === "Clean" ? "em" : r.status === "Minor notes" ? "am" : "rd") +
    '">' +
    r.status +
    " " +
    r.score +
    '</span></div><div style="margin-top:10px">' +
    flags +
    "</div></div></div>" +
    '<div class="card"><div class="fm">House rules</div><ul class="sm mut" style="padding-left:18px;line-height:1.8;margin:0">' +
    rules
      .map(function (x) {
        return "<li>" + esc(x) + "</li>";
      })
      .join("") +
    "</ul></div></div>"
  );
}

function compAnalyticsHTML() {
  var stats = calculateAnalytics();
  var gaps = detectContentGaps(stats);

  var kpiGrid =
    '<div class="g4">' +
    '<div class="card" style="text-align:center"><div class="stat">' +
    stats.totalPosts +
    '</div><div class="xs mut" style="margin-top:4px">Total Saved Posts</div><div class="xs acc" style="margin-top:2px">' +
    stats.calCount +
    " in Calendar</div></div>" +
    '<div class="card" style="text-align:center"><div class="stat">' +
    stats.imageCoverage +
    '%</div><div class="xs mut" style="margin-top:4px">Image Prompt Coverage</div><div class="xs blue" style="margin-top:2px">' +
    stats.imageCount +
    " of " +
    stats.totalPosts +
    " visual ready</div></div>" +
    '<div class="card" style="text-align:center"><div class="stat">' +
    stats.avgCompliance +
    '<span style="font-size:16px">%</span></div><div class="xs mut" style="margin-top:4px">Avg Compliance Score</div><div class="xs acc" style="margin-top:2px">' +
    stats.cleanCount +
    " clean, " +
    stats.minorCount +
    " notes</div></div>" +
    '<div class="card" style="text-align:center"><div class="stat" style="color:' +
    (gaps.length > 0 ? "var(--amber)" : "var(--emerald)") +
    '">' +
    gaps.length +
    '</div><div class="xs mut" style="margin-top:4px">Detected Gaps</div><div class="xs mut" style="margin-top:2px">' +
    (gaps.length > 0 ? "Actionable items" : "All pillars covered") +
    "</div></div>" +
    "</div>";

  var gapsHTML = "";
  if (gaps.length === 0) {
    gapsHTML =
      '<div class="card" style="border-left:4px solid var(--emerald);background:rgba(52,211,153,.04)"><div class="fm acc">\u2713 Strategy & Visual Balance Complete</div><p class="sm mut" style="margin:0">No content or image prompt gaps detected. Your funnel, pillars, and visual prompts are well balanced.</p></div>';
  } else {
    gapsHTML = gaps
      .map(function (g) {
        var cls =
          g.type === "critical"
            ? "critical"
            : g.type === "warn"
              ? "warn"
              : "info";
        return (
          '<div class="gap-card ' +
          cls +
          '"><div class="flexb"><div><div class="fm" style="margin-bottom:4px">' +
          esc(g.title) +
          '</div><p class="sm mut" style="margin:0">' +
          esc(g.detail) +
          "</p></div>" +
          (g.action
            ? '<button class="btn p" style="margin-top:8px" onclick="' +
              g.action +
              '">' +
              esc(g.actionLabel) +
              "</button>"
            : "") +
          "</div></div>"
        );
      })
      .join("");
  }
  var gapsCard =
    '<div class="card"><div class="flexb" style="margin-bottom:12px"><div class="fm">Automated Gap Analysis & Diagnosis</div><button class="btn g" onclick="exportComplianceReport()">\u2913 Export Audit Report</button></div>' +
    gapsHTML +
    "</div>";

  var total = stats.totalPosts || 1;
  var tofuPct = Math.round((stats.funnelCounts.TOFU / total) * 100);
  var mofuPct = Math.round((stats.funnelCounts.MOFU / total) * 100);
  var bofuPct = Math.round((stats.funnelCounts.BOFU / total) * 100);

  var funnelCard =
    '<div class="card"><div class="fm">Funnel Stage Distribution</div>' +
    '<div style="margin-bottom:14px"><div><div class="flexb sm"><span class="blue">TOFU (Top of Funnel - Educate)</span><span class="mut">' +
    stats.funnelCounts.TOFU +
    " posts (" +
    tofuPct +
    '%)</span></div><div class="prog-track"><div class="prog-fill blue" style="width:' +
    tofuPct +
    '%"></div></div></div></div>' +
    '<div style="margin-bottom:14px"><div><div class="flexb sm"><span class="teal">MOFU (Middle - Build Trust)</span><span class="mut">' +
    stats.funnelCounts.MOFU +
    " posts (" +
    mofuPct +
    '%)</span></div><div class="prog-track"><div class="prog-fill teal" style="width:' +
    mofuPct +
    '%"></div></div></div></div>' +
    '<div><div><div class="flexb sm"><span class="acc">BOFU (Bottom - Soft Convert)</span><span class="mut">' +
    stats.funnelCounts.BOFU +
    " posts (" +
    bofuPct +
    '%)</span></div><div class="prog-track"><div class="prog-fill emerald" style="width:' +
    bofuPct +
    '%"></div></div></div></div>' +
    "</div>";

  var pillars = window.UI.pillars || [];
  var pillarItems = pillars
    .map(function (p) {
      var count = stats.pillarCounts[p] || 0;
      var covered = count > 0;
      return (
        '<div class="pillar-card ' +
        (covered ? "covered" : "uncovered") +
        '">' +
        '<div><div class="xs mut">' +
        (covered ? "Covered (" + count + ")" : "Gap Detected") +
        '</div><div class="sm" style="font-weight:600;margin-top:2px;color:' +
        (covered ? "var(--txt)" : "#fca5a5") +
        '">' +
        esc(p) +
        "</div></div>" +
        (covered
          ? '<span class="pill em" style="align-self:flex-start;margin-top:8px">Active</span>'
          : '<button class="btn g xs" style="align-self:flex-start;margin-top:8px;padding:4px 8px" onclick="fillGapPost(\'TOFU\',\'' +
            esc(p).replace(/'/g, "\\'") +
            "','auto')\">+ Generate</button>") +
        "</div>"
      );
    })
    .join("");
  var pillarCard =
    '<div class="card"><div class="fm">AISE Content Pillar Coverage (12 Pillars)</div><div class="pillar-grid">' +
    pillarItems +
    "</div></div>";

  var imageRows = stats.lib.length
    ? stats.lib
        .map(function (item) {
          var hasImg = item.imagePrompt && item.imagePrompt.trim();
          return (
            '<tr><td><div class="sm" style="font-weight:600">' +
            esc((item.main || "").split("\n")[0].slice(0, 65)) +
            '...</div><div class="xs mut">' +
            esc(item.pillar || "General AISE") +
            " . " +
            esc(item.funnel) +
            "</div></td>" +
            "<td>" +
            (hasImg
              ? '<span class="pill em">Prompt Ready</span>'
              : '<span class="pill rd">Missing Image</span>') +
            "</td>" +
            '<td style="text-align:right">' +
            (hasImg
              ? '<button class="icon xs" onclick="copyKey(\'libimg_' +
                item.id +
                "')\">Copy Prompt</button>"
              : '<button class="btn p xs" style="padding:4px 10px" onclick="fillImageGap(' +
                item.id +
                ')">+ Generate Image</button>') +
            "</td></tr>"
          );
        })
        .join("")
    : '<tr><td colspan="3" class="mut sm">No posts saved in library yet.</td></tr>';

  var imageCard =
    '<div class="card"><div class="flexb" style="margin-bottom:10px"><div class="fm">Generated Images & Visual Prompts Audit</div>' +
    (stats.missingImagePosts.length > 0
      ? '<button class="btn g xs" onclick="fillAllImageGaps()">\u26A1 Generate All Missing (' +
        stats.missingImagePosts.length +
        ")</button>"
      : '<span class="pill em">100% Visual Coverage</span>') +
    '</div><table><thead><tr><th>Post Topic</th><th>Image Status</th><th style="text-align:right">Action</th></tr></thead><tbody>' +
    imageRows +
    "</tbody></table></div>";

  return (
    kpiGrid +
    gapsCard +
    '<div class="g2">' +
    funnelCard +
    pillarCard +
    "</div>" +
    imageCard
  );
}

/* ---------------- PROFILE GAP ANALYZER ---------------- */
var FIX_ACTIONS = {
  headline: { label: "Generate 3 Better Headlines", icon: "✎" },
  about: { label: "Rewrite My About Section", icon: "✎" },
  experience: { label: "Improve Experience Description", icon: "✎" },
  skills: { label: "Suggest Relevant Skills", icon: "✎" },
  featured: { label: "Suggest Featured Content", icon: "✎" },
  recommendations: {
    label: "Suggest Who to Ask for Recommendations",
    icon: "✎",
  },
};

var SECTION_LABELS = {
  headline: "Headline",
  about: "About",
  experience: "Experience",
  skills: "Skills",
  featured: "Featured",
  recommendations: "Recommendations",
  certifications: "Certifications",
  general: "Profile",
};

function priorityMeta(p) {
  if (p === "high") return { icon: "🔴", label: "High Priority", cls: "rd" };
  if (p === "low") return { icon: "🟢", label: "Low Priority", cls: "em" };
  return { icon: "🟡", label: "Medium Priority", cls: "am" };
}

function scoreTierClass(score, max) {
  var pct = max ? score / max : 0;
  if (pct >= 0.75) return "high";
  if (pct >= 0.45) return "mid";
  return "low";
}

function tProfileGap() {
  var leftCol =
    '<div class="card">' +
    '<label class="fl">Paste your LinkedIn profile</label>' +
    '<p class="xs mut" style="margin:2px 0 8px">Open your LinkedIn profile, click <b>See more</b> on every section so nothing is collapsed, then press <b>Ctrl+A</b> and <b>Ctrl+C</b> and paste it below. This is the primary, most accurate input.</p>' +
    '<textarea id="profileGapInput" rows="14" oninput="state.profileGapText=this.value" placeholder="Paste your full LinkedIn profile text here...">' +
    esc(state.profileGapText) +
    "</textarea>" +
    '<label class="fl" style="margin-top:14px">Optional: Add a Screenshot for Visual Feedback</label>' +
    '<p class="xs mut" style="margin:2px 0 8px">Upload a LinkedIn profile screenshot if you also want feedback on visual elements such as your profile photo, banner, and overall profile presentation. Click, drag & drop, or press Ctrl+V to paste it.</p>' +
    '<div class="upload-dropzone" id="profileGapDropzone" style="padding:18px" onclick="document.getElementById(\'profileGapFileInput\').click()">' +
    (state.profileGapShotUrl
      ? '<img src="' +
        esc(state.profileGapShotUrl) +
        '" alt="Screenshot preview" style="max-width:100%;max-height:160px;border-radius:8px">'
      : '<div class="up-icon" style="font-size:26px;margin-bottom:4px">🖼</div><div class="sm">Click, drop, or paste (Ctrl+V) a screenshot</div>') +
    '<input type="file" id="profileGapFileInput" accept="image/*" onchange="handleProfileGapFileSelect(event)">' +
    "</div>" +
    (state.profileGapShotUrl
      ? '<div class="gap" style="margin-top:8px"><button class="btn g xs" onclick="clearProfileGapShot()">Remove screenshot</button></div>'
      : "") +
    '<button class="btn p" style="width:100%;justify-content:center;margin-top:14px" onclick="runProfileGapAnalysis()"' +
    (state.profileGapAnalyzing ? " disabled" : "") +
    ">" +
    (state.profileGapAnalyzing
      ? '<span class="spinner"></span> Analyzing Profile...'
      : "🔎 Analyze & Find Gaps") +
    "</button>" +
    "</div>";

  var rightCol = state.profileGapAnalyzing
    ? '<div class="card"><div class="genload"><div class="orbit"><div class="ring a"></div><div class="ring b"></div><div class="ring c"></div></div><div class="msg">Reading headline, about, experience & skills</div></div></div>'
    : state.profileGapResult
      ? renderProfileGapReport(state.profileGapResult)
      : '<div class="card"><div class="empty">Paste your profile text, then hit <b>Analyze & Find Gaps</b> to see scores, priorities, and fixes.</div></div>';

  return (
    head(
      "LinkedIn Profile Gap Analyzer",
      "Paste your LinkedIn profile to get a section by section score, a prioritized action list, personalized fixes, and an optimized profile preview you can copy.",
    ) +
    '<div class="g2">' +
    leftCol +
    "<div>" +
    rightCol +
    "</div></div>"
  );
}

function renderProfileGapReport(res) {
  if (!res || res.ok === false) {
    return (
      '<div class="card"><div class="empty">' +
      esc((res && res.error) || "Could not analyze this profile.") +
      "</div></div>"
    );
  }

  var s = res.sectionScores || {};
  var hasScores = res.overallScore !== null && res.overallScore !== undefined;
  var overallCls = hasScores ? scoreTierClass(res.overallScore, 100) : "mid";

  var scoreTiles = [
    "headline",
    "about",
    "experience",
    "skills",
    "featured",
    "recommendations",
  ]
    .map(function (k) {
      var v = s[k];
      var cls = v === undefined || v === null ? "mid" : scoreTierClass(v, 10);
      var fix = FIX_ACTIONS[k];
      var loading = state.profileGapFixLoading && state.profileGapFixLoading[k];
      return (
        '<div class="card" style="text-align:center">' +
        '<div class="score-badge ' +
        cls +
        '" style="width:40px;height:40px;font-size:14px">' +
        (v === undefined || v === null ? "-" : v) +
        '<span style="font-size:9px;font-weight:600">/10</span></div>' +
        '<div class="xs mut" style="margin-top:6px">' +
        esc(SECTION_LABELS[k]) +
        "</div>" +
        '<button class="btn g xs" style="margin-top:8px;width:100%;justify-content:center" onclick="runProfileGapFix(\'' +
        k +
        "')\"" +
        (loading ? " disabled" : "") +
        ">" +
        (loading
          ? '<span class="spinner"></span>'
          : fix.icon + " " + esc(fix.label)) +
        "</button>" +
        "</div>"
      );
    })
    .join("");

  var scoresHTML = hasScores
    ? '<div class="card" style="text-align:center;margin-bottom:14px"><div class="score-badge ' +
      overallCls +
      '" style="width:64px;height:64px;font-size:22px;margin:0 auto">' +
      res.overallScore +
      '</div><div class="xs mut" style="margin-top:8px">Overall LinkedIn Profile Score: ' +
      res.overallScore +
      "/100</div></div>" +
      '<div class="g3" style="margin-bottom:14px">' +
      scoreTiles +
      "</div>"
    : "";

  function itemsByPriority(items) {
    var order = { high: 0, medium: 1, low: 2 };
    return (items || []).slice().sort(function (a, b) {
      return (order[a.priority] || 1) - (order[b.priority] || 1);
    });
  }

  function renderIssueRow(it, showDetail) {
    var pm = priorityMeta(it.priority);
    return (
      '<div style="padding:8px 0;border-bottom:1px solid var(--line)">' +
      '<div class="flexb"><div class="sm" style="font-weight:600">' +
      pm.icon +
      " " +
      esc(SECTION_LABELS[it.section] || it.section) +
      ": " +
      esc(it.label) +
      '</div><span class="pill ' +
      pm.cls +
      '">' +
      pm.label +
      "</span></div>" +
      (showDetail && it.detail
        ? '<div class="xs mut" style="margin-top:3px">' +
          esc(it.detail) +
          "</div>"
        : "") +
      "</div>"
    );
  }

  var missingHTML = (res.missing || []).length
    ? '<div class="card" style="border-left:4px solid var(--red);background:rgba(248,113,113,.06)"><div class="fm bad">⚠ Missing</div>' +
      itemsByPriority(res.missing)
        .map(function (m) {
          return renderIssueRow(m, false);
        })
        .join("") +
      "</div>"
    : '<div class="card" style="border-left:4px solid var(--emerald);background:rgba(52,211,153,.04)"><div class="fm acc">✓ Nothing Missing</div><p class="sm mut" style="margin:0">Every key section was found on the profile.</p></div>';

  var improveHTML = (res.needsImprovement || []).length
    ? '<div class="card" style="border-left:4px solid var(--amber);background:rgba(251,191,36,.05)"><div class="fm" style="color:var(--amber)">✎ Needs Improvement</div>' +
      itemsByPriority(res.needsImprovement)
        .map(function (m) {
          return renderIssueRow(m, true);
        })
        .join("") +
      "</div>"
    : "";

  var strengthsHTML = (res.strengths || []).length
    ? '<div class="card" style="border-left:4px solid var(--emerald);background:rgba(52,211,153,.04)"><div class="fm acc">✓ Strengths</div>' +
      (res.strengths || [])
        .map(function (st) {
          return (
            '<div class="flag" style="color:var(--emerald)">✓ ' +
            esc(SECTION_LABELS[st.section] || st.section) +
            ": " +
            esc(st.label) +
            (st.detail ? " (" + esc(st.detail) + ")" : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    : "";

  var ai = res.aiReview;
  var aiHTML = "";
  if (ai) {
    var recsHTML = (ai.personalizedRecommendations || [])
      .map(function (r) {
        var pm = priorityMeta(r.priority);
        return (
          '<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="xs" style="font-weight:600">' +
          pm.icon +
          " " +
          esc(SECTION_LABELS[r.section] || r.section) +
          '</div><div class="sm mut" style="margin-top:2px">' +
          esc(r.text || "") +
          "</div></div>"
        );
      })
      .join("");
    aiHTML =
      '<div class="card" style="border-left:4px solid var(--teal)"><div class="fm teal">✦ Claude Personalized Review</div>' +
      (ai.overallSummary
        ? '<p class="sm mut">' + esc(ai.overallSummary) + "</p>"
        : "") +
      (recsHTML
        ? '<div class="xs mut" style="margin:8px 0 4px">PERSONALIZED RECOMMENDATIONS</div>' +
          recsHTML
        : "") +
      (ai.visualNotes
        ? '<div class="xs mut" style="margin-top:10px">VISUAL NOTES</div><div class="box sm">' +
          esc(ai.visualNotes) +
          "</div>"
        : "") +
      "</div>";
  }

  var previewHTML = renderOptimizedPreview();

  return (
    scoresHTML +
    missingHTML +
    improveHTML +
    strengthsHTML +
    aiHTML +
    previewHTML
  );
}

// function genericTemplateNote(fix) {
//   if (!fix || fix.aiGenerated !== false) return "";
//   if (fix.aiError) {
//     return '<div class="xs" style="color:var(--amber);margin-top:4px">⚠ AI Notice: ' + esc(fix.aiError) + ' (Smart fallback draft shown)</div>';
//   }
//   return '<div class="xs" style="color:var(--amber);margin-top:4px">⚠ Smart fallback draft generated from profile signals. Connect the Claude API key in Settings for a full AI rewrite.</div>';
// }

function renderOptimizedPreview() {
  var f = state.profileGapFixes || {};
  var any =
    f.headline ||
    f.about ||
    f.experience ||
    f.skills ||
    f.featured ||
    f.recommendations;

  var rows = "";

  if (f.headline && f.headline.headlines) {
    rows +=
      '<div style="margin-bottom:12px"><div class="flexb"><div class="xs mut">RECOMMENDED HEADLINES</div><button class="btn g xs" onclick="copyProfileGapFix(\'headline\')">Copy</button></div>' +
      // genericTemplateNote(f.headline) +
      f.headline.headlines
        .map(function (h) {
          return (
            '<div class="box sm" style="margin-top:6px">' + esc(h) + "</div>"
          );
        })
        .join("") +
      "</div>";
  }
  if (f.about && f.about.about) {
    rows +=
      '<div style="margin-bottom:12px"><div class="flexb"><div class="xs mut">RECOMMENDED ABOUT SECTION</div><button class="btn g xs" onclick="copyProfileGapFix(\'about\')">Copy</button></div>' +
      // genericTemplateNote(f.about) +
      '<div class="box sm pre" style="margin-top:6px">' +
      esc(f.about.about) +
      "</div></div>";
  }
  if (f.experience && f.experience.experience) {
    rows +=
      '<div style="margin-bottom:12px"><div class="flexb"><div class="xs mut">IMPROVED EXPERIENCE DESCRIPTIONS</div><button class="btn g xs" onclick="copyProfileGapFix(\'experience\')">Copy</button></div>' +
      // genericTemplateNote(f.experience) +
      '<div class="box sm pre" style="margin-top:6px">' +
      esc(f.experience.experience) +
      "</div></div>";
  }
  if (f.skills && f.skills.skills) {
    rows +=
      '<div style="margin-bottom:12px"><div class="flexb"><div class="xs mut">SUGGESTED SKILLS</div><button class="btn g xs" onclick="copyProfileGapFix(\'skills\')">Copy</button></div>' +
      '<div class="box sm" style="margin-top:6px">' +
      esc(f.skills.skills.join(" · ")) +
      "</div></div>";
  }
  if (f.featured && f.featured.ideas) {
    rows +=
      '<div style="margin-bottom:12px"><div class="flexb"><div class="xs mut">FEATURED SECTION IDEAS</div><button class="btn g xs" onclick="copyProfileGapFix(\'featured\')">Copy</button></div>' +
      f.featured.ideas
        .map(function (i) {
          return '<div class="flag warn">• ' + esc(i) + "</div>";
        })
        .join("") +
      "</div>";
  }
  if (f.recommendations && f.recommendations.whoToAsk) {
    rows +=
      '<div style="margin-bottom:12px"><div class="flexb"><div class="xs mut">WHO TO ASK FOR A RECOMMENDATION</div><button class="btn g xs" onclick="copyProfileGapFix(\'recommendations\')">Copy</button></div>' +
      f.recommendations.whoToAsk
        .map(function (w) {
          if (typeof w === "object" && w !== null) {
            var rel = w.relationship || w.role || "";
            var why = w.why ? ": " + w.why : "";
            return (
              '<div class="flag warn">• <strong>' +
              esc(rel) +
              "</strong>" +
              esc(why) +
              "</div>"
            );
          }
          return '<div class="flag warn">• ' + esc(w) + "</div>";
        })
        .join("") +
      (f.recommendations.howToAsk
        ? '<div class="xs mut" style="margin-top:6px">' +
          esc(f.recommendations.howToAsk) +
          "</div>"
        : "") +
      "</div>";
  }

  if (!any) {
    return (
      '<div class="card"><div class="fm">Your Optimized LinkedIn Profile</div>' +
      '<p class="sm mut" style="margin:0">Use the fix buttons above each score to generate a better headline, About section, experience descriptions, skills, Featured ideas, and recommendation targets. They will appear here, ready to copy.</p></div>'
    );
  }

  return (
    '<div class="card"><div class="flexb" style="margin-bottom:8px"><div class="fm">Your Optimized LinkedIn Profile</div><button class="btn p xs" onclick="copyProfileGapAll()">Copy All</button></div>' +
    rows +
    "</div>"
  );
}

/* ---------------- PROFILE ---------------- */
function tProfile() {
  return (
    head(
      "My Voice Profile",
      "This is the profile the generator uses to write as you. To change samples or wording, ask Ahmed to update the backend profile.",
    ) +
    '<div class="card"><div class="fm">' +
    esc(SESSION.name) +
    " . " +
    esc(SESSION.title) +
    "</div>" +
    '<div class="gap" style="margin-bottom:12px"><span class="pill bl">' +
    esc(SESSION.companyName) +
    '</span><span class="pill te">' +
    esc(SESSION.sampleCount || 0) +
    " voice samples loaded</span></div>" +
    '<div class="head-uc">Headline</div><div class="box sm">' +
    esc(SESSION.headline) +
    "</div>" +
    '<div class="head-uc">About</div><div class="box sm pre">' +
    esc(SESSION.about) +
    "</div>" +
    '<div class="head-uc">Primary audience</div><div class="box sm">' +
    esc(SESSION.audience) +
    "</div></div>" +
    '<div class="card"><div class="fm">What the generator does with this</div><p class="sm mut">It studies your real posts and writes new content that matches your rhythm, sentence length, openings, and vocabulary. The ' +
    esc(SESSION.companyName) +
    " knowledge base is layered on for accuracy, and every draft obeys the compliance rules.</p></div>"
  );
}

/* ---------------- SETTINGS (admin) ---------------- */
function tSettings() {
  var model = loadLS("adminModel", "claude-sonnet-4-6");
  return (
    head(
      "Settings",
      "Admin control panel. Manage the backend connection and generation model. The Claude API key stays hidden on the server and is never shown here.",
    ) +
    '<div class="card"><div class="flexb"><div class="fm">Backend connection</div><button class="btn g" onclick="checkStatus(false)">Check key</button></div>' +
    '<div id="statusBox" class="box sm mut">Click Check key to verify the backend has the API key configured.</div>' +
    '<div class="gap" style="margin-top:10px"><button class="btn p" onclick="checkStatus(true)">Run live test call</button></div>' +
    '<p class="xs mut" style="margin-top:10px">The key is set as ANTHROPIC_API_KEY in the Netlify dashboard under Site settings, Environment variables. It is never sent to the browser.</p></div>' +
    '<div class="card"><div class="fm">Generation model</div><p class="sm mut">Applied to all accounts. Sonnet is the best balance. Switch to Haiku if you ever hit a timeout on the weekly batch.</p>' +
    selField("Model", window.UI.models, model, "setModel(this.value)") +
    "</div>" +
    '<div class="card"><div class="fm">The accounts</div><table><thead><tr><th>Person</th><th>Role</th><th>Voice</th></tr></thead><tbody>' +
    accRow("Syed Muhammad Ahmed", "Admin", "AISE, automation plus AEO") +
    accRow("Abdul Rehman", "Admin", "AISE, MERN & AI Automation") +
    accRow("Aman Jamil", "Member", "AISE, calm educational AEO") +
    accRow("Dacia Wilder", "Member", "TPX, executive marketing") +
    accRow(
      "David Wilder",
      "Member",
      "TPX, bold authority, guarantees softened",
    ) +
    accRow(
      "Aasheen Khan",
      "Member",
      "AISE, client success seat, grounded and practical",
    ) +
    accRow("Marium Khurram", "Member", "TPX, writer and SEO plus AEO") +
    '</tbody></table><p class="xs mut" style="margin-top:10px">To edit any voice profile, samples, or passwords, update profiles.js in the backend functions folder and redeploy.</p></div>'
  );
}
