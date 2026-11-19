// 随手记换版检查（#419）：驿窗每次打开随手记窗口时，在页面里跑这一段。
// 数码世界的首页不缓存（no-store），入口只有 /assets/index-<hash>.js 和 .css；只改样式的发版
// JS 文件名可能不变，所以两种都比。最新首页引用的入口文件有一个不在当前页面里，就是换版了。
// 换版也不打断正在写的便签：有便签在编辑就这次不重载，等下次打开再看；否则先调页面自己的
// prepareCollapse 把草稿落到本机（输入法还在拼字、写不进去时它返回 ok:false），成了才重载。
// 结果只给测试看：驿窗 eval 拿不到返回值。只读页面、不改 DOM（L-10）。
(async () => {
  const editing = () =>
    document.querySelector('.sn.is-edit, [contenteditable="true"]') !== null;
  let html;
  try {
    const response = await fetch("/", { cache: "no-store" });
    if (!response.ok) return "unreachable";
    html = await response.text();
  } catch {
    return "unreachable";
  }
  const wanted = [
    ...new Set(html.match(/\/assets\/index-[\w-]+\.(?:js|css)\b/g) ?? []),
  ];
  if (wanted.length === 0) return "unknown";
  const running = new Set(
    [...document.querySelectorAll("script[src], link[href]")].map(
      (element) =>
        new URL(
          element.getAttribute("src") ?? element.getAttribute("href"),
          location.href,
        ).pathname,
    ),
  );
  if (wanted.every((path) => running.has(path))) return "current";
  if (editing()) return "editing";
  try {
    const ready = await window.floatingNotesHost?.prepareCollapse?.();
    if (ready && ready.ok === false) return "busy";
  } catch {
    return "busy";
  }
  if (editing()) return "editing";
  location.reload();
  return "reloaded";
})();
