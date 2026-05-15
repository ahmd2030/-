/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'SmartInvoiceDB';
const STORE_NAME = 'invoice_images';
const DB_VERSION = 1;

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveInvoiceImage(id: string | number, base64: string): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, base64, String(id));
}

export async function getInvoiceImage(id: string | number): Promise<string | null> {
  const db = await getDB();
  const result = await db.get(STORE_NAME, String(id));
  return result || null;
}

export async function deleteInvoiceImage(id: string | number): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, String(id));
}

export async function clearAllImages(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
