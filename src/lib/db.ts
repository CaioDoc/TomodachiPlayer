import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "tomodachi-data.db");

declare global {
  // eslint-disable-next-line no-var
  var _sqlite: Database.Database | undefined;
}

const sqlite = globalThis._sqlite || new Database(dbPath);
if (process.env.NODE_ENV !== "production") {
  globalThis._sqlite = sqlite;
}

// Enable Foreign Keys
sqlite.pragma("foreign_keys = ON;");

// Auto-initialize tables on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    last_scanned_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366F1'
  );

  CREATE TABLE IF NOT EXISTS folder_tags (
    folder_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (folder_id, tag_id),
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    metadata_json TEXT,
    progress INTEGER DEFAULT 0,
    total_progress INTEGER,
    is_favorite INTEGER DEFAULT 0,
    status TEXT DEFAULT 'watching',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS extensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    is_enabled INTEGER DEFAULT 1
  );
`);

// Safe column additions for existing database files
try {
  sqlite.exec("ALTER TABLE items ADD COLUMN is_favorite INTEGER DEFAULT 0;");
} catch {
  // Column already exists
}

try {
  sqlite.exec("ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'watching';");
} catch {
  // Column already exists
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
