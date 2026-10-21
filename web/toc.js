/**
 * docsify 右侧 TOC 插件
 *
 * 每次页面渲染完成后，从 #main 中提取 h1~h4 标题（docsify 已为其生成 id 锚点），
 * 在页面右侧展示层级目录；点击条目平滑滚动到对应标题，滚动时高亮当前所在位置。
 * 窄屏（<1200px）或文档无标题时自动隐藏，不占用正文宽度。
 */
(function () {
  var TOC_ID = 'page-toc';
  var TOP_OFFSET = 90; // 标题进入该位置以下时视为「当前章节」

  var headings = [];

  function ensureTocEl() {
    var el = document.getElementById(TOC_ID);
    if (!el) {
      el = document.createElement('aside');
      el.id = TOC_ID;
      document.body.appendChild(el);
    }
    return el;
  }

  function buildToc(vm) {
    var toc = ensureTocEl();
    toc.innerHTML = '';

    headings = Array.prototype.slice
      .call(document.querySelectorAll('#main h1, #main h2, #main h3, #main h4'))
      .filter(function (h) {
        return !!h.id;
      });

    if (headings.length === 0) {
      document.body.classList.remove('toc-visible');
      return;
    }

    var list = document.createElement('ul');
    headings.forEach(function (h) {
      var li = document.createElement('li');
      li.className = 'toc-level-' + h.tagName.toLowerCase();
      li.dataset.target = h.id;
      var a = document.createElement('a');
      a.textContent = h.textContent;
      // href 主要供「新标签页打开/中键」使用；常规点击由下方委托拦截平滑滚动
      a.href = '#/' + vm.route.path + '?id=' + encodeURIComponent(h.id);
      li.appendChild(a);
      list.appendChild(li);
    });
    toc.appendChild(list);
    document.body.classList.add('toc-visible');
  }

  function updateActive() {
    var toc = document.getElementById(TOC_ID);
    if (!toc) return;
    var current = null;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= TOP_OFFSET) current = headings[i];
      else break;
    }
    var items = toc.querySelectorAll('li');
    for (var j = 0; j < items.length; j++) {
      items[j].classList.toggle('active', !!current && items[j].dataset.target === (current.id || null));
    }
  }

  function install(hook, vm) {
    hook.init(function () {
      var toc = ensureTocEl();
      // 点击 TOC 条目：平滑滚动到对应标题
      toc.addEventListener('click', function (e) {
        var a = e.target.closest('a');
        if (!a) return;
        var target = document.getElementById(a.parentElement.dataset.target);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      // 滚动高亮（scrollspy），rAF 节流
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          updateActive();
          ticking = false;
        });
      }, { passive: true });
    });

    hook.doneEach(function () {
      buildToc(vm);
      updateActive();
    });
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat([install]);
})();
