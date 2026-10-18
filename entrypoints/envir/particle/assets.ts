/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { getAsset } from '../../../lib/asset-store';

/* 一条解码缓存 */
interface AssetEntry {
  source: CanvasImageSource | null; // 可绘制的图像源
  loading: boolean; // 是否正在加载
  failed: boolean; // 是否加载失败
}

/* 解码缓存 */
const cache = new Map<string, AssetEntry>();

/* 离屏容器，把 <img> 挂在 DOM 上保证动态 GIF 持续解码 */
let holder: HTMLDivElement | null = null;

/* 是否已释放，释放后晚到的解码结果会被丢弃 */
let released = false;

/* 取得（必要时创建）离屏容器 */
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

/* 取已解码的图像源，未就绪或失败返回 null */
export function getImage(assetId: string): CanvasImageSource | null {
  return cache.get(assetId)?.source ?? null;
}

/**
 * 预加载一批图片资产，幂等
 * 已加载或加载中的跳过；加载失败过的仅在 retryFailed 时重试
 */
export async function preloadAssets(
  assetIds: string[],
  retryFailed = false,
): Promise<void> {
  released = false;
  const tasks: Promise<void>[] = [];
  for (const id of assetIds) {
    if (!id) continue;
    const existing = cache.get(id);
    if (existing && !existing.failed) continue;
    if (existing?.failed && !retryFailed) continue;
    cache.set(id, { source: null, loading: true, failed: false });
    tasks.push(loadOne(id));
  }
  await Promise.all(tasks);
}

/* 清空缓存并移除离屏容器 */
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

/* 加载单个资产：先用 img 解码，被 CSP 拦截时退化为静态位图 */
async function loadOne(assetId: string): Promise<void> {
  const entry = cache.get(assetId);
  if (!entry) return;
  try {
    const record = await getAsset(assetId);
    if (!record) throw new Error('资产不存在');
    try {
      entry.source = await decodeViaImage(record.dataUrl);
    } catch {
      entry.source = await decodeViaBitmap(record.dataUrl);
    }
  } catch {
    entry.failed = true;
    entry.source = null;
  } finally {
    entry.loading = false;
  }
}

/* 用 img 解码，支持动态 GIF */
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

/* 用 createImageBitmap 解码，不经过 DOM 以绕开 CSP */
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
