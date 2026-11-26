/* The Code Corner – home page: topic grid + stats. */
(function () {
  var esc = TCC.escape;

  function renderTopics() {
    var grid = document.getElementById('topic-grid');
    var nextTopic = null;
    grid.innerHTML = TCC.TOPICS.map(function (t) {
      var qs = TCC.QUESTIONS[t.id] || [];
      var ids = qs.map(function (q) { return q.id; });
      var solved = TCC.progress(t.id).solved.filter(function (id) { return ids.indexOf(id) !== -1; }).length;
      var pct = qs.length ? Math.round((solved / qs.length) * 100) : 0;
      if (!nextTopic && solved < qs.length) nextTopic = t.id;
      var cta = solved === 0 ? 'Start' : solved === qs.length ? 'Review' : 'Continue';
      return '<a class="card card--hover topic-card" data-topic="' + t.id + '" href="practice.html?topic=' + t.id + '" aria-label="' + esc(cta + ' ' + t.name + ': ' + solved + ' of ' + qs.length + ' solved') + '">' +
        '<span class="icon-box" aria-hidden="true">' + esc(t.icon) + '</span>' +
        '<h3>' + esc(t.name) + '</h3>' +
        '<p>' + esc(t.blurb) + '</p>' +
        '<div class="progress" role="presentation"><span style="--value:' + pct + '%"></span></div>' +
        '<div class="topic-card__meta"><span>' + solved + ' / ' + qs.length + ' done</span><span>' + esc(TCC.levelRange(t.id)) + '</span></div>' +
        '</a>';
    }).join('');
    document.getElementById('start-btn').href = 'practice.html?topic=' + (nextTopic || TCC.TOPICS[0].id);
  }

  function renderStats() {
    var s = TCC.stats();
    document.getElementById('stat-accuracy').textContent = s.accuracy === null ? '–' : s.accuracy + '%';
    document.getElementById('stat-streak').textContent = s.streak;
    document.getElementById('stat-solved').textContent = s.solved;
    var total = TCC.TOPICS.reduce(function (n, t) { return n + (TCC.QUESTIONS[t.id] || []).length; }, 0);
    document.getElementById('stats-note').textContent = s.accuracy === null
      ? 'Answer a few questions and your stats will show up here.'
      : 'You’ve solved ' + s.solved + ' of ' + total + ' questions. Accuracy counts every answer you’ve checked.';
  }

  document.getElementById('reset-progress').addEventListener('click', function () {
    if (confirm('Reset all your saved progress in this browser?')) { TCC.reset(); renderTopics(); renderStats(); }
  });

  renderTopics();
  renderStats();
  // Refresh when returning via the back button (bfcache).
  window.addEventListener('pageshow', function (e) { if (e.persisted) { renderTopics(); renderStats(); } });
})();
