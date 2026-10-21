// A real (small) HTML parser + DOM implementation.
//
// Enough to build a genuine element tree from the page markup so that
// querySelector/querySelectorAll behave like a browser, which lets the
// functional tests exercise real filtering behaviour instead of stubs.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

class Node {
  constructor(tag) {
    this.tagName = (tag || '').toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = {};
    this._text = '';
  }
  get children() { return this.childNodes.filter(n => n instanceof Element); }
  get textContent() {
    if (!this.childNodes.length) return this._text;
    return this.childNodes.map(n => (n instanceof Element ? n.textContent : n._text)).join(' ');
  }
  set textContent(v) { this._text = String(v); this.childNodes = []; }
  get innerHTML() { return this._htmlRaw || ''; }
  set innerHTML(v) {
    this._htmlRaw = String(v);
    this.childNodes = [];
    const frag = parseHTML(String(v));
    for (const n of frag.childNodes) { n.parentNode = this; this.childNodes.push(n); }
  }
  appendChild(c) { c.parentNode = this; this.childNodes.push(c); return c; }
  insertBefore(c, ref) {
    c.parentNode = this;
    const i = this.childNodes.indexOf(ref);
    if (i === -1) this.childNodes.push(c); else this.childNodes.splice(i, 0, c);
    return c;
  }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i > -1) this.childNodes.splice(i, 1); return c; }
  get firstElementChild() { return this.children[0] || null; }
  get nextElementSibling() {
    if (!this.parentNode) return null;
    const sibs = this.parentNode.children;
    const i = sibs.indexOf(this);
    return sibs[i + 1] || null;
  }
  get previousElementSibling() {
    if (!this.parentNode) return null;
    const sibs = this.parentNode.children;
    const i = sibs.indexOf(this);
    return sibs[i - 1] || null;
  }
  get parentElement() { return this.parentNode instanceof Element ? this.parentNode : null; }
}

class Element extends Node {
  constructor(tag) {
    super(tag);
    this.style = {};
    this.hidden = false;
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this._dataset = {};
    this.listeners = {};
    const self = this;
    this.classList = {
      add: (c) => { const s = self._classes(); if (!s.has(c)) s.add(c); },
      remove: (c) => self._classes().delete(c),
      contains: (c) => self._classes().has(c),
      toggle: (c, on) => {
        const s = self._classes();
        if (on === undefined) { s.has(c) ? s.delete(c) : s.add(c); }
        else if (on) s.add(c); else s.delete(c);
      }
    };
  }
  _classes() {
    if (!this._cls) this._cls = new Set((this.attributes.class || '').split(/\s+/).filter(Boolean));
    return this._cls;
  }
  get className() { return this.attributes.class || ''; }
  set className(v) { this.attributes.class = v; this._cls = null; }
  get id() { return this.attributes.id || ''; }
  set id(v) { this.attributes.id = v; }
  get href() { return this.attributes.href || ''; }
  set href(v) { this.attributes.href = v; }
  get dataset() { return this._dataset; }
  getAttribute(n) { return this.attributes[n] === undefined ? null : this.attributes[n]; }
  setAttribute(n, v) { this.attributes[n] = v; if (n === 'class') this._cls = null; }
  removeAttribute(n) { delete this.attributes[n]; }
  hasAttribute(n) { return this.attributes[n] !== undefined; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  removeEventListener(t, fn) { if (this.listeners[t]) this.listeners[t] = this.listeners[t].filter(f => f !== fn); }
  dispatchEvent(t, ev) { (this.listeners[t] || []).forEach(fn => fn(ev || { preventDefault() {}, stopPropagation() {} })); }
  focus() {}
  select() {}
  closest(sel) {
    let n = this;
    while (n && n instanceof Element) {
      if (matches(n, sel)) return n;
      n = n.parentNode;
    }
    return null;
  }
  querySelector(sel) { return queryAll(this, sel)[0] || null; }
  querySelectorAll(sel) { return queryAll(this, sel); }
  matches(sel) { return matches(this, sel); }
}

// ---- selector support -----------------------------------------------------
// Supports: tag, #id, .class, [attr], [attr="value"], descendant combinator
// (space-separated groups), and comma-separated groups.
function matches(el, sel) {
  if (!sel) return false;
  return sel.split(',').map(s => s.trim()).filter(Boolean).some(s => matchesSequence(el, s));
}

// A sequence like "section.section[id]" means the element must match the
// LAST simple selector and have ancestors matching the ones before it.
function matchesSequence(el, sel) {
  const parts = sel.split(/\s+/).filter(Boolean);
  if (!parts.length) return false;
  if (!matchesSingle(el, parts[parts.length - 1])) return false;
  let node = el.parentNode;
  for (let i = parts.length - 2; i >= 0; i--) {
    let found = false;
    while (node && node instanceof Element) {
      if (matchesSingle(node, parts[i])) { found = true; node = node.parentNode; break; }
      node = node.parentNode;
    }
    if (!found) return false;
  }
  return true;
}

function matchesSingle(el, sel) {
  const parts = sel.match(/(^[a-zA-Z][\w-]*)|(#[\w-]+)|(\.[\w-]+)|(\[[^\]]+\])/g) || [];
  if (!parts.length) return false;
  for (const p of parts) {
    if (p.startsWith('#')) { if (el.id !== p.slice(1)) return false; }
    else if (p.startsWith('.')) { if (!el._classes().has(p.slice(1))) return false; }
    else if (p.startsWith('[')) {
      const m = p.slice(1, -1).match(/^([\w-]+)(?:=["']?([^"']*)["']?)?$/);
      if (!m) return false;
      const v = el.getAttribute(m[1]);
      if (v === null) return false;
      if (m[2] !== undefined && v !== m[2]) return false;
    } else {
      if (el.tagName !== p.toUpperCase()) return false;
    }
  }
  return true;
}

function queryAll(root, sel) {
  const out = [];
  const walk = (n) => {
    for (const c of n.childNodes) {
      if (c instanceof Element) {
        if (matches(c, sel)) out.push(c);
        walk(c);
      }
    }
  };
  walk(root);
  return out;
}

// ---- HTML parser ----------------------------------------------------------
function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function parseHTML(html) {
  const root = new Element('root');
  const stack = [root];
  let i = 0;
  const src = String(html);

  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) {
      appendText(stack[stack.length - 1], src.slice(i));
      break;
    }
    if (lt > i) appendText(stack[stack.length - 1], src.slice(i, lt));

    // comment
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    // script / style raw text
    const rawM = src.slice(lt).match(/^<(script|style)\b([^>]*)>/i);
    if (rawM) {
      const tag = rawM[1].toLowerCase();
      const endTag = src.toLowerCase().indexOf('</' + tag, lt);
      const body = src.slice(lt + rawM[0].length, endTag === -1 ? src.length : endTag);
      const el = new Element(tag);
      setAttrs(el, rawM[2]);
      el._text = body;
      stack[stack.length - 1].appendChild(el);
      i = endTag === -1 ? src.length : src.indexOf('>', endTag) + 1;
      continue;
    }
    // close tag
    if (src.startsWith('</', lt)) {
      const gt = src.indexOf('>', lt);
      const name = src.slice(lt + 2, gt).trim().toLowerCase();
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tagName.toLowerCase() === name) { stack.length = s; break; }
      }
      i = gt + 1;
      continue;
    }
    // open tag
    const gt = findTagEnd(src, lt);
    if (gt === -1) { appendText(stack[stack.length - 1], src.slice(lt)); break; }
    const inner = src.slice(lt + 1, gt);
    const selfClose = inner.endsWith('/');
    const clean = selfClose ? inner.slice(0, -1) : inner;
    const nameM = clean.match(/^([a-zA-Z][\w-]*)/);
    if (!nameM) { i = gt + 1; continue; }
    const tag = nameM[1].toLowerCase();
    const el = new Element(tag);
    setAttrs(el, clean.slice(nameM[1].length));
    stack[stack.length - 1].appendChild(el);
    i = gt + 1;
    if (!selfClose && !VOID.has(tag)) stack.push(el);
  }
  return root;
}

function findTagEnd(src, start) {
  let inQuote = null;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (inQuote) { if (c === inQuote) inQuote = null; continue; }
    if (c === '"' || c === "'") { inQuote = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}

function setAttrs(el, str) {
  const re = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(str))) {
    const name = m[1].toLowerCase();
    let value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '';
    value = decodeEntities(value);
    el.attributes[name] = value;
    if (name === 'class') el._cls = null;
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      el._dataset[key] = value;
    }
    if (name === 'value') el.value = value;
    if (name === 'checked') el.checked = true;
    if (name === 'hidden') el.hidden = true;
    if (name === 'disabled') el.disabled = true;
  }
}

function appendText(parent, text) {
  if (!text) return;
  const n = new Node('#text');
  n._text = decodeEntities(text);
  n.parentNode = parent;
  parent.childNodes.push(n);
}

module.exports = { parseHTML, Element, Node, matches, queryAll };
