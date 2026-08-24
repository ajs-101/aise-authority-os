// ============================================================
// login.js  -  validates credentials on the server.
// Supports the new profile card flow (personId + password) and
// the classic username + password flow. Passwords never ship
// to the browser.
// ============================================================

const { PROFILES, COMPANIES } = require("./profiles");

function respond(personId, p) {
  const company = COMPANIES[p.company];
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ok: true,
      personId: personId,
      role: p.role,
      name: p.name,
      title: p.title,
      headline: p.headline,
      about: p.about,
      audience: p.audience,
      companyName: company.name,
      companyShort: company.short,
      sampleCount: (p.samples || []).length
    })
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Bad request" }) };
  }

  const personId = String(body.personId || "").trim();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  // Profile card flow: personId + password
  if (personId) {
    const p = PROFILES[personId];
    if (p && p.password === password) return respond(personId, p);
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Wrong password for this profile" }) };
  }

  // Classic flow: username + password
  const entry = Object.entries(PROFILES).find(
    ([, p]) => p.username.toLowerCase() === username.toLowerCase() && p.password === password
  );
  if (entry) return respond(entry[0], entry[1]);

  return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Invalid username or password" }) };
};