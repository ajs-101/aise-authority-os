// ============================================================
// app.js  -  AISE Authority OS frontend (cinematic edition)
// ============================================================

var SESSION = null;
var COPYREG = {};
var pickedId = null;
var genTimer = null;

var TABS_BASE = [
  ["dashboard", "Dashboard", "\u25A3"],
  ["generate", "Generate Post", "\u2726"],
  ["calendar", "Weekly Calendar", "\u25A6"],
  ["library", "Content Library", "\u2751"],
  ["compliance", "Compliance Check", "\u2713"],
  ["profile", "My Voice Profile", "\u25CE"]
];

// Each day has its own subject, funnel, format, tone, and pillar so the
// seven posts are clearly about different things, not the same idea reworded.
var WEEK_PLAN = [
  { day: "Monday",    funnel: "TOFU", postType: "framework",   tone: "Educational",     pillar: "AI Search Education",                cta: "Soft question",            topic: "How AI search decides who to recommend, and why that is different from ranking on Google" },
  { day: "Tuesday",   funnel: "TOFU", postType: "contrarian",  tone: "Direct and bold", pillar: "Myths and Misconceptions",           cta: "Share an opinion",         topic: "The myth that publishing more content is what gets a business recommended by AI" },
  { day: "Wednesday", funnel: "MOFU", postType: "tips",        tone: "Professional",    pillar: "AEO and Authority Engineering",      cta: "Comment a keyword",        topic: "The specific signals an answer engine checks before it trusts and cites a business" },
  { day: "Thursday",  funnel: "TOFU", postType: "observation", tone: "Reflective",      pillar: "Search Behavior and Trends",         cta: "Soft question",            topic: "How buyer behavior quietly shifted to asking AI for a shortlist before they ever search" },
  { day: "Friday",    funnel: "MOFU", postType: "pain",        tone: "Educational",     pillar: "Entity Clarity and Structured Data", cta: "Open to a DM",             topic: "What entity clarity actually means and how to make a business unmistakable to AI" },
  { day: "Saturday",  funnel: "BOFU", postType: "lesson",      tone: "Storytelling",    pillar: "Media and Citation Authority",       cta: "Free AI Visibility Audit", topic: "Why authority that only lives on your own website is easy for AI to ignore, and what third party signals change" },
  { day: "Sunday",    funnel: "BOFU", postType: "question",    tone: "Conversational",  pillar: "Ranked versus Recommended",          cta: "Book a strategy call",     topic: "The difference between being searchable and being recommendable" }
];

var state = {
  tab: "dashboard",
  gen: { topic: "", postType: "auto", funnel: "TOFU", tone: "Professional", cta: "Soft question", length: "standard", pillar: "" },
  genOut: null, generating: false, weekGen: false, weekStep: 0, pvText: ""
};

/* ---------------- helpers ---------------- */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function toast(msg) { var t = $("toast"); t.textContent = msg || "Done"; t.classList.add("show"); clearTimeout(window.__tt); window.__tt = setTimeout(function () { t.classList.remove("show"); }, 1400); }
function copyText(t) { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(function () { toast("Copied"); }).catch(function () { fallbackCopy(t); }); } else fallbackCopy(t); }
function fallbackCopy(t) { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("Copied"); } catch (e) {} document.body.removeChild(ta); }
function copyKey(k) { if (COPYREG[k] != null) copyText(COPYREG[k]); }
function cbtn(key) { return '<button class="icon" onclick="copyKey(\'' + key + '\')">Copy</button>'; }
function download(name, text) { var b = new Blob([text], { type: "text/plain" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); }
function opts(arr, sel) { return arr.map(function (o) { var v = o.key !== undefined ? o.key : o, l = o.label !== undefined ? o.label : o; return '<option value="' + esc(v) + '"' + (v === sel ? " selected" : "") + ">" + esc(l) + "</option>"; }).join(""); }
function selField(label, arr, val, handler) { return '<label class="fl">' + esc(label) + '</label><select onchange="' + handler + '">' + opts(arr, val) + "</select>"; }

function lsKey(name) { return "aise_" + (SESSION ? SESSION.personId : "anon") + "_" + name; }
function loadLS(name, def) { try { var v = localStorage.getItem(lsKey(name)); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function saveLS(name, val) { try { localStorage.setItem(lsKey(name), JSON.stringify(val)); } catch (e) {} }

/* ---------------- boot sequence ---------------- */
function runBoot(after) {
  var boot = $("boot");
  setTimeout(function () {
    boot.classList.add("hide");
    setTimeout(function () { boot.style.display = "none"; after(); }, 700);
  }, 2100);
}

/* ---------------- profile wall ---------------- */
function renderProfileWall() {
  $("login").style.display = "flex";
  var order = window.PEOPLE_ORDER || Object.keys(window.PEOPLE_DISPLAY);
  $("profileGrid").innerHTML = order.map(function (id, i) {
    var p = window.PEOPLE_DISPLAY[id];
    return '<div class="pcard ' + p.accent + '" style="animation-delay:' + (i * 0.06) + 's" onclick="openCred(\'' + id + '\')">' +
      '<div class="glow"></div><div class="online" title="available"></div>' +
      (p.admin ? '<div class="admin-tag">Admin</div>' : "") +
      '<div class="pavatar">' + esc(p.initials) + "</div>" +
      '<div class="pname">' + esc(p.name) + "</div>" +
      '<div class="pdesg">' + esc(p.title) + "</div>" +
      '<div class="pcard-go">Tap to sign in &#8594;</div>' +
      "</div>";
  }).join("");
}
function openCred(id) {
  pickedId = id;
  var p = window.PEOPLE_DISPLAY[id];
  var av = $("credAvatar");
  av.textContent = p.initials;
  av.className = "pavatar " + p.accent;
  av.style.background = p.accent === "blue" ? "linear-gradient(135deg,#60a5fa,#3b82f6)" : p.accent === "teal" ? "linear-gradient(135deg,#5eead4,#2dd4bf)" : "linear-gradient(135deg,#6ee7b7,#34d399)";
  av.style.color = "#04111f";
  $("credName").textContent = p.name;
  $("credDesg").textContent = p.title;
  $("credErr").style.display = "none";
  $("credPass").value = "";
  $("credOverlay").classList.add("show");
  setTimeout(function () { $("credPass").focus(); }, 60);
}
function closeCred() { $("credOverlay").classList.remove("show"); pickedId = null; }
function submitCred() {
  var pass = $("credPass").value, btn = $("credBtn"), err = $("credErr");
  err.style.display = "none";
  if (!pass) { err.textContent = "Enter your password."; err.style.display = "block"; return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Verifying';
  fetch("/.netlify/functions/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ personId: pickedId, password: pass })
  }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      btn.disabled = false; btn.textContent = "Sign in";
      if (!res.ok || !res.d.ok) { err.textContent = res.d.error || "Login failed."; err.style.display = "block"; return; }
      SESSION = res.d;
      try { sessionStorage.setItem("aise_session", JSON.stringify(SESSION)); } catch (e) {}
      $("credOverlay").classList.remove("show");
      playEnter(SESSION, function () { startApp(); });
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Sign in";
      err.textContent = "Could not reach the server. If testing locally, run netlify dev.";
      err.style.display = "block";
    });
}
function playEnter(sess, after) {
  var disp = window.PEOPLE_DISPLAY[sess.personId] || {};
  $("enterAv").textContent = disp.initials || (sess.name || "?").slice(0, 2).toUpperCase();
  $("enterName").textContent = (sess.name || "").split(" ")[0];
  $("login").style.display = "none";
  var fx = $("enterFx"); fx.classList.add("show");
  setTimeout(function () { fx.classList.remove("show"); fx.style.display = "none"; after(); }, 1700);
}

/* ---------------- auth control ---------------- */
function doLogout() { try { sessionStorage.removeItem("aise_session"); } catch (e) {} SESSION = null; location.reload(); }
function restoreSession() { try { var s = sessionStorage.getItem("aise_session"); if (s) { SESSION = JSON.parse(s); return true; } } catch (e) {} return false; }

/* ---------------- app boot ---------------- */
function tabsForRole() { var t = TABS_BASE.slice(); if (SESSION && SESSION.role === "admin") t.push(["settings", "Settings", "\u2699"]); return t; }
function startApp() {
  $("app").style.display = "flex";
  var disp = window.PEOPLE_DISPLAY[SESSION.personId] || {};
  $("uAvatar").textContent = disp.initials || (SESSION.name || "?").slice(0, 2).toUpperCase();
  $("uName").textContent = SESSION.name;
  $("uRole").textContent = SESSION.title + (SESSION.role === "admin" ? " . Admin" : "");
  var tabs = tabsForRole();
  $("nav").innerHTML = tabs.map(function (t) { return '<button class="navbtn" data-k="' + t[0] + '" onclick="go(\'' + t[0] + '\')"><span class="ic">' + t[2] + "</span>" + t[1] + "</button>"; }).join("");
  $("topnav").innerHTML = tabs.map(function (t) { return '<button data-k="' + t[0] + '" onclick="go(\'' + t[0] + '\')">' + t[1] + "</button>"; }).join("");
  var g = loadLS("gen", null); if (g) state.gen = Object.assign(state.gen, g);
  go("dashboard");
}
function go(t) { state.tab = t; render(); }
function render() {
  var map = { dashboard: tDashboard, generate: tGenerate, calendar: tCalendar, library: tLibrary, compliance: tCompliance, profile: tProfile, settings: tSettings };
  if (state.tab === "settings" && (!SESSION || SESSION.role !== "admin")) state.tab = "dashboard";
  $("content").innerHTML = (map[state.tab] || tDashboard)();
  document.querySelectorAll("#nav .navbtn").forEach(function (b) { b.classList.toggle("active", b.dataset.k === state.tab); });
  document.querySelectorAll("#topnav button").forEach(function (b) { b.classList.toggle("active", b.dataset.k === state.tab); });
  if (state.tab === "generate" && state.generating) startGenRotation();
  if (state.tab === "generate" && state.weekGen) updateWeekProgress();
  window.scrollTo(0, 0);
}
function head(t, s) { return '<h2 class="h">' + esc(t) + '</h2><p class="h-sub">' + esc(s) + "</p>"; }

/* ---------------- compliance checker ---------------- */
function humanCheck(text) {
  var t = text || "", issues = [];
  if (/[\u2014\u2013]/.test(t)) issues.push({ s: "bad", m: "Contains an em or en dash. Remove it." });
  if (/;/.test(t)) issues.push({ s: "bad", m: "Contains a semicolon. Rewrite that line." });
  if (/[a-zA-Z]-[a-zA-Z]/.test(t)) issues.push({ s: "warn", m: "Contains a hyphen inside a word. Check it is intended." });
  if (/\w:\s/.test(t)) issues.push({ s: "warn", m: "Contains a mid sentence colon." });
  if (/\b(guarantee|guaranteed|guarantees)\b/i.test(t)) issues.push({ s: "bad", m: "Outcome guarantee language. Reframe as engineered authority." });
  if (/\b\d{1,3}\s?%/.test(t) && !/estimate|around|roughly|about/i.test(t)) issues.push({ s: "warn", m: "A precise percentage without a soft frame. Confirm it is real or soften it." });
  var score = 100; issues.forEach(function (i) { score -= i.s === "bad" ? 22 : 9; });
  return { score: Math.max(0, score), issues: issues, status: issues.some(function (i) { return i.s === "bad"; }) ? "Needs fixing" : issues.length ? "Minor notes" : "Clean" };
}

/* ---------------- DASHBOARD ---------------- */
function tDashboard() {
  var lib = loadLS("library", []), cal = loadLS("calendar", []);
  var posted = lib.filter(function (l) { return l.done; }).length + cal.filter(function (c) { return c.done; }).length;
  return head("Dashboard", "Welcome back, " + (SESSION.name.split(" ")[0]) + ". Generate LinkedIn content written in your own voice, on top of the company knowledge base.") +
    '<div class="g4">' + statCard("Saved drafts", lib.length) + statCard("Calendar slots", cal.length) + statCard("Marked posted", posted) + statCard("Voice samples", SESSION.sampleCount || 0) + "</div>" +
    '<div class="g2">' +
    '<div class="card"><div class="fm">Generate in your voice</div><p class="sm mut">Write one post, or a full unique 7 day week in one go. Every post is built from your real LinkedIn style plus ' + esc(SESSION.companyName) + ' context, with the compliance rules enforced.</p><button class="btn p" onclick="go(\'generate\')">\u2726 Open the generator</button></div>' +
    '<div class="card"><div class="fm">Your positioning</div><p class="sm" style="color:#cdd9ec">' + esc(SESSION.headline) + '</p><div class="gap" style="margin-top:10px"><span class="pill bl">' + esc(SESSION.companyName) + '</span><span class="pill te">' + esc(SESSION.audience.split(",")[0]) + '</span></div></div>' +
    "</div>" +
    '<div class="card"><div class="fm">How this works</div><ol class="sm mut" style="padding-left:18px;line-height:1.7;margin:0">' +
    "<li>Pick a topic and tone for a single post, or hit Generate 7 day week for a full set.</li>" +
    "<li>Weekly posts land in your Content Library, each a different angle, with a copy button, an image prompt, and a posted toggle.</li>" +
    "<li>Run anything through Compliance Check before you publish.</li>" +
    "</ol></div>";
}
function statCard(label, val) { return '<div class="card" style="text-align:center"><div class="stat">' + val + '</div><div class="xs mut" style="margin-top:4px">' + esc(label) + "</div></div>"; }

/* ---------------- GENERATE ---------------- */
function tGenerate() {
  var g = state.gen;
  var busy = state.generating || state.weekGen;
  var form = '<div class="card">' +
    '<label class="fl">Topic, angle, or idea (optional)</label><textarea rows="2" oninput="genTopic(this.value)" placeholder="Leave blank to let it choose">' + esc(g.topic) + "</textarea>" +
    selField("Post type", window.UI.postTypes, g.postType, "genSet('postType',this.value)") +
    selField("Content pillar (optional)", [""].concat(window.UI.pillars), g.pillar, "genSet('pillar',this.value)") +
    selField("Funnel stage", window.UI.funnels, g.funnel, "genSet('funnel',this.value)") +
    selField("Tone", window.UI.tones, g.tone, "genSet('tone',this.value)") +
    selField("Call to action", window.UI.ctas, g.cta, "genSet('cta',this.value)") +
    selField("Length", window.UI.lengths, g.length, "genSet('length',this.value)") +
    '<button class="btn p" style="width:100%;justify-content:center" id="genBtn" onclick="runGenerate()"' + (busy ? " disabled" : "") + ">" +
    (state.generating ? '<span class="spinner"></span> Writing' : "\u2726 Generate post") + "</button>" +
    '<div style="text-align:center;margin:12px 0 10px;color:var(--mut);font-size:11px;letter-spacing:.1em">OR</div>' +
    '<button class="btn g" style="width:100%;justify-content:center" onclick="runWeek()"' + (busy ? " disabled" : "") + ">" +
    (state.weekGen ? '<span class="spinner"></span> Building week' : "\u25A6 Generate 7 day week") + "</button>" +
    '<p class="xs mut" style="margin-top:8px">The weekly option writes seven different posts, each with its own AISE themed image prompt, and saves them to your Content Library.</p>' +
    "</div>";
  var right = state.weekGen ? weeklyLoaderHTML() : state.generating ? genLoaderHTML() : genOutputHTML();
  return head("Generate Post", "Written as " + esc(SESSION.name) + ", in your real LinkedIn voice, with " + esc(SESSION.companyName) + " context baked in.") +
    '<div style="display:grid;grid-template-columns:1fr 1.6fr;gap:16px" class="genwrap">' + form +
    '<div id="genOut">' + right + "</div></div>" +
    "<style>@media(max-width:820px){.genwrap{grid-template-columns:1fr !important;}}</style>";
}
function genLoaderHTML() {
  return '<div class="card"><div class="genload"><div class="orbit"><div class="ring a"></div><div class="ring b"></div><div class="ring c"></div></div>' +
    '<div class="msg" id="genLoadMsg">Studying your voice</div><div class="dots"><i></i><i></i><i></i></div></div></div>';
}
function weeklyLoaderHTML() {
  return '<div class="card"><div class="genload"><div class="orbit"><div class="ring a"></div><div class="ring b"></div><div class="ring c"></div></div>' +
    '<div class="msg" id="weekProg">Generating day 1 of 7</div><div class="dots"><i></i><i></i><i></i></div>' +
    '<div class="xs mut" style="margin-top:12px;text-align:center">Writing a full unique week. This runs seven posts back to back, give it a moment.</div></div></div>';
}
var GEN_MSGS = ["Studying your voice", "Reading the company knowledge base", "Matching your rhythm and tone", "Drafting in your style", "Building the image prompt", "Running the compliance rules"];
function startGenRotation() {
  clearInterval(genTimer); var i = 0;
  genTimer = setInterval(function () {
    var el = $("genLoadMsg"); if (!el) { clearInterval(genTimer); return; }
    i = (i + 1) % GEN_MSGS.length; el.style.opacity = "0";
    setTimeout(function () { if ($("genLoadMsg")) { $("genLoadMsg").textContent = GEN_MSGS[i]; $("genLoadMsg").style.opacity = "1"; } }, 200);
  }, 1500);
}
function genOutputHTML() {
  var out = state.genOut;
  if (!out) return '<div class="card"><div class="empty">Your generated post will appear here. Fill the form and hit Generate, or build a full week.</div></div>';
  COPYREG.gmain = (out.main || "") + (out.hashtags ? "\n\n" + out.hashtags : "");
  COPYREG.galt = out.alt || ""; COPYREG.gimg = out.imagePrompt || ""; COPYREG.gpin = out.pinnedComment || "";
  var hw = humanCheck(out.main || "");
  var hooks = (out.hooks || []).map(function (h, i) { return '<div class="box" style="margin-bottom:8px"><div class="xs mut">Hook ' + (i + 1) + "</div><div class=\"sm\">" + esc(h) + "</div></div>"; }).join("");
  var html = '<div class="card"><div class="flexb"><div class="fm">Your post</div><div class="gap">' +
    '<span class="pill ' + (hw.status === "Clean" ? "em" : hw.status === "Minor notes" ? "am" : "rd") + '">' + hw.status + " " + hw.score + "</span>" + cbtn("gmain") + "</div></div>" +
    '<div class="box pre">' + esc(out.main || "") + "</div>" +
    (out.hashtags ? '<div class="sm acc" style="margin-top:8px">' + esc(out.hashtags) + "</div>" : "") +
    '<div class="gap" style="margin-top:12px"><button class="btn g" onclick="saveToLibrary()">\u2751 Save to library</button><button class="btn g" onclick="sendToCalendar()">\u25A6 Add to calendar</button></div></div>';
  if (hooks) html += '<div class="card"><div class="fm">Alternative hooks</div>' + hooks + "</div>";
  if (out.alt) html += '<div class="card"><div class="flexb"><div class="fm">Shorter version</div>' + cbtn("galt") + '</div><div class="box pre">' + esc(out.alt) + "</div></div>";
  if (out.pinnedComment) html += '<div class="card"><div class="flexb"><div class="fm">Pinned first comment</div>' + cbtn("gpin") + '</div><div class="box sm">' + esc(out.pinnedComment) + "</div></div>";
  if (out.imagePrompt) html += '<div class="card"><div class="flexb"><div class="fm">Image prompt</div>' + cbtn("gimg") + '</div><div class="box pre xs">' + esc(out.imagePrompt) + '</div><p class="xs mut" style="margin-top:6px">Paste into ChatGPT or your image tool. It leaves a clean top left corner so you can drop the real AISE logo on top.</p></div>';
  return html;
}
function ptLabel(k) { if (!k) return ""; var f = (window.UI.postTypes || []).find(function (x) { return x.key === k; }); return f ? f.label : k; }
function genSet(k, v) { state.gen[k] = v; saveLS("gen", state.gen); }
function genTopic(v) { state.gen.topic = v; }

/* ---- single generate ---- */
function runGenerate() {
  if (state.generating || state.weekGen) return;
  state.generating = true; render();
  var payload = Object.assign({ personId: SESSION.personId }, state.gen);
  var model = loadLS("adminModel", null); if (model) payload.model = model;
  fetch("/.netlify/functions/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      clearInterval(genTimer); state.generating = false;
      if (!d.ok) { state.genOut = null; render(); toast(d.error || "Generation failed"); alertCard(d.error); return; }
      state.genOut = d.result; render();
    }).catch(function () {
      clearInterval(genTimer); state.generating = false; render();
      toast("Request failed"); alertCard("Could not reach the generator. If local, make sure you ran netlify dev and the API key is set.");
    });
}
function alertCard(msg) { var el = $("genOut"); if (!el) return; el.innerHTML = '<div class="card"><div class="flag bad">\u26A0 ' + esc(msg || "Something went wrong.") + "</div></div>"; }

/* ---- weekly generate (7 posts, sequential, distinct, with image prompts) ---- */
function runWeek() {
  if (state.generating || state.weekGen) return;
  state.weekGen = true; state.weekStep = 0; render();
  weekStep(0, [], []);
}
function updateWeekProgress() {
  var el = $("weekProg"); if (!el) return;
  var n = state.weekStep || 1;
  var label = WEEK_PLAN[n - 1] ? WEEK_PLAN[n - 1].day : "";
  el.textContent = "Generating day " + n + " of 7" + (label ? " . " + label : "");
}
function weekStep(i, results, avoid) {
  if (i >= WEEK_PLAN.length) { finishWeek(results); return; }
  state.weekStep = i + 1; updateWeekProgress();
  var plan = WEEK_PLAN[i];
  var payload = {
    personId: SESSION.personId, topic: plan.topic, funnel: plan.funnel, postType: plan.postType,
    tone: plan.tone, cta: plan.cta, length: "standard", pillar: plan.pillar, avoid: avoid
  };
  var model = loadLS("adminModel", null); if (model) payload.model = model;
  fetch("/.netlify/functions/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.ok && d.result && d.result.main) {
        var post = d.result;
        results.push({ day: plan.day, funnel: plan.funnel, postType: plan.postType, tone: plan.tone, pillar: plan.pillar, main: post.main, hashtags: post.hashtags || "", imagePrompt: post.imagePrompt || "" });
        var firstLine = (post.main || "").split("\n")[0].slice(0, 130);
        if (firstLine) avoid.push(firstLine);
      }
      weekStep(i + 1, results, avoid);
    }).catch(function () { weekStep(i + 1, results, avoid); });
}
function finishWeek(results) {
  state.weekGen = false;
  if (!results.length) { render(); toast("Week generation failed. Try again."); return; }
  var lib = loadLS("library", []);
  var stamp = new Date().toISOString().slice(0, 10);
  var base = Date.now();
  var newItems = results.map(function (p, idx) {
    return { id: base + idx, main: p.main, hashtags: p.hashtags, imagePrompt: p.imagePrompt, funnel: p.funnel, postType: p.postType, tone: p.tone, pillar: p.pillar, day: p.day, done: false, created: stamp };
  });
  saveLS("library", newItems.concat(lib));
  state.tab = "library"; render();
  toast(results.length + " posts saved to library");
}

function saveToLibrary() {
  if (!state.genOut) return; var lib = loadLS("library", []);
  lib.unshift({ id: Date.now(), main: state.genOut.main, hashtags: state.genOut.hashtags || "", imagePrompt: state.genOut.imagePrompt || "", funnel: state.gen.funnel, postType: state.gen.postType, tone: state.gen.tone, pillar: state.gen.pillar || "", topic: state.gen.topic || "", done: false, created: new Date().toISOString().slice(0, 10) });
  saveLS("library", lib); toast("Saved to library");
}
function sendToCalendar() {
  if (!state.genOut) return; var cal = loadLS("calendar", []); var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  cal.push({ id: Date.now(), day: days[cal.length % 7], time: "9:00 AM", funnel: state.gen.funnel, main: state.genOut.main, hashtags: state.genOut.hashtags || "", done: false });
  saveLS("calendar", cal); toast("Added to calendar");
}

/* ---------------- CALENDAR ---------------- */
function tCalendar() {
  var cal = loadLS("calendar", []); var done = cal.filter(function (c) { return c.done; }).length;
  var rows = cal.length ? cal.map(function (c) {
    COPYREG["cal_" + c.id] = c.main + (c.hashtags ? "\n\n" + c.hashtags : "");
    var hw = humanCheck(c.main);
    return '<div class="card"><div class="flexb" style="margin-bottom:8px"><div class="gap">' +
      '<span class="fm" style="margin:0">' + esc(c.day) + '</span><span class="xs mut">' + esc(c.time) + "</span>" +
      '<span class="pill ' + (c.funnel === "BOFU" ? "te" : "bl") + '">' + esc(c.funnel) + "</span>" +
      '<span class="pill ' + (hw.status === "Clean" ? "em" : hw.status === "Minor notes" ? "am" : "rd") + '">' + hw.status + "</span>" +
      (c.done ? '<span class="pill em">Posted</span>' : "") + '</div><div class="gap">' +
      '<button class="icon" onclick="calDone(' + c.id + ')">' + (c.done ? "Posted \u2713" : "Mark posted") + "</button>" + cbtn("cal_" + c.id) +
      '<button class="icon" onclick="calRemove(' + c.id + ')">\u2715</button></div></div>' +
      '<div class="pre sm' + (c.done ? " mut" : "") + '">' + esc(c.main) + "</div>" +
      (c.hashtags ? '<div class="xs acc" style="margin-top:6px">' + esc(c.hashtags) + "</div>" : "") + "</div>";
  }).join("") : '<div class="card"><div class="empty">No posts scheduled yet. Generate a post and add it to the calendar.</div></div>';
  return head("Weekly Calendar", "Your scheduled posts. Mark them as posted to track the week. Saved in this browser.") +
    '<div class="card"><div class="flexb"><div class="fm">This week</div><span class="sm acc">' + done + " of " + cal.length + " posted</span></div>" +
    (cal.length ? '<div class="gap" style="margin-top:8px"><button class="btn g" onclick="calExport()">\u2913 Export week</button><button class="btn g" onclick="calClear()">Clear all</button></div>' : "") + "</div>" + rows;
}
function calDone(id) { var c = loadLS("calendar", []); c = c.map(function (x) { return x.id === id ? Object.assign({}, x, { done: !x.done }) : x; }); saveLS("calendar", c); render(); }
function calRemove(id) { var c = loadLS("calendar", []).filter(function (x) { return x.id !== id; }); saveLS("calendar", c); render(); }
function calClear() { if (confirm("Clear the whole calendar?")) { saveLS("calendar", []); render(); } }
function calExport() { var c = loadLS("calendar", []); download("linkedin-week.txt", c.map(function (x) { return (x.done ? "[POSTED] " : "") + x.day + " " + x.time + " . " + x.funnel + "\n\n" + x.main + "\n\n" + (x.hashtags || "") + "\n\n----------------\n"; }).join("\n")); }

/* ---------------- LIBRARY ---------------- */
function tLibrary() {
  var lib = loadLS("library", []);
  if (!lib.length) return head("Content Library", "Saved drafts live here. Copy, mark posted, or remove them.") + '<div class="card"><div class="empty">Nothing saved yet. Generate a post or a full week and it will show up here.</div></div>';
  var posted = lib.filter(function (l) { return l.done; }).length;
  var cards = lib.map(function (l) {
    COPYREG["lib_" + l.id] = l.main + (l.hashtags ? "\n\n" + l.hashtags : "");
    COPYREG["libimg_" + l.id] = l.imagePrompt || "";
    var hw = humanCheck(l.main);
    return '<div class="card"><div class="flexb" style="margin-bottom:8px"><div class="gap">' +
      (l.day ? '<span class="pill bl">' + esc(l.day) + "</span>" : "") +
      '<span class="pill ' + (l.funnel === "BOFU" ? "te" : "bl") + '">' + esc(l.funnel) + "</span>" +
      (ptLabel(l.postType || l.format) ? '<span class="pill">' + esc(ptLabel(l.postType || l.format)) + "</span>" : "") +
      (l.pillar ? '<span class="pill te">' + esc(l.pillar) + "</span>" : "") +
      '<span class="pill ' + (hw.status === "Clean" ? "em" : hw.status === "Minor notes" ? "am" : "rd") + '">' + hw.status + "</span>" +
      (l.done ? '<span class="pill em">Posted</span>' : "") +
      '<span class="xs mut">' + esc(l.created) + '</span></div><div class="gap">' +
      '<button class="icon" onclick="libDone(' + l.id + ')">' + (l.done ? "Posted \u2713" : "Mark posted") + "</button>" +
      cbtn("lib_" + l.id) +
      '<button class="icon" onclick="libToCal(' + l.id + ')" title="Add to calendar">\u25A6</button>' +
      '<button class="icon" onclick="libRemove(' + l.id + ')">\u2715</button></div></div>' +
      '<div class="pre sm' + (l.done ? " mut" : "") + '">' + esc(l.main) + "</div>" +
      (l.hashtags ? '<div class="xs acc" style="margin-top:8px">' + esc(l.hashtags) + "</div>" : "") +
      (l.imagePrompt ? '<div class="flexb" style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><div class="xs mut">\uD83D\uDDBC Image prompt (AISE themed)</div><button class="icon" onclick="copyKey(\'libimg_' + l.id + '\')">Copy</button></div><div class="box pre xs" style="margin-top:6px">' + esc(l.imagePrompt) + "</div>" : "") +
      "</div>";
  }).join("");
  return head("Content Library", lib.length + " saved post" + (lib.length === 1 ? "" : "s") + ". " + posted + " marked posted. Each shows the full post, hashtags, and an AISE themed image prompt.") +
    '<div class="card"><div class="gap"><button class="btn g" onclick="libExport()">\u2913 Export all</button><button class="btn g" onclick="libClear()">Clear all</button></div></div>' + cards;
}
function libDone(id) { var l = loadLS("library", []); l = l.map(function (x) { return x.id === id ? Object.assign({}, x, { done: !x.done }) : x; }); saveLS("library", l); render(); }
function libRemove(id) { var l = loadLS("library", []).filter(function (x) { return x.id !== id; }); saveLS("library", l); render(); }
function libToCal(id) { var l = loadLS("library", []).find(function (x) { return x.id === id; }); if (!l) return; var cal = loadLS("calendar", []); var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]; cal.push({ id: Date.now(), day: l.day || days[cal.length % 7], time: "9:00 AM", funnel: l.funnel, main: l.main, hashtags: l.hashtags, done: false }); saveLS("calendar", cal); toast("Added to calendar"); }
function libClear() { if (confirm("Clear the whole library?")) { saveLS("library", []); render(); } }
function libExport() { var l = loadLS("library", []); download("content-library.txt", l.map(function (x) { return (x.done ? "[POSTED] " : "") + (x.day ? x.day + " . " : "") + x.funnel + "\n\n" + x.main + "\n\n" + (x.hashtags || "") + (x.imagePrompt ? "\n\nIMAGE PROMPT:\n" + x.imagePrompt : "") + "\n\n----------------\n"; }).join("\n")); }

/* ---------------- COMPLIANCE ---------------- */
function tCompliance() {
  var r = humanCheck(state.pvText);
  var flags = r.issues.length ? r.issues.map(function (i) { return '<div class="flag ' + (i.s === "bad" ? "bad" : "warn") + '">' + (i.s === "bad" ? "\u26A0 " : "\u2022 ") + esc(i.m) + "</div>"; }).join("") : '<div class="flag" style="color:#6ee7b7">No issues found. This reads clean.</div>';
  var rules = ["No em or en dashes", "No semicolons", "No mid sentence colons", "No hyphens inside words in prose", "No outcome guarantees, reframe as engineered authority", "No fabricated precise statistics", "Short human sentences, real person voice"];
  return head("Compliance Check", "Paste any draft to scan it against the house style and compliance rules before you publish.") +
    '<div class="g2"><div class="card"><label class="fl">Paste a draft</label><textarea rows="12" oninput="pvInput(this.value)" placeholder="Paste your post here">' + esc(state.pvText) + "</textarea>" +
    '<div id="pvResult"><div class="gap"><span class="pill ' + (r.status === "Clean" ? "em" : r.status === "Minor notes" ? "am" : "rd") + '">' + r.status + " " + r.score + "</span></div><div style=\"margin-top:10px\">" + flags + "</div></div></div>" +
    '<div class="card"><div class="fm">House rules</div><ul class="sm mut" style="padding-left:18px;line-height:1.8;margin:0">' + rules.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></div>";
}
function pvInput(v) {
  state.pvText = v; var r = humanCheck(v);
  var flags = r.issues.length ? r.issues.map(function (i) { return '<div class="flag ' + (i.s === "bad" ? "bad" : "warn") + '">' + (i.s === "bad" ? "\u26A0 " : "\u2022 ") + esc(i.m) + "</div>"; }).join("") : '<div class="flag" style="color:#6ee7b7">No issues found. This reads clean.</div>';
  var box = $("pvResult");
  if (box) box.innerHTML = '<div class="gap"><span class="pill ' + (r.status === "Clean" ? "em" : r.status === "Minor notes" ? "am" : "rd") + '">' + r.status + " " + r.score + "</span></div><div style=\"margin-top:10px\">" + flags + "</div>";
}

/* ---------------- PROFILE ---------------- */
function tProfile() {
  return head("My Voice Profile", "This is the profile the generator uses to write as you. To change samples or wording, ask Ahmed to update the backend profile.") +
    '<div class="card"><div class="fm">' + esc(SESSION.name) + " . " + esc(SESSION.title) + '</div>' +
    '<div class="gap" style="margin-bottom:12px"><span class="pill bl">' + esc(SESSION.companyName) + '</span><span class="pill te">' + esc(SESSION.sampleCount || 0) + ' voice samples loaded</span></div>' +
    '<div class="head-uc">Headline</div><div class="box sm">' + esc(SESSION.headline) + "</div>" +
    '<div class="head-uc">About</div><div class="box sm pre">' + esc(SESSION.about) + "</div>" +
    '<div class="head-uc">Primary audience</div><div class="box sm">' + esc(SESSION.audience) + "</div></div>" +
    '<div class="card"><div class="fm">What the generator does with this</div><p class="sm mut">It studies your real posts and writes new content that matches your rhythm, sentence length, openings, and vocabulary. The ' + esc(SESSION.companyName) + ' knowledge base is layered on for accuracy, and every draft obeys the compliance rules.</p></div>';
}

/* ---------------- SETTINGS (admin) ---------------- */
function tSettings() {
  var model = loadLS("adminModel", "claude-sonnet-4-6");
  return head("Settings", "Admin control panel. Manage the backend connection and generation model. The Claude API key stays hidden on the server and is never shown here.") +
    '<div class="card"><div class="flexb"><div class="fm">Backend connection</div><button class="btn g" onclick="checkStatus(false)">Check key</button></div>' +
    '<div id="statusBox" class="box sm mut">Click Check key to verify the backend has the API key configured.</div>' +
    '<div class="gap" style="margin-top:10px"><button class="btn p" onclick="checkStatus(true)">Run live test call</button></div>' +
    '<p class="xs mut" style="margin-top:10px">The key is set as ANTHROPIC_API_KEY in the Netlify dashboard under Site settings, Environment variables. It is never sent to the browser.</p></div>' +
    '<div class="card"><div class="fm">Generation model</div><p class="sm mut">Applied to all accounts. Sonnet is the best balance. Switch to Haiku if you ever hit a timeout on the weekly batch.</p>' + selField("Model", window.UI.models, model, "setModel(this.value)") + "</div>" +
    '<div class="card"><div class="fm">The accounts</div><table><thead><tr><th>Person</th><th>Role</th><th>Voice</th></tr></thead><tbody>' +
    accRow("Syed Muhammad Ahmed", "Admin", "AISE, automation plus AEO") +
    accRow("Aman Jamil", "Member", "AISE, calm educational AEO") +
    accRow("Dacia Wilder", "Member", "TPX, executive marketing") +
    accRow("David Wilder", "Member", "TPX, bold authority, guarantees softened") +
    accRow("Aasheen Khan", "Member", "AISE, client success seat, grounded and practical") +
    accRow("Marium Khurram", "Member", "TPX, writer and SEO plus AEO") +
    "</tbody></table><p class=\"xs mut\" style=\"margin-top:10px\">To edit any voice profile, samples, or passwords, update profiles.js in the backend functions folder and redeploy.</p></div>";
}
function accRow(n, r, v) { return "<tr><td>" + esc(n) + "</td><td>" + esc(r) + "</td><td class=\"mut\">" + esc(v) + "</td></tr>"; }
function setModel(v) { saveLS("adminModel", v); toast("Model set to " + v); }
function checkStatus(test) {
  var box = $("statusBox"); if (box) box.innerHTML = '<span class="spinner"></span> Checking';
  fetch("/.netlify/functions/status" + (test ? "?test=1" : "")).then(function (r) { return r.json(); }).then(function (d) {
    if (!box) return; var lines = [];
    lines.push(d.connected ? '<span class="acc">\u25CF API key configured</span>' : '<span style="color:#fca5a5">\u25CF No API key found</span>');
    lines.push("Default model " + esc(d.defaultModel));
    if (d.tested) lines.push(d.testOk ? '<span class="acc">\u25CF Live call succeeded</span>' : '<span style="color:#fca5a5">\u25CF ' + esc(d.testMessage) + "</span>");
    box.innerHTML = lines.join("<br>");
  }).catch(function () { if (box) box.innerHTML = '<span style="color:#fca5a5">Could not reach the status endpoint.</span>'; });
}

/* ---------------- init ---------------- */
(function init() {
  var pass = $("credPass"); if (pass) pass.addEventListener("keydown", function (e) { if (e.key === "Enter") submitCred(); });
  if (restoreSession()) { $("boot").style.display = "none"; startApp(); }
  else { runBoot(function () { renderProfileWall(); }); }
})();
