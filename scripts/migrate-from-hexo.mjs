/**
 * 从 Hexo (shokaX) 迁移文章到 ShokaX Astro (.mdx)
 * - 仅转换 src/posts 下的迁移文件
 * - frontmatter: tags/categories 转数组、date 规范化、移除 hexo 专用字段
 * - 正文: 转换 shokaX markdown-it 语法为 MDX/HTML 等价语法
 *
 * 转换映射（参考官方 Hexo 迁移指南与新主题样式类）：
 *   [文本]{.red|.grey|.rainbow|...}  -> <span class="red|...">文本</span> 等
 *   !!文本!!{.bulr}                   -> <span class="spoiler bulr" title="...">文本</span>
 *   ++文本++{.wavy}                   -> <ins class="underline wavy">文本</ins>（无类则 <ins>）
 *   ~~文本~~{.danger}                 -> <s class="strike danger">文本</s>（无类则 ~~文本~~）
 *   ^文本^                            -> <sup>文本</sup>
 *   ~数字~（化学式下标）              -> <sub>数字</sub>
 *   {文本^注音}                       -> :ruby[文本(注音)]
 *   +++type 标题 ... +++              -> <Collapse title="..." type="..."> ... </Collapse>
 *
 * 注意：fenced code block 与行内代码（`...`）一律跳过。
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const SRC_DIR = process.argv[2];
const DST_DIR = process.argv[3];
const TARGETS = process.argv.slice(4);

const SPOILER_TITLE = "你知道得太多了";
const STRIP_FIELDS = new Set(["comment", "math", "photos", "gallery", "type", "toc"]);

/** 把 hexo 风格的 YAML frontmatter 值解析成 JS 值（仅需覆盖文章用到的形态） */
function parseYamlValue(raw) {
  const v = raw.trim();
  if (v === "") return undefined;
  if (v.startsWith("[")) {
    // 数组：[a, "b c", d]
    const items = v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    return items.map((s) => {
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
      }
      return s;
    });
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1).replaceAll("\\'", "'").replaceAll('\\"', '"');
  }
  return v;
}

function serializeYamlValue(value) {
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => JSON.stringify(String(item)).replace(/^"|"$/g, '"'))
      .join(", ")}]`;
  }
  if (typeof value === "string") {
    if (/^[\w\u4e00-\u9fa5，。！？、：；·+·-]+$/.test(value)) return value;
    return JSON.stringify(value);
  }
  return String(value);
}

/** 解析 "2021-8-24 9:00:00" 这类 Hexo 时间 */
function normalizeDate(raw) {
  const m = raw.trim().match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  );
  if (!m) return raw.trim();
  const [, y, mo, d, h = "00", mi = "00", s = "00"] = m;
  const pad = (n) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`;
}

/** 行内代码保护：把 `...` 占位为不可见哨兵，结束后还原 */
function protectInlineCode(content, map) {
  return content.replace(/`[^`\n]+`/g, (code) => {
    const key = `\u0000CODE${map.size}\u0000`;
    map.set(key, code);
    return key;
  });
}

function restoreInlineCode(content, map) {
  for (const [key, code] of map) {
    content = content.split(key).join(code);
  }
  return content;
}

function convertBody(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  const codeMap = new Map();
  let inFence = false;

  // 折叠块处理：块内直接换行拼接（折叠内代码围栏已在 inFence 分支处理）
  let inCollapse = false;
  const push = (text) => out.push(text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 围栏代码：原样保留（无论是否在折叠内都直接送往输出）
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      push(line);
      continue;
    }

    if (inFence) {
      push(line);
      continue;
    }

    // +++ 折叠块结束
    if (inCollapse && /^\+{3}\s*$/.test(trimmed)) {
      push("</Collapse>");
      inCollapse = false;
      continue;
    }

    // +++ 折叠块开始
    if (/^\+{3}/.test(trimmed)) {
      const m = trimmed.match(/^\+{3}\s*(?:(info|warning|success|danger|primary|default)\s+)?(.*)$/);
      const type = m?.[1] || "default";
      const title = (m?.[2] || "").trim();
      const typeAttr = type === "default" ? "" : ` type="${type}"`;
      if (title) {
        // title 放在 JSX 双引号属性中（MDX auto-import 提供 Collapse 组件）
        const safeTitle = title.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
        push(`<Collapse title="${safeTitle}"${typeAttr}>`);
      } else {
        push(`<Collapse${typeAttr}>`);
      }
      inCollapse = true;
      continue;
    }

    if (inCollapse) {
      // 折叠内容：直接行内转换并拼接
      push(convertInlineLine(line, codeMap));
      continue;
    }

    push(convertInlineLine(line, codeMap));
  }

  return out.join("\n");
}

function convertInlineLine(line, codeMap) {
  let l = line;
  l = protectInlineCode(l, codeMap);

  // 1) 通用：文本内 ^文本^ -> <sup>（字母/数字内容，含 2^1024^、^31到2^ 情形；
  //    前后为词字符的 10^308 科学计数法不会被误伤，因为开头 ^ 前紧邻非分隔符时不转换）
  const supPattern = /\^([A-Za-z0-9]+(?:\s*[-+−]\s*[A-Za-z0-9]+)?)\^/g;
  const toSup = (text) => text.replace(supPattern, "<sup>$1</sup>");

  // 2) [文本]{.class} -> <span class="class">文本</span>（内部先转上标）
  l = l.replace(
    /\[([^\]\n]+)\]\{\.([a-zA-Z0-9_-]+)\}/g,
    (_m, text, cls) => `<span class="${cls}">${toSup(text)}</span>`,
  );

  // 3) ~~[文本]{.class}~~ -> <s class="strike"><span ...>文本</span></s>
  l = l.replace(
    /~~\[([^\]\n]+)\]\{\.([a-zA-Z0-9_-]+)\}~~/g,
    (_m, text, cls) => `<s class="strike"><span class="${cls}">${toSup(text)}</span></s>`,
  );

  // 4) !!文本!!{.class} / !!文本!!
  l = l.replace(
    /!!([^!\n]+)!!(?:\{\.([a-zA-Z0-9_-]+)\})?/g,
    (_m, text, cls) => {
      const className = ["spoiler", cls].filter(Boolean).join(" ");
      return `<span class="${className}" title="${SPOILER_TITLE}">${text}</span>`;
    },
  );

  // 3) ++文本++{.class} / ++文本++
  l = l.replace(
    /\+\+([^+\n]+)\+\+(?:\{\.([a-zA-Z0-9_-]+)\})?/g,
    (_m, text, cls) => {
      if (!cls) return `<ins>${text}</ins>`;
      if (cls === "wavy" || cls === "dot") {
        return `<ins class="underline ${cls}">${text}</ins>`;
      }
      return `<ins class="underline ${cls}">${text}</ins>`;
    },
  );

  // 6) 边界符前出现“-2^31到2^31”这类简写幂次 -> <sup>（仅当 ^ 前缀是 +/- 边界数字）
  l = l.replace(
    /(^|[\d-\u4e00-\u9fa5])(\d{1,2})\^(\d{1,2})\^/g,
    (_m, pre, base, exp) => `${pre}${base}<sup>${exp}</sup>`,
  );

  // 6b) 显式转义 \^o^ 这类写法：去掉反斜杠，保留 ^o^ 文本（旧主题里反斜杠只用于转义）
  l = l.replace(/\\\^([A-Za-z0-9]+)\^/g, (_m, text) => `^${text}^`);

  // 7) ~数字~ -> <sub>（化学式等）
  l = l.replace(/~(\d{1,3})~/g, (_m, n) => `<sub>${n}</sub>`);

  // 7b) 整行单波浪 ~文本~（旧主题视为删除线，如 2023 年终总结首段）-> GFM ~~文本~~
  l = l.replace(/^~([^~\d\n][^~\n]*)~\s*$/g, (_m, text) => `~~${text}~~`);

  // 7c) 裸 <（非合法 HTML/JSX 标签的一部分）转义为实体，避免被 MDX 当 JSX 解析
  l = l.replace(/<(?![\/A-Za-z!])/g, "&lt;");

  // 8) {文本^注音} -> :ruby[文本(注音)]
  l = l.replace(/\{([^}\n^]+)\^([^}\n]+)\}/g, (_m, base, ruby) => {
    const cleanRuby = ruby.trim();
    return `:ruby[${base.trim()}(${cleanRuby})]`;
  });

  // 9) 裸 {.class} 残留（如 xwx{.danger}）去掉——旧版此处无对应元素，样式无意义
  l = l.replace(/\{\.([a-zA-Z0-9_-]+)\}/g, "");

  l = restoreInlineCode(l, codeMap);
  return l;
}

function convertFrontmatter(frontmatterBlock) {
  const fields = {};
  let currentKey = null;
  for (const line of frontmatterBlock.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w]*):(.*)$/);
    if (m) {
      currentKey = m[1];
      fields[currentKey] = parseYamlValue(m[2] || "");
    } else if (currentKey && /^[ \t]+/.test(line)) {
      const existing = fields[currentKey];
      const extra = parseYamlValue(line.trim());
      if (Array.isArray(existing) && extra !== undefined) existing.push(...(Array.isArray(extra) ? extra : [extra]));
    }
  }

  for (const key of STRIP_FIELDS) delete fields[key];

  // tags 字符串 -> 数组
  for (const key of ["tags", "categories"]) {
    const value = fields[key];
    if (typeof value === "string") fields[key] = [value];
  }

  const yamlLines = [];
  const order = [
    "title",
    "date",
    "updated",
    "description",
    "tags",
    "categories",
    "draft",
    "cover",
    "sticky",
    "license",
    "encrypted",
    "password",
  ];
  for (const key of order) {
    if (fields[key] !== undefined) {
      const value = key === "date" || key === "updated" ? normalizeDate(String(fields[key])) : fields[key];
      yamlLines.push(`${key}: ${serializeYamlValue(value)}`);
    }
  }
  for (const [key, value] of Object.entries(fields)) {
    if (!order.includes(key) && value !== undefined) {
      yamlLines.push(`${key}: ${serializeYamlValue(value)}`);
    }
  }
  return yamlLines.join("\n");
}

function convertFile(src, dst) {
  const raw = readFileSync(src, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    // 无 frontmatter：补一个最小 frontmatter 以通过 schema（应尽量避免）
    const body = convertBody(raw);
    writeFileSync(dst, `---\ntitle: ${basename(src).replace(/\.md$/, "")}\ndate: 2020-01-01\n---\n\n${body}`, "utf8");
    return { src, dst, status: "minimal-fm" };
  }
  const fm = convertFrontmatter(m[1]);
  const body = convertBody(raw.slice(m[0].length));
  writeFileSync(dst, `---\n${fm}\n---\n\n${body}`, "utf8");
  return { src, dst, status: "ok" };
}

function main() {
  const files = TARGETS.length > 0 ? TARGETS : readdirSync(SRC_DIR).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const src = join(SRC_DIR, file);
    const dst = join(DST_DIR, file.replace(/\.md$/, ".mdx"));
    const result = convertFile(src, dst);
    console.log(`${result.status === "ok" ? "OK " : "?? "} ${file} -> ${basename(dst)}`);
  }
}

main();
