import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";
// For Vercel, use Turso; for local, use local SQLite file
const dbUrl = process.env.TURSO_DATABASE_URL || "file:feedbuilder.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const db = createClient({
    url: dbUrl,
    authToken: authToken,
});
// Initialize database tables
await db.execute(`
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
await db.execute(`
CREATE TABLE IF NOT EXISTS products_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_domain TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
export async function upsertShop(shop_domain, access_token) {
    const existing = await db.execute({
        sql: "SELECT * FROM shops WHERE shop_domain=?",
        args: [shop_domain],
    });
    const now = new Date().toISOString();
    if (existing.rows.length > 0) {
        await db.execute({
            sql: "UPDATE shops SET access_token=?, updated_at=? WHERE shop_domain=?",
            args: [access_token, now, shop_domain],
        });
        return existing.rows[0].feed_token;
    }
    else {
        const feedToken = randomUUID();
        await db.execute({
            sql: "INSERT INTO shops (shop_domain, access_token, feed_token, updated_at) VALUES (?,?,?,?)",
            args: [shop_domain, access_token, feedToken, now],
        });
        return feedToken;
    }
}
export async function getShopByFeedToken(feedToken) {
    const result = await db.execute({
        sql: "SELECT * FROM shops WHERE feed_token=?",
        args: [feedToken],
    });
    return result.rows[0] || null;
}
export async function getShop(shop_domain) {
    const result = await db.execute({
        sql: "SELECT * FROM shops WHERE shop_domain=?",
        args: [shop_domain],
    });
    return result.rows[0] || null;
}
export async function saveProductsCache(shop_domain, payload) {
    const existing = await db.execute({
        sql: "SELECT id FROM products_cache WHERE shop_domain=?",
        args: [shop_domain],
    });
    const json = JSON.stringify(payload);
    const now = new Date().toISOString();
    if (existing.rows.length > 0) {
        await db.execute({
            sql: "UPDATE products_cache SET payload_json=?, updated_at=? WHERE shop_domain=?",
            args: [json, now, shop_domain],
        });
    }
    else {
        await db.execute({
            sql: "INSERT INTO products_cache (shop_domain, payload_json, updated_at) VALUES (?,?,?)",
            args: [shop_domain, json, now],
        });
    }
}
export async function loadProductsCache(shop_domain) {
    const result = await db.execute({
        sql: "SELECT payload_json FROM products_cache WHERE shop_domain=?",
        args: [shop_domain],
    });
    if (result.rows.length > 0) {
        return JSON.parse(result.rows[0].payload_json);
    }
    return null;
}
export default db;
