/**
 * docsify 侧边栏目录树折叠插件
 *
 * docsify 把 _sidebar.md 的嵌套列表渲染为嵌套 <ul>。本插件在每次渲染后：
 *  - 给含子列表的 li 加目录标记（sb-dir）与展开箭头，默认收起
 *  - 点击箭头（或纯文本目录名）切换展开/收起；点击目录链接跳转后，
 *    自动展开新页面所在的路径，其余目录保持原状
 *  - 展开状态按「标签路径」记录，docsify 路由变化重渲染侧边栏后仍能恢复
 */
(function () {
  var openKeys = new Set();

  function directChild(li, tag) {
    for (var n = li.firstElementChild; n; n = n.nextElementSibling) {
      if (n.tagName === tag) return n;
    }
    return null;
  }

  /** 目录项标签：链接目录取链接文本，纯文本目录取自身文本 */
  function labelOf(li) {
    var a = directChild(li, 'A');
    if (a) return a.textContent.trim();
    for (var n = li.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
    }
    return '';
  }

  /** 目录项标识：从根到该目录的标签路径，如 trading/v1.74 */
  function dirKey(li) {
    var parts = [];
    var node = li;
    while (node && node.tagName === 'LI') {
      parts.unshift(labelOf(node));
      node = node.parentElement ? node.parentElement.closest('li') : null;
    }
    return parts.join('/');
  }

  /** 给所有含子列表的 li 加折叠结构，并按 openKeys 恢复展开状态 */
  function process() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    var lis = nav.querySelectorAll('li');
    for (var i = 0; i < lis.length; i++) {
      var li = lis[i];
      var ul = directChild(li, 'UL');
      if (!ul || ul.classList.contains('app-sub-sidebar')) continue;
      if (!li.classList.contains('sb-dir')) {
        li.classList.add('sb-dir');
        if (!directChild(li, 'A')) li.classList.add('sb-plain');
        var toggle = document.createElement('span');
        toggle.className = 'sb-toggle';
        li.insertBefore(toggle, li.firstChild);
      }
      li.classList.toggle('sb-collapsed', !openKeys.has(dirKey(li)));
    }
  }

  /** 展开当前页面所在路径上的所有目录（含页面所属目录自身） */
  function expandActive() {
    var li = document.querySelector('.sidebar-nav li.active');
    while (li && li.tagName === 'LI') {
      if (li.classList.contains('sb-dir')) {
        li.classList.remove('sb-collapsed');
        openKeys.add(dirKey(li));
      }
      li = li.parentElement ? li.parentElement.closest('li') : null;
    }
  }

  function toggleDir(li) {
    var collapsed = li.classList.toggle('sb-collapsed');
    var key = dirKey(li);
    if (collapsed) openKeys.delete(key);
    else openKeys.add(key);
  }

  function install(hook) {
    hook.mounted(function () {
      var sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;
      sidebar.addEventListener('click', function (e) {
        var toggle = e.target.closest('.sb-toggle');
        if (toggle) {
          if (toggle.parentElement) toggleDir(toggle.parentElement);
          return;
        }
        // 纯文本目录：点击目录名所在行切换（点到子项/链接时不在此处理）
        var li = e.target.closest('li.sb-dir');
        if (li && e.target === li) toggleDir(li);
      });
    });

    hook.doneEach(function () {
      process();
      expandActive();
    });
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat([install]);
})();
