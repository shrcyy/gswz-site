/* ============================================================
   工商管理学院大学生自律委员会 官方网站
   全局交互脚本：导航 / 手册渲染 / 搜索 / 章节分页
   ============================================================ */

(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- 移动端导航 ---------- */
  var toggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') navLinks.classList.remove('open');
    });
  }

  /* ---------- 手册在线阅读 ---------- */
  if (window.MANUAL_DATA && document.getElementById('manualApp')) {
    initManual();
  }

  function initManual() {
    var data = window.MANUAL_DATA;
    var chapters = data.chapters;
    var navEl = document.getElementById('chapterNav');
    var bodyEl = document.getElementById('manualBody');
    var pagerEl = document.getElementById('chapterPager');
    var inputEl = document.getElementById('searchInput');
    var searchBtn = document.getElementById('searchBtn');
    var resultEl = document.getElementById('searchResult');

    var current = 0;
    var blocks = []; // 全量块索引

    /* 导航 */
    chapters.forEach(function (ch, i) {
      var a = document.createElement('a');
      a.href = '#';
      a.dataset.idx = String(i);
      a.innerHTML = '<span class="no">' + esc(i + 1) + '</span><span>' + esc(ch.title) + '</span>';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        showChapter(i);
      });
      navEl.appendChild(a);
      ch.blocks.forEach(function (b, j) {
        blocks.push({ ch: i, bi: j, b: b, chTitle: ch.title });
      });
    });

    /* 块渲染 */
    function blockHtml(b, bi) {
      var id = 'blk-' + bi;
      if (b.t === 'h2') return '<h2 class="subh" id="' + id + '">' + esc(b.text) + '</h2>';
      if (b.t === 'h3') return '<h3 id="' + id + '">' + esc(b.text) + '</h3>';
      if (b.t === 'p') return '<p id="' + id + '">' + esc(b.text) + '</p>';
      if (b.t === 'table') {
        var html = '<table id="' + id + '">';
        if (b.header && b.header.length) {
          html += '<thead><tr>' + b.header.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead>';
        }
        html += '<tbody>';
        b.rows.forEach(function (r) {
          html += '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
        });
        html += '</tbody></table>';
        return html;
      }
      return '';
    }

    function chapterTotal(i) {
      var ch = chapters[i];
      return ch.blocks.filter(function (b) {
        return b.t === 'h2' || b.t === 'h3';
      }).length;
    }

    function renderPager(i) {
      var prev = document.getElementById('pagerPrev');
      var next = document.getElementById('pagerNext');
      if (prev) {
        if (i > 0) {
          prev.style.display = '';
          prev.innerHTML = '&#8592; ' + esc(chapters[i - 1].title);
          prev.onclick = function (e) { e.preventDefault(); showChapter(i - 1); };
        } else {
          prev.style.display = 'none';
        }
      }
      if (next) {
        if (i < chapters.length - 1) {
          next.style.display = '';
          next.innerHTML = esc(chapters[i + 1].title) + ' &#8594;';
          next.onclick = function (e) { e.preventDefault(); showChapter(i + 1); };
        } else {
          next.style.display = 'none';
        }
      }
    }

    function showChapter(i) {
      current = i;
      var ch = chapters[i];
      var links = navEl.querySelectorAll('a');
      links.forEach(function (a, j) {
        a.classList.toggle('active', j === i);
      });
      var html = '<div class="ch-title">' + esc(ch.title) + '</div>';
      ch.blocks.forEach(function (b, j) {
        html += blockHtml(b, j);
      });
      html += '<div class="ch-foot-note">本章共 ' + chapterTotal(i) + ' 个小节</div>';
      bodyEl.innerHTML = html;
      renderPager(i);
      if (resultEl) resultEl.classList.remove('show');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* 搜索 */
    function stripText(b) {
      if (b.t === 'h2' || b.t === 'h3' || b.t === 'p') return b.text;
      if (b.t === 'table') {
        var parts = [];
        if (b.header) parts = parts.concat(b.header);
        b.rows.forEach(function (r) { parts = parts.concat(r); });
        return parts.join(' ');
      }
      return '';
    }

    function runSearch() {
      var kw = (inputEl.value || '').trim();
      if (!kw || kw.length < 2) {
        resultEl.innerHTML = '';
        resultEl.classList.remove('show');
        return;
      }
      var hits = [];
      blocks.forEach(function (item, idx) {
        var txt = stripText(item.b);
        if (txt.indexOf(kw) > -1) {
          var p = txt.indexOf(kw);
          var start = Math.max(0, p - 22);
          var seg = (start > 0 ? '…' : '') + txt.slice(start, p + kw.length + 22) + '…';
          hits.push({ idx: idx, ch: item.ch, bi: item.bi, chTitle: item.chTitle, seg: seg });
        }
      });
      resultEl.innerHTML = '';
      if (!hits.length) {
        resultEl.innerHTML = '<div class="hit" style="cursor:default"><span class="src">未找到与「' + esc(kw) + '」相关的内容</span></div>';
      } else {
        hits.slice(0, 30).forEach(function (h) {
          var d = document.createElement('div');
          d.className = 'hit';
          var seg = esc(h.seg).split(esc(kw)).join('<b>' + esc(kw) + '</b>');
          d.innerHTML = seg + '<span class="src">' + esc(h.chTitle) + '</span>';
          d.addEventListener('click', function () {
            showChapter(h.ch);
            setTimeout(function () {
              var el = document.getElementById('blk-' + h.bi);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('hl-mark');
                setTimeout(function () { el.classList.remove('hl-mark'); }, 2600);
              }
            }, 60);
          });
          resultEl.appendChild(d);
        });
      }
      resultEl.classList.add('show');
    }

    if (searchBtn) searchBtn.addEventListener('click', runSearch);
    if (inputEl) {
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') runSearch();
      });
    }

    /* 初始化 */
    showChapter(0);
  }
})();
