// 卡片版式机检的语法分析：读一份 TSX，找出三条规则的违反处（规则见
// check-card-layout.mjs 文件头、docs/design/卡片版式规范.md「机器查的几条」）。
import { parse } from "@babel/parser";

/** 章：图标列里唯一许放的签（规范「例外」第 1 条）。 */
export const STAMPS = new Set(["等你", "已回", "WAITING", "REPLIED"]);
/** 类型签取色的唯一入口：只有这里能按种类挑颜色。 */
const COLOR_ENTRIES = new Set([
  "src/packages/hud/src/permissions/approval-list.ts",
  "src/packages/hud/src/permissions/tag-tone.ts",
]);
/** 从入口取色的函数：类型签传 color 时只许是它们的结果。 */
const TAG_INK = new Set(["tagColor", "toneInk", "tagInk"]);
const TONES = new Set(["ask", "reply", "start", "wait", "permission"]);

export const RULES = {
  "icon-column":
    "类型签进了图标列：图标列只放图标和章（等你、已回），类型签放在标题下面一行的文字线起点",
  "grid-literal":
    "缩进直接写了数字：图标列宽、列间隔、文字线 30 只从 panel/theme.ts 的 GRID 取",
  "tag-color":
    "类型签自己挑颜色：颜色只从 tagColor / toneInk 一处取，别处不按种类写颜色分支",
};

function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    const value = node[key];
    if (Array.isArray(value))
      for (const child of value) walk(child, visit, node);
    else if (value && typeof value.type === "string") walk(value, visit, node);
  }
}

const nameOf = (element) => element.openingElement.name.name;
const attr = (element, name) =>
  element.openingElement.attributes.find(
    (a) => a.type === "JSXAttribute" && a.name.name === name,
  );
const keyOf = (prop) =>
  prop.key?.type === "Identifier" ? prop.key.name : prop.key?.value;

/** The style object written on the element itself, if any. */
function styleOf(element) {
  const value = attr(element, "style")?.value;
  const object = value?.type === "JSXExpressionContainer" && value.expression;
  if (object?.type !== "ObjectExpression") return null;
  const props = new Map();
  for (const prop of object.properties)
    if (prop.type === "ObjectProperty") props.set(keyOf(prop), prop.value);
  return props;
}

/** Every string a label expression can print; null where one is not a plain string. */
function labelStrings(node) {
  if (!node) return null;
  if (node.type === "StringLiteral") return [node.value];
  if (node.type === "JSXExpressionContainer")
    return labelStrings(node.expression);
  if (node.type === "TemplateLiteral" && !node.expressions.length)
    return [node.quasis[0].value.cooked];
  if (node.type === "ConditionalExpression") {
    const a = labelStrings(node.consequent);
    const b = labelStrings(node.alternate);
    return a && b ? [...a, ...b] : null;
  }
  return null;
}

/** A tag is a stamp when everything its label can print is a stamp. */
function isStamp(tag) {
  const strings = labelStrings(attr(tag, "label")?.value);
  return !!strings && strings.every((s) => STAMPS.has(s));
}

/** The first track of a grid's columns, as source text; both sides of a
 * condition, the icon column's side first. */
function firstTrack(node, text) {
  if (node.type === "ConditionalExpression") {
    const sides = [node.consequent, node.alternate].map((n) =>
      firstTrack(n, text),
    );
    return sides.find(iconTrack) ?? sides[0];
  }
  if (node.type === "StringLiteral") return node.value.trim().split(/\s+/)[0];
  const raw =
    node.type === "TemplateLiteral"
      ? text.slice(node.start + 1, node.end - 1)
      : text.slice(node.start, node.end);
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "(" || c === "{") depth++;
    else if (c === ")" || c === "}") depth--;
    else if (/\s/.test(c) && depth === 0 && i > 0) return raw.slice(0, i);
  }
  return raw;
}

/** A card row: its first column is the icon column (GRID.mark 18, the seal
 * column 34, or `auto` round a stamp). */
function iconTrack(track) {
  if (/minmax|fr\b|repeat/.test(track)) return false;
  if (/GRID\.mark|SEAL/.test(track) || track === "auto") return true;
  return track === "18px" || track === "34px";
}

/** The JSX a child can render into the row's first cell: both sides of a
 * condition, an `&&`'s right side, an identifier bound to JSX in the file. */
function candidates(child, bound) {
  if (child.type === "JSXElement") return [child];
  if (child.type === "JSXFragment")
    return child.children.flatMap((c) => candidates(c, bound));
  if (child.type === "JSXExpressionContainer")
    return candidates(child.expression, bound);
  if (child.type === "ConditionalExpression")
    return [
      ...candidates(child.consequent, bound),
      ...candidates(child.alternate, bound),
    ];
  if (child.type === "LogicalExpression") return candidates(child.right, bound);
  if (child.type === "ParenthesizedExpression")
    return candidates(child.expression, bound);
  if (child.type === "Identifier" && bound.has(child.name))
    return candidates(bound.get(child.name), bound);
  return [];
}

/** The tags an element in the icon cell shows: itself, or inside a plain wrapper. */
function tagsIn(element, bound, depth = 0) {
  if (nameOf(element) === "ApprovalTag") return [element];
  if (depth > 2 || !/^[a-z]/.test(nameOf(element) ?? "")) return [];
  return element.children
    .flatMap((c) => candidates(c, bound))
    .flatMap((c) => tagsIn(c, bound, depth + 1));
}

const explicitColumn = (element) => styleOf(element)?.get("gridColumn");

/** The first grid item of a row: the first child without a column of its own. */
function iconCell(row, bound) {
  for (const child of row.children) {
    if (child.type === "JSXText" && !child.value.trim()) continue;
    const options = candidates(child, bound);
    if (!options.length) continue;
    const placed = options.filter((o) => {
      const column = explicitColumn(o);
      if (!column) return true;
      const start = labelStrings(column)?.[0];
      return start?.trim().startsWith("1");
    });
    if (placed.length) return placed;
  }
  return [];
}

const indentLiteral = (prop, value) =>
  ((prop === "paddingLeft" || prop === "marginLeft") &&
    value.type === "NumericLiteral" &&
    value.value === 30) ||
  ((prop === "padding" || prop === "margin") &&
    value.type === "StringLiteral" &&
    /^\S+ \S+ \S+ 30px$/.test(value.value.trim()));

/** A line a `card-layout-ok: <理由>` comment excuses: the comment's own line
 * and the three after it (a row that is not on the card's lines, say). */
function excused(ast) {
  const lines = new Set();
  for (const comment of ast.comments ?? [])
    if (/card-layout-ok:\s*\S/.test(comment.value))
      for (let l = comment.loc.end.line; l <= comment.loc.end.line + 3; l++)
        lines.add(l);
  return lines;
}

export function checkFile(file, text) {
  const found = [];
  let skip = new Set();
  const hit = (rule, node, detail) =>
    skip.has(node.loc.start.line) ||
    found.push({
      rule,
      file,
      line: node.loc.start.line,
      detail,
    });
  const ast = parse(text, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
    errorRecovery: true,
  });
  skip = excused(ast);
  const bound = new Map();
  walk(ast, (node) => {
    if (
      node.type === "VariableDeclarator" &&
      node.id.type === "Identifier" &&
      node.init &&
      /JSX|Conditional|Parenthesized/.test(node.init.type)
    )
      bound.set(node.id.name, node.init);
  });
  walk(ast, (node) => {
    if (node.type === "JSXElement") {
      const style = styleOf(node);
      if (style?.get("display")?.value === "grid") {
        const columns = style.get("gridTemplateColumns");
        const track = columns && firstTrack(columns, text);
        if (track && iconTrack(track)) {
          if (/\d/.test(track))
            hit("grid-literal", columns, `图标列宽 ${track}`);
          const gap = style.get("columnGap") ?? style.get("gap");
          if (gap?.type === "NumericLiteral")
            hit("grid-literal", gap, `列间隔 ${gap.value}`);
          for (const cell of iconCell(node, bound))
            for (const tag of tagsIn(cell, bound))
              if (!isStamp(tag))
                hit(
                  "icon-column",
                  tag,
                  `<ApprovalTag label=${text.slice(attr(tag, "label")?.value?.start, attr(tag, "label")?.value?.end)}>`,
                );
        }
      }
      if (nameOf(node) === "ApprovalTag") {
        const color = attr(node, "color")?.value;
        const call =
          color?.type === "JSXExpressionContainer" &&
          color.expression.type === "CallExpression" &&
          TAG_INK.has(color.expression.callee.name);
        if (color && !call && !isStamp(node))
          hit(
            "tag-color",
            color,
            `color=${text.slice(color.start, color.end)}`,
          );
      }
    }
    if (node.type === "ObjectProperty" && node.value) {
      const prop = keyOf(node);
      if (indentLiteral(prop, node.value))
        hit("grid-literal", node.value, `${prop} 写了文字线 30`);
    }
    if (
      !COLOR_ENTRIES.has(file) &&
      node.type === "BinaryExpression" &&
      /^[!=]==$/.test(node.operator)
    ) {
      const [side, value] =
        node.right.type === "StringLiteral"
          ? [node.left, node.right.value]
          : [node.right, node.left.value];
      const named =
        (side.type === "Identifier" && /tone$/i.test(side.name)) ||
        (side.type === "MemberExpression" && side.property.name === "tone");
      if (named && TONES.has(value))
        hit(
          "tag-color",
          node,
          `按种类挑颜色：${text.slice(node.start, node.end)}`,
        );
    }
  });
  return found;
}
