// ============================================================
// js/utils.js  -  DOM, LocalStorage, Escaping, Toast & File Utilities
// ============================================================

function $(id) {
  return document.getElementById(id);
}

function loadLS(k, df) {
  try {
    var v = localStorage.getItem("aise_" + k);
    return v ? JSON.parse(v) : df;
  } catch (e) {
    return df;
  }
}

function saveLS(k, v) {
  try {
    localStorage.setItem("aise_" + k, JSON.stringify(v));
  } catch (e) {}
}

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toast(msg, dur) {
  var t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function () {
    t.classList.remove("show");
  }, dur || 2600);
}

function download(filename, text) {
  var a = document.createElement("a");
  a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
