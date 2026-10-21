#!/usr/bin/env python3
"""
静态文件服务器（替代 python3 -m http.server），为本站定制：

对 .md 请求返回 Cache-Control: no-cache，让浏览器每次都带 If-Modified-Since
重新验证（304 协商由标准库 SimpleHTTPRequestHandler 原生支持：未变化的文件
返回 304，浏览器继续用缓存副本，几乎零开销）。否则 http.server 不发缓存头，
浏览器按启发式缓存可能在文档更新后仍展示旧内容。

其余文件（CSS/JS 等静态资源）保持默认行为不变。

用法：
  python3 scripts/serve.py          # 监听 3000 端口
  python3 scripts/serve.py 8080     # 自定义端口
"""
import http.server
import sys
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class DocsHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # .md 是会频繁变化的内容文件；忽略 docsify 可能追加的查询串
        if self.path.split('?', 1)[0].endswith('.md'):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    handler = partial(DocsHandler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(('', port), handler) as server:
        print(f'正在服务 {ROOT}（http://localhost:{port}，Ctrl+C 退出）...')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\n已退出')


if __name__ == '__main__':
    main()
