// ============================================================
// utils/company.js  -  Shared company helper for backend functions
// ============================================================

const { COMPANIES } = require("../profiles");

/**
 * Safely lookup company object by key, name, or short code.
 * Falls back to COMPANIES.aise if unmatched.
 * @param {string} key
 * @returns {object} Company object { name, short, line, what, ... }
 */
function getCompany(key) {
  if (!key) return COMPANIES.aise;
  if (COMPANIES[key]) return COMPANIES[key];
  
  const k = String(key).trim().toLowerCase();
  if (COMPANIES[k]) return COMPANIES[k];
  
  const found = Object.values(COMPANIES).find(
    (c) => c.name.toLowerCase() === k || c.short.toLowerCase() === k
  );
  
  return found || COMPANIES.aise;
}

module.exports = { getCompany };
