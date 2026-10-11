import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const resourceKindEnum = pgEnum("library_resource_kind", ["book", "video", "pyq"]);
export const resourceStatusEnum = pgEnum("library_resource_status", ["published", "draft"]);

export const libraryResourcesTable = pgTable("library_resources", {
  id: serial("id").primaryKey(),
  kind: resourceKindEnum("kind").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  categoryName: text("category_name"),
  tags: text("tags").array().notNull().default([]),
  status: resourceStatusEnum("status").notNull().default("published"),
  author: text("author"),
  coverUrl: text("cover_url"),
  thumbnailUrl: text("thumbnail_url"),
  sourceType: text("source_type"),
  sourceUrl: text("source_url"),
  accessLevel: text("access_level"),
  isRestricted: boolean("is_restricted").notNull().default(false),
  totalPages: integer("total_pages"),
  previewPages: integer("preview_pages"),
  language: text("language"),
  publishYear: integer("publish_year"),
  semester: text("semester"),
  subjectName: text("subject_name"),
  courseCode: text("course_code"),
  examType: text("exam_type"),
  batchInfo: text("batch_info"),
  fileUrls: text("file_urls").array().notNull().default([]),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLibraryResourceSchema = createInsertSchema(libraryResourcesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLibraryResource = z.infer<typeof insertLibraryResourceSchema>;
export type LibraryResource = typeof libraryResourcesTable.$inferSelect;
