/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 资产库：图片/SVG 存为 dataURL 进 chrome.storage.local，按内容去重，设单图上限。

export interface AssetRecord {
  id: string; // 'a_xxxxxxxx'
  mime: string; // image/png 等
  dataUrl: string; // data:...
  bytes: number; // 字节数（近似）
  aspect: number; // 宽/高
}

const MAX_ASSET_BYTES = 512 * 1024; // 单图上限 512KB
const KEY_PREFIX = 'asset:';

/* 简单字符串哈希（去重用） */
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* 读取资产 */
export async function getAsset(id: string): Promise<AssetRecord | null> {
  const data = await chrome.storage.local.get(KEY_PREFIX + id);
  return (data[KEY_PREFIX + id] as AssetRecord | undefined) ?? null;
}

/* 存入资产（按内容去重）；超限抛错 */
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

/* 删除资产 */
export async function removeAsset(id: string): Promise<void> {
  await chrome.storage.local.remove(KEY_PREFIX + id);
}

/* 列出所有资产（供管理页统计/清理） */
export async function listAssets(): Promise<AssetRecord[]> {
  const all = await chrome.storage.local.get(null);
  const out: AssetRecord[] = [];
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(KEY_PREFIX)) out.push(v as AssetRecord);
  }
  return out;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('读取文件失败'));
    r.readAsDataURL(blob);
  });
}
