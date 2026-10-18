/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/* 一条图片资产 */
export interface AssetRecord {
  id: string; // 资产 id，形如 a_xxxxxxxx
  mime: string; // MIME 类型
  dataUrl: string; // dataURL 内容
  bytes: number; // 字节数（近似）
  aspect: number; // 宽/高
}

/* 单图上限 512KB */
const MAX_ASSET_BYTES = 512 * 1024;
/* 存储键前缀 */
const KEY_PREFIX = 'asset:';

/* 简单字符串哈希，用于按内容去重 */
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* 按 id 读取资产，不存在返回 null */
export async function getAsset(id: string): Promise<AssetRecord | null> {
  const data = await chrome.storage.local.get(KEY_PREFIX + id);
  return (data[KEY_PREFIX + id] as AssetRecord | undefined) ?? null;
}

/**
 * 存入资产并返回记录
 * 按 dataURL 哈希去重，超过 512KB 直接抛错
 */
export async function putAsset(
  file: Blob,
  mime: string,
  aspect: number,
): Promise<AssetRecord> {
  if (file.size > MAX_ASSET_BYTES) {
    throw new Error(
      `图片过大（${Math.round(file.size / 1024)}KB），请压缩到 ${Math.round(MAX_ASSET_BYTES / 1024)}KB 以内`,
    );
  }
  const dataUrl = await blobToDataUrl(file);
  const id = `a_${hashString(dataUrl)}`;
  const existing = await getAsset(id);
  if (existing) return existing;

  const rec: AssetRecord = { id, mime, dataUrl, bytes: dataUrl.length, aspect };
  await chrome.storage.local.set({ [KEY_PREFIX + id]: rec });
  return rec;
}

/* 把 Blob 读成 dataURL */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('读取文件失败'));
    r.readAsDataURL(blob);
  });
}
