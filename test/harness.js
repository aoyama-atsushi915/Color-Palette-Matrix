// Minimal DOM stub so app.js can be executed headlessly under jsc.
var captured = { domReady: null, handlers: {}, downloads: [], toasts: [] };

function makeEl(id) {
    var e = {
        id: id,
        value: '',
        textContent: '',
        title: '',
        className: '',
        style: {},
        children: [],
        _attrs: {},
        classList: { add: function () {}, remove: function () {} },
        addEventListener: function (type, fn) {
            captured.handlers[id + ':' + type] = fn;
        },
        setAttribute: function (k, v) {
            e._attrs[k] = v;
            if (k === 'href' || k === 'download') {
                var last = captured.downloads[captured.downloads.length - 1];
                if (!last || last[k] !== undefined) captured.downloads.push({});
                captured.downloads[captured.downloads.length - 1][k] = v;
            }
        },
        getAttribute: function (k) { return e._attrs[k]; },
        querySelector: function () { return makeEl(id + '-child'); },
        appendChild: function (c) { e.children.push(c); if (id === 'toast-container') captured.toasts.push(c.innerHTML); },
        removeChild: function () {},
        click: function () {},
        focus: function () {}
    };
    // Mirror the real behaviour: assigning innerHTML replaces the element's children.
    var _html = '';
    Object.defineProperty(e, 'innerHTML', {
        get: function () { return _html; },
        set: function (v) { _html = v; if (v === '') e.children = []; }
    });
    return e;
}

var elements = {};
var document = {
    addEventListener: function (type, fn) { if (type === 'DOMContentLoaded') captured.domReady = fn; },
    getElementById: function (id) { if (!elements[id]) elements[id] = makeEl(id); return elements[id]; },
    querySelectorAll: function () { return { forEach: function () {} }; },
    getElementsByName: function () { return { forEach: function () {} }; },
    createElement: function (tag) { return makeEl('created-' + tag); },
    body: makeEl('body'),
    activeElement: null
};
// ダウンロードは Blob 経由なので、中身を取り出せるよう最小限のスタブを置く。
var __blobs = {};
var __blobSeq = 0;
function Blob(parts) { this._text = parts.join(''); }
var URL = {
    createObjectURL: function (blob) {
        var url = 'blob:test/' + (++__blobSeq);
        __blobs[url] = blob._text;
        return url;
    },
    revokeObjectURL: function () {}
};

var window = { matchMedia: function () { return { matches: false }; } };
var navigator = { clipboard: { writeText: function () { return { then: function () { return { catch: function () {} }; } }; } } };
function setTimeout() {}
var console = { error: function () {} };
