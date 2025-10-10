import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { join } from "path";

// Для Vercel используем /tmp, для локальной разработки - текущую директорию
const dbPath =
  process.env.VERCEL === "1"
    ? join("/tmp", "feedbuilder.db")
    : "feedbuilder.db";

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_domain TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  plan TEXT DEFAULT 'trial',
  feed_token TEXT UNIQUE NOT NULL,
  settings_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS products_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_domain TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

export function upsertShop(shop_domain: string, access_token: string) {
  const existing = db
    .prepare("SELECT * FROM shops WHERE shop_domain=?")
    .get(shop_domain);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare(
      "UPDATE shops SET access_token=?, updated_at=? WHERE shop_domain=?"
    ).run(access_token, now, shop_domain);
    return existing.feed_token as string;
  } else {
    const feedToken = randomUUID();
    db.prepare(
      "INSERT INTO shops (shop_domain, access_token, feed_token, updated_at) VALUES (?,?,?,?)"
    ).run(shop_domain, access_token, feedToken, now);
    return feedToken;
  }
}

export function getShopByFeedToken(feedToken: string) {
  return db.prepare("SELECT * FROM shops WHERE feed_token=?").get(feedToken);
}

export function getShop(shop_domain: string) {
  return db.prepare("SELECT * FROM shops WHERE shop_domain=?").get(shop_domain);
}

export function saveProductsCache(shop_domain: string, payload: any) {
  const existing = db
    .prepare("SELECT id FROM products_cache WHERE shop_domain=?")
    .get(shop_domain);
  const json = JSON.stringify(payload);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare(
      "UPDATE products_cache SET payload_json=?, updated_at=? WHERE shop_domain=?"
    ).run(json, now, shop_domain);
  } else {
    db.prepare(
      "INSERT INTO products_cache (shop_domain, payload_json, updated_at) VALUES (?,?,?)"
    ).run(shop_domain, json, now);
  }
}

export function loadProductsCache(shop_domain: string) {
  const row = db
    .prepare("SELECT payload_json FROM products_cache WHERE shop_domain=?")
    .get(shop_domain);
  return row ? JSON.parse(row.payload_json as string) : null;
}

export default db;

