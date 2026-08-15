// Drives the stubbed app and asserts the two fixed defects stay fixed.
captured.domReady();

// ブラウザが実際にファイルとして保存する中身を再現する。
// data: URI の場合は '#' 以降がフラグメント扱いで捨てられる点まで含めて再現しないと、
// 「壊れているのにテストは通る」状態になる。
function savedText(href) {
    if (href.indexOf('blob:') === 0) return __blobs[href];
    var beforeHash = href.split('#')[0];
    return decodeURIComponent(beforeHash.slice(beforeHash.indexOf(',') + 1));
}
function setColor(hex) {
    elements['color-input'].value = hex;
    captured.handlers['color-input:input']({ target: { value: hex } });
}
function setName(name) {
    elements['color-name-input'].value = name;
    captured.handlers['color-name-input:input']({ target: { value: name } });
}
function exportCsv() {
    captured.downloads = [];
    captured.toasts = [];
    captured.handlers['btn-export-csv:click']();
    return captured.downloads.length ? savedText(captured.downloads[0].href) : null;
}

var fails = 0;
function check(label, cond, detail) {
    print((cond ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  → ' + detail : ''));
    if (!cond) fails++;
}

// --- Defect (a): duplicate primitive paths in the export ---
setColor('#e53935'); // red base; name auto-updates to 'red'
var csv = exportCsv();
var names = csv.trim().split('\n').slice(1).map(function (l) { return l.split(',')[0]; });
var seen = {}, dupes = [];
names.forEach(function (n) { if (seen[n]) { if (dupes.indexOf(n) < 0) dupes.push(n); } seen[n] = 1; });
check('red base: no duplicate variable paths', dupes.length === 0, dupes.slice(0, 3).join(' / '));
check('red base: exports 266 rows', names.length === 266, names.length + ' rows');

// --- Defect (c): the download was a data: URI built with encodeURI(), which does not
// escape '#'. Every hex value starts with '#', so the browser treated the first colour
// as the URL fragment and saved only the header plus one partial row. ---
check('CSV carries every colour value', csv.split('#').length - 1 === 266,
      (csv.split('#').length - 1) + ' hex values');
check('CSV last row is intact', /primitive\/blue-grey\/a700,#[0-9a-f]{6},Color\s*$/.test(csv.trim()),
      csv.trim().split('\n').slice(-1)[0]);
check('download is not a data: URI', captured.downloads[0].href.indexOf('data:') !== 0,
      captured.downloads[0].href.slice(0, 20));

// --- Defect (a) cont.: custom name lands on the anchor hue, not on Indigo ---
setColor('#e53935');
setName('toyota');
csv = exportCsv();
check('custom name applies to anchor hue (red)', csv.indexOf('primitive/toyota/500') !== -1);
check('custom name does NOT hijack indigo', csv.indexOf('primitive/indigo/500') !== -1);
check('anchor hue key is gone from export', csv.indexOf('primitive/red/500') === -1);

// --- Name collision guard ---
setColor('#3f51b5'); // indigo anchor
setName('blue');     // collides with the standard Blue hue
captured.downloads = []; captured.toasts = [];
captured.handlers['btn-export-csv:click']();
check('colliding name blocks the export', captured.downloads.length === 0);
check('colliding name warns the user', captured.toasts.length === 1 && captured.toasts[0].indexOf('重複') !== -1);

// --- Defect (b): single-palette view follows the anchor, not the free-form name ---
setColor('#e53935');
setName('brand');
var cards = elements['palette-grid'].children;
var swatch500 = null;
cards.forEach(function (c) { if (c.getAttribute('data-tone') === '500') swatch500 = c.getAttribute('data-color'); });
check('single view renders 14 swatches', cards.length === 14, cards.length + ' cards');
check('single view 500 == input color (not indigo)', swatch500 === '#e53935', String(swatch500));

// --- Snippet output uses the free-form name as a label ---
check('CSS snippet labels the brand name', elements['code-css-vars'].textContent.indexOf('--primitive-brand-') !== -1 ||
      elements['code-css-vars'].textContent.indexOf('--primitive-red-') !== -1);

print('');
print(fails === 0 ? 'ALL PASS' : fails + ' FAILURE(S)');
