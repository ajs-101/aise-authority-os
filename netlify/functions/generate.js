// ============================================================
// generate.js  -  the engine.
// Writes LinkedIn posts in each person's voice with a strong
// human, non AI feel, a real hook, and a chosen post type.
// Calls Claude with the hidden key. Supports an avoid list so
// weekly batches never repeat.
// ============================================================

const { PROFILES, COMPANIES, COMPLIANCE } = require("./profiles");

const ALLOWED_MODELS = {
  "claude-sonnet-4-6": "claude-sonnet-4-6",
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "claude-opus-4-8": "claude-opus-4-8"
};
const DEFAULT_MODEL = "claude-sonnet-4-6";

const FUNNEL_MEANING = {
  TOFU: "Top of funnel. Educate and create awareness. No pitch. Pure value.",
  MOFU: "Middle of funnel. Build trust and show how it works. Frameworks and proof of thinking.",
  BOFU: "Bottom of funnel. Soft conversion. Invite a conversation, an audit, or a call without being pushy."
};

const LENGTH_MEANING = {
  short: "Short. Four to seven short lines. Every line earns its place.",
  standard: "Standard. Roughly eight to fourteen short lines with white space between thoughts.",
  long: "Long. A deeper post that still reads fast because the lines stay short and the ideas keep moving."
};

// ---- POST TYPES. Each is a real, distinct structure, not just a label. ----
const POST_TYPES = {
  auto:
    "Choose the single best structure for this topic and audience. Pick the one that would actually stop the scroll and pull comments, then commit to it fully.",
  contrarian:
    "Contrarian take. Open by naming a belief most people in this space hold, then flip it in the very next line. Spend the post defending the flip with plain reasoning and a concrete example. Do not hedge. Take the position and hold it. End by inviting people who disagree to say so.",
  pain:
    "Pain point story. Open inside the reader's frustration, in their own plain words, the way they would actually describe it to a friend. Name the cost of that problem. Then show the shift, what changes when it is done right. Keep the focus on the reader, not on you. The reader should think, that is literally me.",
  framework:
    "Framework or how it works. Teach the mechanism behind the topic. Break it into clear steps or signals, each on its own line, each specific. The reader should finish feeling they understand something they did not before, and that you clearly know it cold.",
  lesson:
    "Personal lesson. Use I or we. Tell a short, real, specific moment or realization from the work, then pull one clear principle out of it for the reader to use. Concrete details make it believable. No humble bragging, no fake vulnerability.",
  myth:
    "Myth versus reality. State a common myth flatly in the first line. Say plainly that it is wrong. Then give the real picture with a specific reason it holds up. Sharp, confident, useful.",
  observation:
    "Observation or trend. Point at something quietly shifting in how people search, buy, or get recommended, that most have not clocked yet. Make the reader feel early to it. Ground it in something concrete, not vague futurism.",
  prediction:
    "Bold prediction. Make one specific, falsifiable claim about where this is heading. Give the reasoning in a few tight lines. Confident, not hype. Invite people to agree or push back.",
  tips:
    "Quick tips or checklist. Give a tight list of specific, do it today actions. No fluff between them. Each line is a real tactic the reader could apply within the hour.",
  question:
    "Question led. Open with a sharp, specific question the reader has actually wondered about. Explore it honestly, give your real view, and leave the thread genuinely open so people want to answer in the comments."
};

// ---- The anti AI, human voice rulebook. This is the core of the upgrade. ----
const HUMAN_VOICE = `
WRITE LIKE A REAL PERSON, NOT LIKE AI. This is the most important instruction. A post that reads as AI written kills reach and trust. Follow every rule:

RHYTHM
- Vary sentence length hard. Mix very short lines, some only two or three words, with a couple of longer ones. Never let every line be the same medium length. That evenness is the number one tell of AI writing.
- One idea per line. Break lines often. Use white space as punctuation.
- Fragments are good. Starting a line with And, But, or So is good. Write the way a sharp person talks.
- Use contractions everywhere. It is becomes it's. You are becomes you're.

BANNED AI TELLS, never use these:
- Words and phrases: delve, dive in, unlock, unleash, elevate, leverage as a verb, harness, realm, landscape, tapestry, testament, game changer, supercharge, navigate the, in today's fast paced, in the world of, when it comes to, that said, needless to say, rest assured, look no further, the truth is, at the end of the day.
- No "it's not just X, it's Y" as a formula. No rhetorical lists of three that sound balanced. No "moreover", "furthermore", "in conclusion".
- No smooth, tidy summary ending that wraps everything in a bow. Real posts stop hard on the point or the question.
- No emoji unless the person's real samples use them. No hashtag stuffing inside the body.

FEEL
- Sound like the person typed it fast on their phone because they had a point to make, not like an essay.
- Concrete over abstract every time. Real numbers, real specifics, real scenarios beat clever generalities.
- Talk to the reader as you. Make it about their problem, not about how great the company is.
- It is fine to be a little blunt or opinionated. Flat and safe is worse than sharp.

THE HOOK, treat this as make or break:
- The first line has to stop the scroll on its own. Curiosity, a bold claim, a callout, or tension. Never a throat clearing intro.
- Keep the first two lines short so LinkedIn shows them before the see more cut. The reader should have to click to keep reading.
- Never open with the conclusion. Open with the thing that makes them need the conclusion.

THE ENDING:
- End on one genuine question that a real person would want to answer in the comments. Not a yes or no. Not "thoughts?". Something specific to the post.
`.trim();

// AISE house style for the image. The logo is never drawn by the model,
// a clean corner is reserved so the real AISE logo can be dropped on top.
const IMAGE_STYLE =
  "Build the image around the single core idea of THIS specific post, so it visually matches what the post is about, not a generic brand graphic. Premium editorial tech style on a deep navy and charcoal base, with electric blue, emerald, and teal accents, soft glows, and a subtle abstract answer engine or signal motif that fits this post's idea. Modern, clean, high end B2B, never busy or salesy. Reserve a clean empty area in the top left corner with safe padding so the real AISE logo can be placed there afterward, do not draw any logo, wordmark, or brand symbol yourself. If an on image headline is included, keep it to a few words in a clean bold sans serif with strong contrast, spelled exactly as given, no other text, no misspellings.";

function buildSystemPrompt(p, company) {
  const samples = (p.samples || [])
    .map((s, i) => `--- REAL POST ${i + 1} BY ${p.name} ---\n${s}`)
    .join("\n\n");

  return `You are an elite LinkedIn ghostwriter writing AS ${p.name}, ${p.title} at ${company.name}. Your job is posts that grow the account: more impressions, more profile views, more real comments. Posts that sound human and earn the scroll stop.

WHO YOU ARE WRITING AS
Name: ${p.name}
Title: ${p.title} at ${company.name}
Headline: ${p.headline}
About: ${p.about}
Primary audience: ${p.audience}

VOICE TO MATCH EXACTLY
${p.fingerprint}

STUDY THESE REAL POSTS BY ${p.name}. Match the rhythm, the sentence length, the openings, the vocabulary, and the line breaks. Write new content that sounds like the same person wrote it, on a good day.

${samples}

${HUMAN_VOICE}

COMPANY CONTEXT, for accuracy only, never copy promotional lines word for word, never sound like an ad
${company.name}. ${company.line}.
${company.what}
Framework: ${company.framework}
Services: ${company.services}
Booking link if a call to action needs one: ${company.booking}

${COMPLIANCE}

You will be given the brief. Return only the JSON object described, nothing else.`;
}

function buildUserPrompt(req) {
  let avoidBlock = "";
  if (req.avoid && req.avoid.length) {
    avoidBlock =
      "\n\nIMPORTANT, this post is part of a 7 day series for the same person. The opening lines below have ALREADY been used this week. Write something clearly different. A different opening, a different angle, a different core idea. Do not echo these:\n- " +
      req.avoid.slice(0, 12).join("\n- ");
  }

  const pt = POST_TYPES[req.postType] || POST_TYPES.auto;

  return `Write one LinkedIn post that reads as genuinely human and is built to get impressions, profile views, and real comments.

Topic or angle: ${req.topic || "your choice, pick something sharp and specific within the pillar below"}
Content pillar: ${req.pillar || "your choice"}
POST TYPE, follow this structure: ${pt}
Funnel stage: ${req.funnel}. ${FUNNEL_MEANING[req.funnel] || ""}
Tone: ${req.tone}
Call to action: ${req.cta}
Length: ${LENGTH_MEANING[req.length] || LENGTH_MEANING.standard}${avoidBlock}

Before you write, silently plan the hook so the first two lines stop the scroll. Then write the post following the human voice rules exactly. Read it back once and cut any line that sounds like AI, any even rhythm, and any tidy wrap up ending.

Return ONLY valid JSON, no preamble, no markdown code fences, in this exact shape:
{
  "hooks": ["three sharp alternative opening lines, each one line, each able to stop the scroll on its own"],
  "main": "the full post ready to paste, with real line breaks as \\n. Open with the strongest hook, vary the line lengths, end on a specific question",
  "alt": "one shorter, punchier alternative version of the same post",
  "hashtags": "four to six relevant hashtags on a single line",
  "imagePrompt": "a detailed image generation prompt for THIS specific post. ${IMAGE_STYLE}",
  "pinnedComment": "a natural first comment to pin under the post, in the same human voice, that adds one more useful point or nudges discussion"
}`;
}

function safeParse(text) {
  let t = String(text || "").trim();
  t = t.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  try {
    return JSON.parse(t);
  } catch (e) {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "API key not configured. Set ANTHROPIC_API_KEY in Netlify environment variables." })
    };
  }

  let req = {};
  try {
    req = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Bad request body" }) };
  }

  const p = PROFILES[req.personId];
  if (!p) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Unknown profile" }) };
  }
  const company = COMPANIES[p.company];

  req.funnel = req.funnel || "TOFU";
  req.tone = req.tone || "Professional";
  req.cta = req.cta || "Soft question";
  req.length = req.length || "standard";
  req.postType = req.postType || "auto";

  const model = ALLOWED_MODELS[req.model] || ALLOWED_MODELS[DEFAULT_MODEL];

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1500,
        temperature: 1,
        system: buildSystemPrompt(p, company),
        messages: [{ role: "user", content: buildUserPrompt(req) }]
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      const msg = (data && data.error && data.error.message) || "Claude API error";
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: msg }) };
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const parsed = safeParse(text);
    const result = parsed || { hooks: [], main: text, alt: "", hashtags: "", imagePrompt: "", pinnedComment: "" };

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, result: result, model: model })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err && err.message || err) }) };
  }
};
