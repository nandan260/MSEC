import type { StoredFile } from './types.js';

let db: IDBDatabase | undefined;

async function database(): Promise<IDBDatabase> {
  if (db) return db;
  db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('teacher-desk-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new Error('File storage unavailable. Enable browser storage and retry.'));
  });
  return db;
}

export async function storeFiles(list: File[]): Promise<StoredFile[]> {
  if (!list.length) return [];
  const out: StoredFile[] = [];
  const d = await database();
  for (const file of list) {
    if (file.size > 25 * 1024 * 1024) throw new Error('Each file must be 25 MB or smaller.');
    const id = crypto.randomUUID();
    await new Promise<void>((resolve, reject) => {
      const t = d.transaction('files', 'readwrite');
      t.objectStore('files').put(file, id);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(new Error('File could not be saved. Browser storage may be full.'));
    });
    out.push({ id, name: file.name, size: file.size, type: file.type });
  }
  return out;
}

export async function getFile(id: string): Promise<Blob> {
  const d = await database();
  return new Promise<Blob>((resolve, reject) => {
    const r = d.transaction('files').objectStore('files').get(id);
    r.onsuccess = () => (r.result ? resolve(r.result as Blob) : reject(new Error('This file is unavailable in this browser.')));
    r.onerror = () => reject(new Error('Could not read file.'));
  });
}
