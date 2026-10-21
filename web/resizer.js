/**
 * docsify 侧边栏宽度拖拽插件
 *
 * 在侧边栏右缘放置拖拽手柄（仅 >768px 宽屏显示）：
 *  - 按住拖动调整宽度（200~560px），实时写入 CSS 变量 --sb-width，
 *    由 resizer.css 覆盖主题的 .sidebar 宽度与 .content 左留白
 *  - 双击手柄恢复默认 300px
 *  - 宽度存入 localStorage，下次访问自动恢复
 */
(function () {
  var KEY = 'docsify-sidebar-width';
  var DEFAULT = 300;
  var MIN = 200;
  var MAX = 560;

  var handle = null;

  function clamp(w) {
    return Math.min(MAX, Math.max(MIN, w));
  }

  function apply(w) {
    document.documentElement.style.setProperty('--sb-width', w + 'px');
    if (handle) handle.style.left = w + 'px';
  }

  function restore() {
    var saved = parseInt(localStorage.getItem(KEY), 10);
    apply(isNaN(saved) ? DEFAULT : clamp(saved));
  }

  function save(w) {
    try {
      localStorage.setItem(KEY, String(w));
    } catch (e) {
      /* 隐私模式下 localStorage 不可用，忽略 */
    }
  }

  function install(hook) {
    hook.mounted(function () {
      handle = document.createElement('div');
      handle.className = 'sb-resizer';
      handle.title = '拖动调整宽度，双击恢复默认';
      document.body.appendChild(handle);
      restore();

      var startX = 0;
      var startW = 0;

      handle.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        startX = e.clientX;
        startW = handle.getBoundingClientRect().left;
        handle.setPointerCapture(e.pointerId);
        document.body.classList.add('sb-resizing');
        e.preventDefault();
      });

      handle.addEventListener('pointermove', function (e) {
        if (!document.body.classList.contains('sb-resizing')) return;
        apply(clamp(Math.round(startW + e.clientX - startX)));
      });

      function endDrag() {
        if (!document.body.classList.contains('sb-resizing')) return;
        document.body.classList.remove('sb-resizing');
        save(parseInt(handle.style.left, 10) || DEFAULT);
      }

      handle.addEventListener('pointerup', endDrag);
      handle.addEventListener('pointercancel', endDrag);

      handle.addEventListener('dblclick', function () {
        apply(DEFAULT);
        save(DEFAULT);
      });

      // 拖宽到超出视口时按住窗口边缘继续；窗口尺寸变化后把手可能超出，收回到上限内
      window.addEventListener('resize', function () {
        var w = parseInt(handle.style.left, 10);
        if (!isNaN(w)) apply(clamp(w));
      });
    });
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat([install]);
})();
