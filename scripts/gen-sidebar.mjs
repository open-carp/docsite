#!/usr/bin/env node
/**
 * 扫描 docs/ 目录，生成 docsify 使用的 _sidebar.md。
 *
 * 规则：
 *  - 只收录 .md 文件；跳过隐藏文件与下划线开头的 docsify 保留文件（_sidebar.md 等）
 *  - 目录为树的父节点，文档为叶子，叶子名 = 文件名去掉 .md
 *  - 目录下的 README.md 不作为独立叶子，而是让目录本身链接到该目录（docsify 会解析为 README.md）
 *  - 根 README.md 显示为「首页」
 *  - 排序：目录在前、文件在后；同级按中文/数字感知排序
 *  - 链接带前导 /（配合 index.html 中 relativePath: true，从任意页面均可跳转）
 *
 * 用法：
 *   node scripts/gen-sidebar.mjs          # 生成一次
 *   node scripts/gen-sidebar.mjs --watch  # 监听 docs/ 变化自动重新生成
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const SIDEBAR = path.join(DOCS, '_sidebar.md');
const WATCH = process.argv.includes('--watch');

const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' });

/** 扫描目录，返回树：{ name, children: [...], readme: boolean } */
function scanDir(dirPath, relPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const dirs = [];
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    if (entry.isDirectory()) {
      const child = scanDir(path.join(dirPath, entry.name), `${relPath}/${entry.name}`);
      if (child.children.length > 0) dirs.push(child);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      if (/^readme\.md$/i.test(entry.name)) continue; // README 由父目录承载
      files.push({ name: entry.name.replace(/\.md$/i, ''), path: `${relPath}/${entry.name.replace(/\.md$/i, '')}` });
    }
  }

  dirs.sort((a, b) => collator.compare(a.name, b.name));
  files.sort((a, b) => collator.compare(a.name, b.name));

  const hasReadme = entries.some((e) => e.isFile() && /^readme\.md$/i.test(e.name));
  return { name: path.basename(dirPath), relPath, readme: hasReadme, children: [...dirs, ...files] };
}

const escapeLabel = (s) => s.replace(/([\[\]])/g, '\\$1');
const linkHref = (p) => encodeURI(p);

/** 将树渲染为嵌套 markdown 列表 */
function renderTree(node, out, depth) {
  const indent = '  '.repeat(depth);
  const isRoot = depth === 0;

  if (isRoot && node.readme) out.push(`${indent}- [首页](/)`);
  for (const child of node.children) {
    const isDir = Array.isArray(child.children);
    if (isDir) {
      const href = child.readme ? `${linkHref(child.relPath)}/` : null;
      out.push(href ? `${indent}- [${escapeLabel(child.name)}](${href})` : `${indent}- ${escapeLabel(child.name)}`);
      renderTree(child, out, depth + 1);
    } else {
      out.push(`${indent}- [${escapeLabel(child.name)}](${linkHref(child.path)})`);
    }
  }
}

function generate() {
  if (!fs.existsSync(DOCS)) {
    console.error(`错误：docs 目录不存在：${DOCS}`);
    process.exit(1);
  }
  const tree = scanDir(DOCS, '');
  const out = ['<!-- 本文件由 scripts/gen-sidebar.mjs 自动生成，请勿手工编辑 -->'];
  renderTree(tree, out, 0);
  fs.writeFileSync(SIDEBAR, out.join('\n') + '\n');
  console.log(`已生成 ${path.relative(ROOT, SIDEBAR)}（${tree.children.length} 个顶级条目）`);
}

function watch() {
  const listeners = new Map(); // watcher -> dirPath
  let timer = null;

  function addWatch(dirPath) {
    const watcher = fs.watch(dirPath, { persistent: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          generate();
          console.log('侧边栏已更新，刷新浏览器页面即可看到。');
        } catch (err) {
          console.error('生成失败：', err.message);
        }
        // 目录结构可能变化，重建监听
        rebuildWatchers();
      }, 300);
    });
    listeners.set(watcher, dirPath);
  }

  function rebuildWatchers() {
    for (const [watcher] of listeners) watcher.close();
    listeners.clear();
    (function walk(dirPath) {
      addWatch(dirPath);
      for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')) {
          walk(path.join(dirPath, entry.name));
        }
      }
    })(DOCS);
  }

  rebuildWatchers();
  console.log(`正在监听 ${path.relative(ROOT, DOCS)} 目录变化（Ctrl+C 退出）...`);
}

generate();
if (WATCH) watch();
