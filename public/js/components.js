// ============================================================
// js/components.js  -  Reusable UI Components & Form Fields
// ============================================================

function head(title, subtitle) {
  return (
    '<h2 class="h">' +
    esc(title) +
    '</h2><div class="h-sub">' +
    esc(subtitle) +
    "</div>"
  );
}

function selField(label, options, value, onchange) {
  var html =
    '<div><label class="fl">' +
    esc(label) +
    '</label><select onchange="' +
    onchange +
    '">';
  for (var i = 0; i < options.length; i++) {
    var o = options[i];
    var k = typeof o === "object" ? o.key : o;
    var l = typeof o === "object" ? o.label : o;
    var sel = k === value ? " selected" : "";
    html += '<option value="' + esc(k) + '"' + sel + ">" + esc(l) + "</option>";
  }
  html += "</select></div>";
  return html;
}

function textField(label, value, placeholder, onchange) {
  return (
    '<div><label class="fl">' +
    esc(label) +
    '</label><input type="text" value="' +
    esc(value || "") +
    '" placeholder="' +
    esc(placeholder || "") +
    '" onchange="' +
    onchange +
    '"></div>'
  );
}

function textareaField(label, value, placeholder, onchange) {
  return (
    '<div><label class="fl">' +
    esc(label) +
    '</label><textarea rows="3" placeholder="' +
    esc(placeholder || "") +
    '" onchange="' +
    onchange +
    '">' +
    esc(value || "") +
    "</textarea></div>"
  );
}

function accRow(n, r, v) {
  return (
    "<tr><td>" +
    esc(n) +
    "</td><td>" +
    esc(r) +
    '</td><td class="mut">' +
    esc(v) +
    "</td></tr>"
  );
}
