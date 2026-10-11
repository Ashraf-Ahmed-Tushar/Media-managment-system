import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, libraryResourcesTable } from "@workspace/db";
import { ListLibraryResourcesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/library/resources", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(libraryResourcesTable)
    .where(eq(libraryResourcesTable.status, "published"))
    .orderBy(desc(libraryResourcesTable.createdAt), desc(libraryResourcesTable.id));

  const resources = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    category_name: row.categoryName,
    tags: row.tags,
    status: row.status,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    author: row.author,
    cover_url: row.coverUrl,
    thumbnail_url: row.thumbnailUrl,
    source_type: row.sourceType,
    source_url: row.sourceUrl,
    access_level: row.accessLevel,
    is_restricted: row.isRestricted,
    total_pages: row.totalPages,
    preview_pages: row.previewPages,
    language: row.language,
    publish_year: row.publishYear,
    semester: row.semester,
    subject_name: row.subjectName,
    course_code: row.courseCode,
    exam_type: row.examType,
    batch_info: row.batchInfo,
    file_urls: row.fileUrls,
    view_count: row.viewCount,
  }));

  res.json(ListLibraryResourcesResponse.parse(resources));
});

export default router;
