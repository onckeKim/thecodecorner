/* The Code Corner – SQL Lab: run and grade learner queries with sql.js (SQLite in WebAssembly). */
(function () {
  var esc = TCC.escape;
  var EX = TCC.SQL_EXERCISES;
  var TOPIC = 'sqllab';
  var MAX_ROWS = 200;
  var DRAFT_KEY = 'tcc:lab:draft:';

  var $ = function (id) { return document.getElementById(id); };
  var editor = $('editor'), feedback = $('feedback'), results = $('results');
  var SQL = null;
  var current = 0;
  var hintShown = false;

  /* ---------- Storage helpers ---------- */
  function getDraft(id) { try { return localStorage.getItem(DRAFT_KEY + id); } catch (e) { return null; } }
  function setDraft(id, v) { try { localStorage.setItem(DRAFT_KEY + id, v); } catch (e) {} }
  function clearDraft(id) { try { localStorage.removeItem(DRAFT_KEY + id); } catch (e) {} }
  function isSolved(id) { return TCC.progress(TOPIC).solved.indexOf(id) !== -1; }

  /* ---------- Database ---------- */
  function freshDb() {
    var db = new SQL.Database();
    db.run(TCC.SQL_SEED);
    return db;
  }

  /* Runs SQL on a fresh database. Returns { columns, values } for the last statement that
     produced rows, an empty result if none did, or { error }. */
  function runSql(sql) {
    if (!SQL) return { error: 'The SQL engine is still loading.' };
    var db = freshDb();
    try {
      var sets = db.exec(sql);
      if (!sets.length) return { columns: [], values: [], noRows: true };
      return sets[sets.length - 1];
    } catch (e) {
      return { error: e.message || String(e) };
    } finally {
      db.close();
    }
  }

  /* ---------- Rendering ---------- */
  function cell(v) {
    if (v === null) return '<td class="null">NULL</td>';
    if (typeof v === 'number') return '<td class="num">' + esc(Number.isInteger(v) ? v : +v.toFixed(4)) + '</td>';
    return '<td>' + esc(v) + '</td>';
  }

  function tableHtml(res, label) {
    if (res.noRows || !res.columns.length) {
      return '<div class="result-head"><span>' + label + '</span><span>no rows</span></div>' +
        '<p class="muted result-empty">The statement ran but didn’t return a result set.</p>';
    }
    var n = res.values.length;
    var rows = res.values.slice(0, MAX_ROWS);
    return '<div class="result-head"><span>' + label + '</span><span>' + n + ' row' + (n === 1 ? '' : 's') + ' · ' + res.columns.length + ' col' + (res.columns.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="table-wrap" tabindex="0"><table class="data"><thead><tr>' +
      res.columns.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      (n ? rows.map(function (r) { return '<tr>' + r.map(cell).join('') + '</tr>'; }).join('')
         : '<tr><td colspan="' + res.columns.length + '" class="muted">(0 rows)</td></tr>') +
      '</tbody></table></div>' +
      (n > MAX_ROWS ? '<p class="muted result-empty">Showing the first ' + MAX_ROWS + ' rows.</p>' : '');
  }

  function say(kind, html) {
    feedback.innerHTML = '<div class="callout callout--' + kind + '">' + html + '</div>';
  }

  /* ---------- Grading ---------- */
  function norm(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Math.round(v * 100) / 100;
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(+v)) return Math.round(+v * 100) / 100;
    return v;
  }
  function keyOf(row) { return JSON.stringify(row.map(norm)); }

  function compare(got, want, orderMatters) {
    var gc = got.columns.length, wc = want.columns.length;
    if (got.noRows) return { ok: false, msg: 'Your SQL ran but returned no result set. Make sure it ends with a <code class="inline">SELECT</code>.' };
    if (gc !== wc) return { ok: false, msg: 'Your result has <b>' + gc + '</b> column' + (gc === 1 ? '' : 's') + ', but the expected result has <b>' + wc + '</b>. Check which columns the question asks for.' };
    var gr = got.values.length, wr = want.values.length;
    if (gr !== wr) return { ok: false, msg: 'Your query returned <b>' + gr + '</b> row' + (gr === 1 ? '' : 's') + '; the expected result has <b>' + wr + '</b>. ' + (gr > wr ? 'Is a filter missing, or is a join creating duplicates?' : 'Is a filter too strict, or is a join dropping rows?') };
    var gk = got.values.map(keyOf), wk = want.values.map(keyOf);
    var sameSet = gk.slice().sort().join('\n') === wk.slice().sort().join('\n');
    if (!sameSet) return { ok: false, msg: 'Right number of rows and columns, but some values are different. Compare your result with the expected one (link below), and check the column order and calculations.' };
    if (orderMatters && gk.join('\n') !== wk.join('\n')) return { ok: false, msg: 'You have exactly the right rows, but <b>not in the right order</b>. Look at the sorting the question asks for.' };
    return { ok: true };
  }

  /* ---------- Actions ---------- */
  function run() {
    var res = runSql(editor.value);
    if (res.error) {
      say('error', '<strong>SQL error.</strong> <code class="inline">' + esc(res.error) + '</code>');
      results.innerHTML = '';
      return null;
    }
    feedback.innerHTML = '';
    results.innerHTML = tableHtml(res, 'Your result');
    return res;
  }

  function check() {
    var ex = EX[current];
    var got = runSql(editor.value);
    if (got.error) {
      say('error', '<strong>SQL error.</strong> <code class="inline">' + esc(got.error) + '</code>');
      results.innerHTML = '';
      TCC.record(TOPIC, ex.id, false);
      return;
    }
    var want = runSql(ex.solution);
    var r = compare(got, want, ex.orderMatters);
    TCC.record(TOPIC, ex.id, r.ok);
    results.innerHTML = tableHtml(got, 'Your result');
    if (r.ok) {
      var next = nextUnsolved();
      say('success', '<strong>Correct!</strong> Your query returns exactly the expected result.' +
        (next !== null ? ' <button type="button" class="btn btn--primary btn--sm lab-next" id="next-btn">Next exercise →</button>' : ' You’ve solved every exercise. Nice work!'));
      var nb = $('next-btn');
      if (nb) { nb.addEventListener('click', function () { go(next); }); nb.focus(); }
    } else {
      say('error', '<strong>Not quite.</strong> ' + r.msg);
    }
    renderList();
    markSolved();
  }

  function showHint() {
    if (hintShown) return;
    hintShown = true;
    feedback.insertAdjacentHTML('beforeend', '<div class="callout callout--hint"><strong>Hint.</strong> ' + esc(EX[current].hint) + '</div>');
  }

  function showExpected() {
    var want = runSql(EX[current].solution);
    var box = $('expected');
    if (box) { box.remove(); $('expected-btn').textContent = 'Show expected result'; return; }
    results.insertAdjacentHTML('beforeend', '<div id="expected" class="expected">' + tableHtml(want, 'Expected result' + (EX[current].orderMatters ? ' (order matters)' : ' (any order)')) + '</div>');
    $('expected-btn').textContent = 'Hide expected result';
  }

  function showSolution() {
    var ex = EX[current];
    if (!confirm('Replace your query with a model solution?')) return;
    editor.value = ex.solution;
    setDraft(ex.id, editor.value);
    say('hint', '<strong>A model solution.</strong> Run it to see the result. Other queries that return the same rows count as correct too.');
    editor.focus();
  }

  function resetEditor() {
    var ex = EX[current];
    editor.value = ex.starter;
    clearDraft(ex.id);
    feedback.innerHTML = ''; results.innerHTML = '';
    editor.focus();
  }

  /* ---------- Navigation ---------- */
  function nextUnsolved() {
    for (var i = 1; i <= EX.length; i++) {
      var j = (current + i) % EX.length;
      if (!isSolved(EX[j].id)) return j;
    }
    return null;
  }

  function renderList() {
    var solved = EX.filter(function (e) { return isSolved(e.id); }).length;
    $('lab-count').textContent = solved + ' / ' + EX.length + ' solved';
    $('lab-bar').style.setProperty('--value', Math.round((solved / EX.length) * 100) + '%');
    $('lab-list').innerHTML = EX.map(function (e, i) {
      var s = isSolved(e.id);
      return '<li><a href="?ex=' + e.id + '" data-i="' + i + '" class="lab-item' + (s ? ' is-solved' : '') + '"' + (i === current ? ' aria-current="step"' : '') + '>' +
        '<span class="lab-item__num">' + (s ? '✓' : String(i + 1).padStart(2, '0')) + '</span>' +
        '<span class="lab-item__title">' + esc(e.title) + '</span>' +
        '<span class="level level--' + e.level + '">' + e.level[0].toUpperCase() + '</span>' +
        '<span class="visually-hidden">' + e.level + (s ? ', solved' : '') + '</span></a></li>';
    }).join('');
  }

  function markSolved() { $('ex-solved').hidden = !isSolved(EX[current].id); }

  function go(i, opts) {
    current = i;
    hintShown = false;
    var ex = EX[i];
    $('ex-level').className = 'level level--' + ex.level;
    $('ex-level').textContent = ex.level;
    $('ex-num').textContent = '#' + String(i + 1).padStart(2, '0') + ' / ' + EX.length;
    $('ex-title').textContent = ex.title;
    $('ex-prompt').innerHTML = ex.prompt + (ex.orderMatters ? '' : ' <span class="muted">Row order doesn’t matter.</span>');
    editor.value = getDraft(ex.id) || ex.starter;
    feedback.innerHTML = ''; results.innerHTML = '';
    $('expected-btn').textContent = 'Show expected result';
    markSolved();
    renderList();
    document.title = ex.title + ' – SQL Lab – The Code Corner';
    if (!opts || !opts.initial) {
      var u = new URL(location.href); u.searchParams.set('ex', ex.id);
      history.replaceState(null, '', u);
      $('ex-title').focus({ preventScroll: true });
      var top = $('exercise').getBoundingClientRect().top + scrollY - 90;
      if (Math.abs(scrollY - top) > 40 && innerWidth < 900) scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function renderSchema() {
    var db = freshDb();
    try {
      var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY rowid")[0].values.map(function (r) { return r[0]; });
      $('schema-body').innerHTML = tables.map(function (t) {
        var cols = db.exec('PRAGMA table_info(' + t + ')')[0].values; // cid, name, type, notnull, dflt, pk
        var count = db.exec('SELECT COUNT(*) FROM ' + t)[0].values[0][0];
        return '<div class="schema__table"><div class="schema__name"><b>' + esc(t) + '</b><span>' + count + ' rows</span></div>' +
          '<ul>' + cols.map(function (c) { return '<li><span>' + esc(c[1]) + (c[5] ? ' <em>PK</em>' : '') + '</span><span>' + esc(c[2].toLowerCase()) + '</span></li>'; }).join('') + '</ul>' +
          '<button type="button" class="linkish schema__peek" data-table="' + esc(t) + '">Preview rows</button></div>';
      }).join('');
    } finally { db.close(); }
  }

  /* ---------- Wire up ---------- */
  $('run-btn').addEventListener('click', run);
  $('check-btn').addEventListener('click', check);
  $('hint-btn').addEventListener('click', showHint);
  $('reset-btn').addEventListener('click', resetEditor);
  $('expected-btn').addEventListener('click', showExpected);
  $('solution-btn').addEventListener('click', showSolution);
  editor.addEventListener('input', function () { setDraft(EX[current].id, editor.value); });
  editor.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (e.shiftKey) check(); else run(); }
  });
  $('lab-list').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-i]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    go(+a.getAttribute('data-i'));
  });
  $('schema-body').addEventListener('click', function (e) {
    var b = e.target.closest('.schema__peek');
    if (!b) return;
    var t = b.getAttribute('data-table');
    editor.value = 'SELECT *\nFROM ' + t + '\nLIMIT 10;';
    setDraft(EX[current].id, editor.value);
    run();
    editor.focus();
  });

  var wanted = new URLSearchParams(location.search).get('ex');
  var start = EX.findIndex(function (e) { return e.id === wanted; });
  if (start === -1) { current = -1; var n = nextUnsolved(); start = n === null ? 0 : n; }
  go(start, { initial: true });

  initSqlJs({ locateFile: function (f) { return 'assets/vendor/sql.js/' + f; } }).then(function (S) {
    SQL = S;
    renderSchema();
    ['editor', 'run-btn', 'check-btn', 'hint-btn'].forEach(function (id) { $(id).disabled = false; });
  }).catch(function (err) {
    var local = location.protocol === 'file:';
    say('error', '<strong>The SQL engine couldn’t load.</strong> ' +
      (local ? 'Browsers block WebAssembly on pages opened straight from disk. Serve the folder over HTTP, for example <code class="inline">python3 -m http.server</code>.'
             : 'Check your connection and reload the page.') +
      ' <span class="muted">(' + esc(err && err.message || err) + ')</span>');
  });
})();
