/* ==========================================================================
   鸿蒙手记 · 前端逻辑（无依赖、无构建）
   - 数据：posts/posts.js 里的 window.POSTS
   - 路由：#/  列表；#/cat/鸿蒙电脑  分类；#/p/slug  文章
   ========================================================================== */
(function () {
  "use strict";

  var POSTS = (window.POSTS || []).slice();
  var CATS = ["全部", "鸿蒙手册", "鸿蒙电脑", "华为终端", "生态互联"];
  var state = { cat: "全部", q: "" };

  var $ = function (id) { return document.getElementById(id); };
  var grid = $("grid");
  var tabs = $("tabs");
  var search = $("search");
  var listView = $("listView");
  var readerView = $("readerView");
  var progress = $("progress");

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function fmtDate(d) {
    var p = String(d || "").split("-");
    if (p.length !== 3) return d || "";
    return p[0] + " 年 " + Number(p[1]) + " 月 " + Number(p[2]) + " 日";
  }
  function sortPosts() {
    POSTS.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  /* ---------- 极简 Markdown 渲染 ----------
     支持：## / ### 标题、段落、无序与有序列表、引用、表格、
           分隔线、**粗体**、*斜体*、`行内代码`、[链接](url)
  ------------------------------------------- */
  function inline(t) {
    return esc(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function markdown(src) {
    var lines = String(src).replace(/\r\n/g, "\n").split("\n");
    var out = [];
    var i = 0;

    function isTableRow(l) { return /^\s*\|.*\|\s*$/.test(l); }

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) { i++; continue; }

      // 标题
      var h = line.match(/^(#{2,4})\s+(.*)$/);
      if (h) {
        var lvl = h[1].length;
        out.push("<h" + lvl + ">" + inline(h[2].trim()) + "</h" + lvl + ">");
        i++;
        continue;
      }

      // 分隔线
      if (/^\s*(---|\*\*\*)\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

      // 表格
      if (isTableRow(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        var head = line.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); });
        i += 2;
        var rows = [];
        while (i < lines.length && isTableRow(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }));
          i++;
        }
        var t = "<table><thead><tr>" + head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
        rows.forEach(function (r) {
          t += "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
        });
        out.push(t + "</tbody></table>");
        continue;
      }

      // 引用
      if (/^\s*>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push("<blockquote><p>" + inline(q.join(" ")) + "</p></blockquote>");
        continue;
      }

      // 列表
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        var ordered = /^\s*\d+\.\s+/.test(line);
        var items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
          i++;
        }
        var tag = ordered ? "ol" : "ul";
        out.push("<" + tag + ">" + items.map(function (it) { return "<li>" + inline(it) + "</li>"; }).join("") + "</" + tag + ">");
        continue;
      }

      // 段落
      var para = [];
      while (i < lines.length && lines[i].trim() &&
             !/^(#{2,4})\s+/.test(lines[i]) &&
             !/^\s*>\s?/.test(lines[i]) &&
             !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
             !isTableRow(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      out.push("<p>" + inline(para.join(" ")) + "</p>");
    }
    return out.join("\n");
  }

  /* ---------- 分类 tab ---------- */
  function countOf(cat) {
    if (cat === "全部") return POSTS.length;
    return POSTS.filter(function (p) { return p.category === cat; }).length;
  }

  function renderTabs() {
    tabs.innerHTML = CATS.map(function (c) {
      return '<button class="tab" role="tab" type="button" data-cat="' + esc(c) + '" aria-selected="' +
        (state.cat === c ? "true" : "false") + '">' + esc(c) +
        '<span class="count">' + countOf(c) + "</span></button>";
    }).join("");
  }

  tabs.addEventListener("click", function (e) {
    var b = e.target.closest(".tab");
    if (!b) return;
    state.cat = b.dataset.cat;
    location.hash = state.cat === "全部" ? "#/" : "#/cat/" + encodeURIComponent(state.cat);
    renderAll();
  });

  /* ---------- 列表 ---------- */
  function matches(p) {
    if (state.cat !== "全部" && p.category !== state.cat) return false;
    var q = state.q.trim().toLowerCase();
    if (!q) return true;
    var hay = [p.title, p.summary, p.category, (p.tags || []).join(" "), p.body].join(" ").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function cardHTML(p, idx) {
    return '<button class="card rise" type="button" data-slug="' + esc(p.slug) + '" style="animation-delay:' +
      Math.min(idx * 35, 280) + 'ms">' +
      '<span class="card-top"><span class="chip">' + esc(p.category) + "</span>" +
      "<span>" + esc(fmtDate(p.date)) + "</span>" +
      '<span class="dot"></span><span>' + (p.readTime || 6) + " 分钟</span></span>" +
      "<h3>" + esc(p.title) + "</h3>" +
      "<p>" + esc(p.summary) + "</p>" +
      '<span class="card-tags">' + (p.tags || []).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</span>" +
      "</button>";
  }

  function renderList() {
    var list = POSTS.filter(matches);
    $("listTitle").textContent = state.cat === "全部" ? "全部文章" : state.cat;
    $("listResult").textContent = state.q.trim()
      ? "搜索「" + state.q.trim() + "」，命中 " + list.length + " 篇"
      : list.length + " 篇";
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><strong>没有找到相关文章</strong>' +
        "换个关键词，或者点上面的「全部」看看所有内容。</div>";
      return;
    }
    grid.innerHTML = list.map(cardHTML).join("");
  }

  grid.addEventListener("click", function (e) {
    var c = e.target.closest(".card");
    if (c) location.hash = "#/p/" + encodeURIComponent(c.dataset.slug);
  });

  /* ---------- 阅读页 ---------- */
  function findPost(slug) {
    for (var i = 0; i < POSTS.length; i++) if (POSTS[i].slug === slug) return i;
    return -1;
  }

  function renderReader(slug) {
    var i = findPost(slug);
    if (i < 0) { location.hash = "#/"; return; }

    var p = POSTS[i];
    var prev = POSTS[i + 1];   // 列表按日期倒序，下一项是更早的文章
    var next = POSTS[i - 1];

    var html = '<a class="backlink" href="#/">&larr; 返回全部文章</a>' +
      '<header class="article-head">' +
      '<div class="card-top"><span class="chip">' + esc(p.category) + "</span>" +
      "<span>" + esc(fmtDate(p.date)) + "</span>" +
      '<span class="dot"></span><span>' + (p.readTime || 6) + " 分钟读完</span></div>" +
      "<h1>" + esc(p.title) + "</h1>" +
      '<p class="summary">' + esc(p.summary) + "</p>" +
      "</header>" +
      '<div class="prose">' + markdown(p.body) + "</div>" +
      '<nav class="pager" aria-label="上一篇 / 下一篇">' +
      (prev
        ? '<a href="#/p/' + encodeURIComponent(prev.slug) + '"><small>更早的一篇</small>' + esc(prev.title) + "</a>"
        : '<div class="placeholder"><small>已到最早一篇</small>&nbsp;</div>') +
      (next
        ? '<a class="next" href="#/p/' + encodeURIComponent(next.slug) + '"><small>更新的一篇</small>' + esc(next.title) + "</a>"
        : '<div class="placeholder next"><small>已经是最新</small>&nbsp;</div>') +
      "</nav>";

    readerView.innerHTML = html;
    readerView.classList.remove("rise");
    void readerView.offsetWidth;
    readerView.classList.add("rise");
  }

  /* ---------- 路由 ---------- */
  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#/, "")) || "/";

    if (h.indexOf("/p/") === 0) {
      var slug = h.slice(3);
      listView.hidden = true;
      readerView.hidden = false;
      $("toolbar").hidden = true;
      $("hero").hidden = true;
      renderReader(slug);
      window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
      document.title = (POSTS[findPost(slug)] || {}).title || "鸿蒙手记";
      progress.style.width = "0%";
      return;
    }

    readerView.hidden = true;
    listView.hidden = false;
    $("toolbar").hidden = false;
    $("hero").hidden = false;

    if (h.indexOf("/cat/") === 0) {
      var cat = h.slice(5);
      if (CATS.indexOf(cat) !== -1) state.cat = cat;
    } else if (h === "/" || h === "") {
      state.cat = "全部";
    }
    document.title = "鸿蒙手记 · 华为终端与 HarmonyOS 使用手册";
    renderTabs();
    renderList();
  }

  window.addEventListener("hashchange", route);

  /* ---------- 搜索 ---------- */
  var t = null;
  search.addEventListener("input", function () {
    clearTimeout(t);
    t = setTimeout(function () {
      state.q = search.value;
      if (listView.hidden) location.hash = "#/";
      renderList();
    }, 90);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== search && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault();
      if (listView.hidden) location.hash = "#/";
      search.focus();
      search.select();
    }
    if (e.key === "Escape") {
      if (document.activeElement === search) { search.blur(); }
      if (search.value) { search.value = ""; state.q = ""; renderList(); }
    }
  });

  /* ---------- 主题 ---------- */
  var themeBtn = $("themeBtn");
  themeBtn.addEventListener("click", function () {
    var now = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = now;
    try { localStorage.setItem("dh5-theme", now); } catch (e) {}
  });

  /* ---------- 阅读进度 ---------- */
  window.addEventListener("scroll", function () {
    if (readerView.hidden) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  }, { passive: true });

  /* ---------- 启动 ---------- */
  sortPosts();
  var latest = POSTS[0] ? POSTS[0].date : "";
  $("statCount").textContent = POSTS.length;
  if (latest) $("statDate").textContent = latest;
  $("year").textContent = new Date().getFullYear();
  route();
})();
