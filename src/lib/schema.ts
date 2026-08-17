import { sqliteTable, integer, text, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const folders = sqliteTable("folders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  path: text("path").notNull().unique(),
  type: text("type", { enum: ["video", "manga"] }).notNull(),
  name: text("name").notNull(),
  last_scanned_at: integer("last_scanned_at"),
  created_at: integer("created_at").default(sql`(unixepoch())`),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").default("#6366F1"),
});

export const folderTags = sqliteTable("folder_tags", {
  folder_id: integer("folder_id")
    .notNull()
    .references(() => folders.id, { onDelete: "cascade" }),
  tag_id: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.folder_id, table.tag_id] }),
]);

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  folder_id: integer("folder_id")
    .notNull()
    .references(() => folders.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  path: text("path").notNull().unique(),
  type: text("type", { enum: ["video", "manga"] }).notNull(),
  metadata_json: text("metadata_json"),
  progress: integer("progress").default(0),
  total_progress: integer("total_progress"),
  is_favorite: integer("is_favorite").default(0),
  status: text("status", { enum: ["watching", "plan_to_watch", "completed", "dropped"] }).default("watching"),
  created_at: integer("created_at").default(sql`(unixepoch())`),
});

export const extensions = sqliteTable("extensions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  is_enabled: integer("is_enabled").default(1),
});

// Infer Types
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type FolderTag = typeof folderTags.$inferSelect;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type Extension = typeof extensions.$inferSelect;
export type NewExtension = typeof extensions.$inferInsert;
