/* The Code Corner – practice / quiz engine. URL: practice.html?topic=sql&level=all */
(function () {
  var esc = TCC.escape;
  var LEVELS = ['all', 'easy', 'medium', 'hard'];
  var KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var CODEY = /^(SELECT\b|[A-Z][A-Z_]{2,}\s*\(|\$?[A-Z]{1,2}\$?\d)/;

  var params = new URLSearchParams(location.search);
  var topic = TCC.topic(params.get('topic')) || TCC.TOPICS[0];
  var level = LEVELS.indexOf(params.get('level')) !== -1 ? params.get('level') : 'all';

  var quizEl = document.getElementById('quiz');
  var state; // { list, index, chosen, checked, hinted, results[] }

  document.title = topic.name + ' practice – The Code Corner';
  ['session-progress', 'quiz'].forEach(function (id) { document.getElementById(id).setAttribute('data-topic', topic.id); });

  /* ---------- Filters ---------- */
  function renderTopicChips() {
    var solvedOf = function (t) { return TCC.progress(t.id).solved.length; };
    document.getElementById('topic-chips').innerHTML = TCC.TOPICS.map(function (t) {
      var n = (TCC.QUESTIONS[t.id] || []).length;
      return '<a class="chip" data-topic="' + t.id + '" href="practice.html?topic=' + t.id + '"' +
        (t.id === topic.id ? ' aria-current="true"' : '') + '>' + esc(t.name) +
        ' <small>' + Math.min(solvedOf(t), n) + '/' + n + '</small></a>';
    }).join('');
  }

  function renderLevelChips() {
    var wrap = document.getElementById('level-chips');
    wrap.querySelectorAll('button').forEach(function (b) { b.remove(); });
    LEVELS.forEach(function (lv) {
      var count = lv === 'all' ? TCC.QUESTIONS[topic.id].length
        : TCC.QUESTIONS[topic.id].filter(function (q) { return q.level === lv; }).length;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('data-topic', topic.id);
      b.setAttribute('aria-pressed', String(lv === level));
      b.disabled = count === 0;
      b.innerHTML = (lv === 'all' ? 'All' : lv[0].toUpperCase() + lv.slice(1)) + ' <small>' + count + '</small>';
      b.addEventListener('click', function () {
        if (lv === level) return;
        level = lv;
        var u = new URL(location.href);
        if (lv === 'all') u.searchParams.delete('level'); else u.searchParams.set('level', lv);
        u.searchParams.set('topic', topic.id);
        history.replaceState(null, '', u);
        renderLevelChips();
        start();
      });
      wrap.appendChild(b);
    });
  }

  /* ---------- Session ---------- */
  function start(onlyIds) {
    var all = TCC.QUESTIONS[topic.id];
    var list = all.filter(function (q) {
      return (level === 'all' || q.level === level) && (!onlyIds || onlyIds.indexOf(q.id) !== -1);
    });
    state = { list: list, index: 0, chosen: null, checked: false, hinted: false, results: [] };
    renderQuestion();
  }

  function setProgress() {
    var n = state.list.length, done = state.results.length;
    var pct = n ? Math.round((done / n) * 100) : 0;
    document.getElementById('progress-title').textContent = topic.name + (level === 'all' ? '' : ' · ' + level[0].toUpperCase() + level.slice(1));
    document.getElementById('progress-count').textContent = state.index < n ? 'Question ' + (state.index + 1) + ' of ' + n : 'Complete';
    document.getElementById('progress-bar').style.setProperty('--value', pct + '%');
    document.querySelector('#session-progress .progress').setAttribute('aria-valuenow', pct);
  }

  function renderQuestion() {
    var q = state.list[state.index];
    if (!q) return renderSummary();
    setProgress();
    var num = TCC.QUESTIONS[topic.id].indexOf(q) + 1;
    var solved = TCC.progress(topic.id).solved.indexOf(q.id) !== -1;
    var codeOpts = q.options.every(function (o) { return CODEY.test(o); });

    var html = '<article class="question" data-topic="' + topic.id + '">' +
      '<div class="question__head"><span class="tag tag--topic">' + esc(topic.name) + '</span>' +
      '<span class="level level--' + q.level + '">' + q.level + '</span>' +
      (solved ? '<span class="tag" title="You have answered this correctly before"><span class="solved-dot" aria-hidden="true"></span>&nbsp;Solved</span>' : '') +
      '<span class="question__num">#' + String(num).padStart(2, '0') + '</span></div>' +
      '<h3 tabindex="-1" id="q-title">' + esc(q.prompt) + '</h3>';
    if (q.code) {
      html += '<pre class="code" tabindex="0" aria-label="Code"><span class="code__bar" aria-hidden="true"><i></i><i></i><i></i>&nbsp;' + esc(q.code.file || '') + '</span>' +
        TCC.highlight(q.code.text, q.code.lang) + '</pre>';
    }
    html += '<ul class="options" role="list">' + q.options.map(function (o, i) {
      return '<li><button type="button" class="option' + (codeOpts ? ' option--code' : '') + '" aria-pressed="false" data-i="' + i + '">' +
        '<span class="option__key" aria-hidden="true">' + KEYS[i] + '</span><span class="option__text">' + esc(o) + '</span></button></li>';
    }).join('') + '</ul>' +
      '<div class="feedback" id="feedback"></div>' +
      '<div class="question__actions">' +
      '<button type="button" class="btn btn--ghost btn--sm" id="hint-btn">Show hint</button>' +
      '<button type="button" class="btn btn--primary btn--sm" id="check-btn" disabled>Check answer</button>' +
      '<span class="spacer"></span><span class="kbd-hint">Keys ' + KEYS.slice(0, q.options.length).join(' ') + ' to pick · Enter to check</span>' +
      '</div></article>';
    quizEl.innerHTML = html;

    quizEl.querySelectorAll('.option').forEach(function (btn) {
      btn.addEventListener('click', function () { choose(+btn.getAttribute('data-i')); });
    });
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('check-btn').addEventListener('click', onPrimary);
  }

  function choose(i) {
    if (state.checked) return;
    state.chosen = i;
    quizEl.querySelectorAll('.option').forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
    document.getElementById('check-btn').disabled = false;
  }

  function showHint() {
    var q = state.list[state.index];
    if (state.hinted || state.checked) return;
    state.hinted = true;
    document.getElementById('feedback').insertAdjacentHTML('beforeend',
      '<div class="callout callout--hint"><strong>Hint.</strong> ' + esc(q.hint) + '</div>');
    document.getElementById('hint-btn').disabled = true;
  }

  function onPrimary() {
    if (!state.checked) check(); else next();
  }

  function check() {
    var q = state.list[state.index];
    if (state.chosen === null || state.checked) return;
    state.checked = true;
    var ok = state.chosen === q.answer;
    state.results.push({ q: q, ok: ok, hinted: state.hinted });
    TCC.record(topic.id, q.id, ok);

    quizEl.querySelectorAll('.option').forEach(function (b, j) {
      b.disabled = true;
      b.setAttribute('aria-pressed', 'false');
      if (j === q.answer) b.classList.add('is-correct');
      else if (j === state.chosen) b.classList.add('is-wrong');
    });
    var fb = document.getElementById('feedback');
    fb.innerHTML = (ok
      ? '<div class="callout callout--success" role="status"><strong>Correct.</strong> ' + esc(q.explain) + '</div>'
      : '<div class="callout callout--error" role="status"><strong>Not quite.</strong> The answer is ' + KEYS[q.answer] + '. ' + esc(q.explain) + '</div>');

    document.getElementById('hint-btn').disabled = true;
    var btn = document.getElementById('check-btn');
    var last = state.index === state.list.length - 1;
    btn.textContent = last ? 'See results' : 'Next question →';
    btn.focus();
    document.querySelector('.kbd-hint').textContent = 'Enter for next';
    setProgress();
  }

  function next() {
    state.index += 1;
    state.chosen = null; state.checked = false; state.hinted = false;
    renderQuestion();
    var t = document.getElementById('q-title');
    if (t) t.focus({ preventScroll: true });
    var top = document.getElementById('session-progress').getBoundingClientRect().top + scrollY - 90;
    if (scrollY > top) scrollTo({ top: top, behavior: 'smooth' });
  }

  /* ---------- Summary ---------- */
  function renderSummary() {
    setProgress();
    var n = state.results.length;
    if (!n) {
      quizEl.innerHTML = '<div class="card summary"><h2>No questions here yet</h2><p class="muted">Try a different level or topic.</p></div>';
      return;
    }
    var right = state.results.filter(function (r) { return r.ok; }).length;
    var hints = state.results.filter(function (r) { return r.hinted; }).length;
    var missed = state.results.filter(function (r) { return !r.ok; }).map(function (r) { return r.q.id; });
    var idx = TCC.TOPICS.indexOf(topic);
    var nextT = TCC.TOPICS[(idx + 1) % TCC.TOPICS.length];
    var title = right === n ? 'Perfect round!' : right / n >= 0.7 ? 'Nice work.' : 'Good practice. Keep going.';

    quizEl.innerHTML = '<section class="card summary" data-topic="' + topic.id + '">' +
      '<span class="eyebrow">' + esc(topic.name) + ' · round complete</span>' +
      '<h2 tabindex="-1" id="summary-title">' + title + '</h2>' +
      '<p class="muted">You got ' + right + ' of ' + n + ' right' + (hints ? ' and used ' + hints + ' hint' + (hints > 1 ? 's' : '') : '') + '.</p>' +
      '<div class="grid3">' +
      '<div class="stat"><b>' + right + '/' + n + '</b><span>Score</span></div>' +
      '<div class="stat"><b>' + Math.round((right / n) * 100) + '%</b><span>Accuracy</span></div>' +
      '<div class="stat"><b>' + hints + '</b><span>Hints used</span></div></div>' +
      '<div class="row">' +
      (missed.length ? '<button type="button" class="btn btn--primary" id="retry-missed">Retry the ' + missed.length + ' I missed</button>' : '') +
      '<button type="button" class="btn ' + (missed.length ? 'btn--ghost' : 'btn--primary') + '" id="again">Practise again</button>' +
      '<a class="btn btn--ghost" href="practice.html?topic=' + nextT.id + '">Next topic: ' + esc(nextT.name) + '</a>' +
      '</div>' +
      '<ul class="review">' + state.results.map(function (r) {
        return '<li class="' + (r.ok ? 'ok' : 'no') + '"><b>' + (r.ok ? '✓ Right' : '✗ Missed') + '</b><span>' + esc(r.q.prompt) + '</span></li>';
      }).join('') + '</ul>' +
      '</section>';

    var retry = document.getElementById('retry-missed');
    if (retry) retry.addEventListener('click', function () { start(missed); });
    document.getElementById('again').addEventListener('click', function () { start(); });
    document.getElementById('summary-title').focus({ preventScroll: true });
    renderTopicChips();
  }

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || !state || state.index >= state.list.length) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    var k = e.key.toUpperCase();
    var q = state.list[state.index];
    var i = KEYS.indexOf(k);
    if (i === -1 && /^[1-6]$/.test(k)) i = +k - 1;
    if (i !== -1 && i < q.options.length && !state.checked) { e.preventDefault(); choose(i); return; }
    if (k === 'H' && !state.checked) { showHint(); return; }
    if (e.key === 'Enter') {
      // A focused button or link handles its own Enter.
      var focused = document.activeElement;
      if (focused && (focused.tagName === 'BUTTON' || focused.tagName === 'A')) return;
      if (state.chosen !== null || state.checked) { e.preventDefault(); onPrimary(); }
    }
  });

  renderTopicChips();
  renderLevelChips();
  start();
})();
