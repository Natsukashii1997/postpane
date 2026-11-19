// 装后冒烟用的图片比较（L-35）：读写 PNG、比两张图差多少、拼一张能看的差异图。
// 只用 Node 自带的 zlib，不加依赖。只认 8 位、不隔行的 RGB / RGBA（screencapture 出的就是 RGBA）。
import { crc32, deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// 一个像素算「变了」：四个通道里最大的差超过这个值。截图是无损的，留一点余量给抗锯齿抖动。
export const PIXEL_TOLERANCE = 24;
// 两张图算「不同」：变了的像素至少这么多（物理像素）。实测一个 1 像素的抗锯齿抖动会出现在相邻两帧里。
export const MIN_CHANGED = 50;

export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("不是 PNG");
  let pos = 8;
  let header;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") header = body;
    else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (!header) throw new Error("PNG 缺 IHDR");
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const [depth, colorType, , , interlace] = header.subarray(8, 13);
  const channels = { 2: 3, 6: 4 }[colorType];
  if (depth !== 8 || !channels || interlace !== 0)
    throw new Error(
      `只认 8 位不隔行的 RGB/RGBA，这张是 位深 ${depth} 颜色类型 ${colorType} 隔行 ${interlace}`,
    );
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = rows.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? rows.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`未知的行过滤 ${filter}`);
      out[i] = v & 0xff;
    }
  }
  if (channels === 4) return { width, height, data: rows };
  const data = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    rows.copy(data, p * 4, p * 3, p * 3 + 3);
    data[p * 4 + 3] = 255;
  }
  return { width, height, data };
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
  return Buffer.concat([head, body, crc]);
}

export function encodePng({ width, height, data }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++)
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function blank(width, height, rgba = [0, 0, 0, 0]) {
  const data = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) data.set(rgba, p * 4);
  return { width, height, data };
}

function changedAt(a, b, x, y) {
  const i = (y * a.width + x) * 4;
  const j = (y * b.width + x) * 4;
  if (a.data[i + 3] === 0 && b.data[j + 3] === 0) return false; // 两边都透明
  let max = 0;
  for (let k = 0; k < 4; k++)
    max = Math.max(max, Math.abs(a.data[i + k] - b.data[j + k]));
  return max > PIXEL_TOLERANCE;
}

// 有内容（不透明）的范围：[左, 上, 右, 下)，全透明返回 null。用来判断截到的是不是空窗口、布局有没有变。
export function contentBox(img) {
  let box = null;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (img.data[(y * img.width + x) * 4 + 3] !== 0) box = grow(box, x, y);
  return box;
}

function grow(box, x, y) {
  if (!box) return [x, y, x + 1, y + 1];
  return [
    Math.min(box[0], x),
    Math.min(box[1], y),
    Math.max(box[2], x + 1),
    Math.max(box[3], y + 1),
  ];
}

// 比两张图：变了多少像素、占多少、变化落在哪个范围。尺寸不同时只比重叠部分，并标出来。
export function compare(a, b) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  let changed = 0;
  let box = null;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (changedAt(a, b, x, y)) {
        changed++;
        box = grow(box, x, y);
      }
  return {
    changed,
    ratio: width * height ? changed / (width * height) : 0,
    box,
    sizeChanged: a.width !== b.width || a.height !== b.height,
    differs: changed >= MIN_CHANGED,
  };
}

// 差异图：左「前」、中「后」、右是把「后」调淡、变了的像素涂红。人看这一张就知道哪里变了。
export function diffImage(a, b) {
  const w = Math.max(a.width, b.width);
  const h = Math.max(a.height, b.height);
  const gap = 8;
  const out = blank(w * 3 + gap * 2, h, [255, 255, 255, 255]);
  const put = (img, ox) => {
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        const alpha = img.data[i + 3] / 255;
        const o = (y * out.width + ox + x) * 4;
        for (let k = 0; k < 3; k++)
          out.data[o + k] = Math.round(
            img.data[i + k] * alpha + 255 * (1 - alpha),
          );
      }
  };
  put(a, 0);
  put(b, w + gap);
  const ox = (w + gap) * 2;
  for (let y = 0; y < b.height; y++)
    for (let x = 0; x < b.width; x++) {
      const o = (y * out.width + ox + x) * 4;
      if (x < a.width && y < a.height && changedAt(a, b, x, y))
        out.data.set([230, 30, 30, 255], o);
      else {
        const i = (y * b.width + x) * 4;
        const alpha = b.data[i + 3] / 255;
        for (let k = 0; k < 3; k++)
          out.data[o + k] = Math.round(
            255 - (255 - b.data[i + k]) * alpha * 0.25,
          );
      }
    }
  return out;
}
