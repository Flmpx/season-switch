/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 内容脚本侧的图片资产：从 lib/asset-store 取出 dataURL 并解码缓存。
// 未就绪时 getImage 返回 null（该帧跳过绘制），失败也不抛给渲染循环。
// 优先用 <img>（动态 GIF 能继续解码）；若被站点 CSP 拦截 data: 图片，则降级为静态 Bitmap。
import { getAsset } from '../../../lib/asset-store';

interface AssetEntry {
  source: CanvasImageSource | null; // 已可绘制的图像源
  failed: boolean; // 是否加载失败（失败后不再重试）
}

const cache = new Map<string, AssetEntry>();

// 离屏容器：把 <img> 挂到 DOM 上，保证动态 GIF 持续解码
let holder: HTMLDivElement | null = null;

// 是否已释放：释放后仍未完成的解码结果丢弃，避免重新创建离屏容器
let released = false;

function ensureHolder(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (!holder) {
    holder = document.createElement('div');
    holder.id = 'atmo-asset-holder';
    holder.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;';
    document.documentElement.appendChild(holder);
  }
  return holder;
}

/* 取已解码的图像源；未就绪或失败返回 null */
export function getImage(assetId: string): CanvasImageSource | null {
  return cache.get(assetId)?.source ?? null;
}

/* 预加载一批图片资产（幂等：已缓存/加载中/已失败的直接跳过） */
export async function preloadAssets(assetIds: string[]): Promise<void> {
  released = false;
  const tasks: Promise<void>[] = [];
  for (const id of assetIds) {
    if (!id || cache.has(id)) continue;
    cache.set(id, { source: null, failed: false });
    tasks.push(loadOne(id));
  }
  await Promise.all(tasks);
}

/* 清空缓存并移除离屏容器（内容脚本销毁时调用） */
export function releaseAssets(): void {
  released = true;
  for (const entry of cache.values()) {
    const source = entry.source;
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
      source.close();
    } else if (source instanceof HTMLImageElement) {
      source.remove();
    }
  }
  cache.clear();
  holder?.remove();
  holder = null;
}

/* 加载单个资产：先 <img>，失败再静态位图 */
async function loadOne(assetId: string): Promise<void> {
  const entry = cache.get(assetId);
  if (!entry) return;

  let dataUrl = '';
  try {
    const record = await getAsset(assetId);
    if (!record) throw new Error('资产不存在');
    dataUrl = record.dataUrl;
  } catch {
    entry.failed = true;
    return;
  }

  try {
    entry.source = await decodeViaImage(dataUrl);
    return;
  } catch {
    // <img> 解码失败（常见于站点 CSP 拦截 data: 图片）→ 退化为静态位图
  }

  try {
    entry.source = await decodeViaBitmap(dataUrl);
  } catch {
    entry.failed = true;
    entry.source = null;
  }
}

/* 用 <img> 解码（支持动态 GIF） */
function decodeViaImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!released) ensureHolder()?.appendChild(img);
      resolve(img);
    };
    img.onerror = () => {
      img.remove();
      reject(new Error('图片解码失败'));
    };
    img.src = dataUrl;
  });
}

/* 用 createImageBitmap 解码（不经过 DOM，绕开 CSP） */
async function decodeViaBitmap(dataUrl: string): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') throw new Error('不支持 createImageBitmap');
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('非法的 data URL');
  const meta = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  const binary = meta.includes(';base64') ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const mime = /^data:([^;]+)/.exec(meta)?.[1] ?? 'application/octet-stream';
  return createImageBitmap(new Blob([bytes], { type: mime }));
}
