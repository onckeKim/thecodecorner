/* The Code Corner – shared helpers: progress storage, syntax highlighting, stats. */
window.TCC = window.TCC || {};

(function () {
  var KEY = 'tcc:progress:v1';

  function empty() { return { topics: {}, days: [] }; }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (data && data.topics && Array.isArray(data.days)) return data;
    } catch (e) { /* storage blocked or corrupt – start fresh */ }
    return empty();
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function topicState(data, id) {
    if (!data.topics[id]) data.topics[id] = { solved: [], attempts: 0, correct: 0 };
    return data.topics[id];
  }

  /* Record one checked answer. */
  TCC.record = function (topicId, questionId, isCorrect) {
    var data = load();
    var t = topicState(data, topicId);
    t.attempts += 1;
    if (isCorrect) {
      t.correct += 1;
      if (t.solved.indexOf(questionId) === -1) t.solved.push(questionId);
    }
    var d = today();
    if (data.days.indexOf(d) === -1) data.days.push(d);
    if (data.days.length > 400) data.days = data.days.slice(-400);
    save(data);
  };

  TCC.progress = function (topicId) {
    var t = load().topics[topicId];
    return t ? t : { solved: [], attempts: 0, correct: 0 };
  };

  /* Ids of the gradable items in a progress bucket (quiz topic or the SQL Lab). */
  TCC.itemIds = function (k) {
    var list = k === 'sqllab' ? (TCC.SQL_EXERCISES || []) : (TCC.QUESTIONS[k] || []);
    return list.map(function (q) { return q.id; });
  };

  TCC.reset = function () {
    try {
      localStorage.removeItem(KEY);
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('tcc:lab:draft:') === 0) localStorage.removeItem(k); });
    } catch (e) {}
  };

  TCC.stats = function () {
    var data = load(), attempts = 0, correct = 0, solved = 0;
    Object.keys(data.topics).forEach(function (k) {
      var t = data.topics[k];
      attempts += t.attempts; correct += t.correct;
      // only count questions that still exist in the bank
      var ids = TCC.itemIds(k);
      solved += t.solved.filter(function (id) { return ids.indexOf(id) !== -1; }).length;
    });
    // Streak: consecutive days ending today (or yesterday, so it isn't lost before you practise today).
    var set = {}; data.days.forEach(function (d) { set[d] = true; });
    var streak = 0, cursor = new Date();
    var key = function (dt) { return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); };
    if (!set[key(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (set[key(cursor)]) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
    return {
      accuracy: attempts ? Math.round((correct / attempts) * 100) : null,
      solved: solved,
      streak: streak
    };
  };

  TCC.topic = function (id) {
    for (var i = 0; i < TCC.TOPICS.length; i++) if (TCC.TOPICS[i].id === id) return TCC.TOPICS[i];
    return null;
  };

  /* Level span for a topic's questions, e.g. "Beginner → Hard". */
  TCC.levelRange = function (id) {
    var order = ['easy', 'medium', 'hard'], names = { easy: 'Beginner', medium: 'Medium', hard: 'Hard' };
    var qs = TCC.QUESTIONS[id] || [];
    var idx = qs.map(function (q) { return order.indexOf(q.level); });
    if (!idx.length) return 'Coming soon';
    var lo = Math.min.apply(null, idx), hi = Math.max.apply(null, idx);
    return lo === hi ? names[order[lo]] : names[order[lo]] + ' → ' + names[order[hi]];
  };

  TCC.escape = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* Tiny syntax highlighter that outputs the .k/.s/.n/.f/.c token classes from components.css. */
  var SQL_KW = 'SELECT|FROM|WHERE|AND|OR|NOT|NULL|IS|IN|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|GROUP|BY|ORDER|HAVING|LIMIT|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|DESC|ASC|OVER|PARTITION|WITH|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE';
  var DAX_KW = 'VAR|RETURN|TRUE|FALSE';
  TCC.highlight = function (text, lang) {
    var kw = lang === 'sql' ? SQL_KW : lang === 'dax' ? DAX_KW : 'TRUE|FALSE';
    var re = new RegExp(
      '(--[^\\n]*|//[^\\n]*)' +            // 1 comment
      '|(\'[^\'\\n]*\'|"[^"\\n]*")' +       // 2 string (DAX table names use single quotes)
      '|\\b(' + kw + ')\\b' +                // 3 keyword
      '|\\b([A-Z][A-Za-z0-9_.]*)(?=\\s*\\()' + // 4 function call
      '|\\b(\\d+(?:\\.\\d+)?)\\b',           // 5 number
      'g');
    var out = '', last = 0, m;
    while ((m = re.exec(text))) {
      out += TCC.escape(text.slice(last, m.index));
      var cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'f' : 'n';
      out += '<span class="' + cls + '">' + TCC.escape(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + TCC.escape(text.slice(last));
  };

  /* Theme: explicit choice is stored; otherwise follow the OS. The <head> snippet applies it before paint. */
  var THEME_KEY = 'tcc:theme';
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var ICONS = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
  };
  TCC.theme = function () {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return mq && mq.matches ? 'dark' : 'light';
  };
  function paintToggle() {
    var dark = TCC.theme() === 'dark';
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.innerHTML = dark ? ICONS.sun : ICONS.moon;
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.title = b.getAttribute('aria-label');
    });
  }
  TCC.setTheme = function (t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    paintToggle();
  };
  if (mq) {
    var onChange = function () { paintToggle(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.theme-toggle');
    if (b) TCC.setTheme(TCC.theme() === 'dark' ? 'light' : 'dark');
  });
  document.addEventListener('DOMContentLoaded', paintToggle);

  /* Mark the current nav link. */
  document.addEventListener('DOMContentLoaded', function () {
    var page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href.indexOf('#') === -1 && href.split('?')[0] === page) a.setAttribute('aria-current', 'page');
    });
  });
})();
