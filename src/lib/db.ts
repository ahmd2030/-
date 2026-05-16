/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'SmartInvoiceDB';
const STORE_NAME = 'invoice_images';
const KNOWLEDGE_STORE = 'knowledge';
const DB_VERSION = 2;

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(KNOWLEDGE_STORE)) {
        db.createObjectStore(KNOWLEDGE_STORE);
      }
    },
  });
}

export async function saveKnowledge(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put(KNOWLEDGE_STORE, value, key);
}

export async function getKnowledge(key: string): Promise<any | null> {
  const db = await getDB();
  return (await db.get(KNOWLEDGE_STORE, key)) || null;
}

export async function getAllKnowledge(): Promise<Record<string, any>> {
  const db = await getDB();
  const keys = await db.getAllKeys(KNOWLEDGE_STORE);
  const result: Record<string, any> = {};
  for (const key of keys) {
    result[String(key)] = await db.get(KNOWLEDGE_STORE, key);
  }
  return result;
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
