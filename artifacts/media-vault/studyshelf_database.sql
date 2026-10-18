-- StudyShelf — PostgreSQL schema and starter data
-- Run this script in an empty PostgreSQL database, or re-run it safely:
-- seed rows are inserted only when their IDs do not already exist.
--
-- The app reads published resources from public.library_resources.
-- Categories are derived from category_name; tags and file_urls are text arrays.
-- Favorites, browsing history, searches, view increments, and playlists are
-- browser-local in the current app and are intentionally not represented here.

BEGIN;

DO $$
BEGIN
  CREATE TYPE public.library_resource_kind AS ENUM ('book', 'video', 'pyq');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.library_resource_status AS ENUM ('published', 'draft');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.library_resources (
  id SERIAL PRIMARY KEY,
  kind public.library_resource_kind NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_name TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status public.library_resource_status NOT NULL DEFAULT 'published',
  author TEXT,
  cover_url TEXT,
  thumbnail_url TEXT,
  source_type TEXT,
  source_url TEXT,
  access_level TEXT,
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  total_pages INTEGER,
  preview_pages INTEGER,
  language TEXT,
  publish_year INTEGER,
  semester TEXT,
  subject_name TEXT,
  course_code TEXT,
  exam_type TEXT,
  batch_info TEXT,
  file_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches the API's published-first, newest-first resource lookup.
CREATE INDEX IF NOT EXISTS library_resources_status_created_id_idx
  ON public.library_resources (status, created_at DESC, id DESC);

INSERT INTO public.library_resources (
  id, kind, title, description, category_name, tags, status, author,
  cover_url, thumbnail_url, source_type, source_url, access_level,
  is_restricted, total_pages, preview_pages, language, publish_year,
  semester, subject_name, course_code, exam_type, batch_info, file_urls,
  view_count, created_at, updated_at
) VALUES
  (
    1, 'book', 'Think Python',
    'A practical introduction to programming using Python, with clear examples and exercises.',
    'Programming', ARRAY['python', 'programming', 'beginner']::TEXT[],
    'published', 'Allen B. Downey',
    NULL, NULL, 'pdf',
    'https://greenteapress.com/thinkpython3/thinkpython3.pdf',
    'free', FALSE, 300, 20, 'English', 2024,
    NULL, NULL, NULL, NULL, NULL,
    ARRAY['https://greenteapress.com/thinkpython3/thinkpython3.pdf']::TEXT[],
    246, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    2, 'book', 'The Linux Command Line',
    'A free, approachable guide to working in a command-line environment.',
    'Programming', ARRAY['linux', 'terminal', 'open book']::TEXT[],
    'published', 'William E. Shotts, Jr.',
    NULL, NULL, 'external', 'https://linuxcommand.org/tlcl.php',
    'free', FALSE, NULL, NULL, 'English', 2019,
    NULL, NULL, NULL, NULL, NULL,
    ARRAY['https://linuxcommand.org/tlcl.php']::TEXT[],
    151, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    3, 'video', 'CS50x — Introduction to Computer Science',
    'Harvard''s introductory computer science course, with lectures, notes, and problem sets.',
    'Computer Science', ARRAY['computer science', 'cs50', 'introductory']::TEXT[],
    'published', 'Harvard University',
    NULL, 'https://img.youtube.com/vi/8mAITcNt710/hqdefault.jpg',
    'youtube', 'https://www.youtube.com/watch?v=8mAITcNt710',
    'free', FALSE, NULL, NULL, 'English', 2025,
    NULL, NULL, NULL, NULL, NULL,
    ARRAY[]::TEXT[],
    847, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    4, 'video', 'Introduction to Algorithms — MIT OpenCourseWare',
    'Lecture materials and course videos for an undergraduate algorithms course.',
    'Algorithms', ARRAY['algorithms', 'MIT', 'data structures']::TEXT[],
    'published', 'MIT OpenCourseWare',
    NULL, NULL, 'external',
    'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
    'free', FALSE, NULL, NULL, 'English', 2011,
    NULL, NULL, NULL, NULL, NULL,
    ARRAY[]::TEXT[],
    522, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    5, 'pyq', 'CSE 101 — Programming Fundamentals',
    'A sample past-question entry. Add your department''s file link from the Database pane to make the paper available.',
    'Past Questions', ARRAY['CSE 101', 'programming', 'sample']::TEXT[],
    'published', NULL,
    NULL, NULL, NULL, NULL,
    'free', FALSE, NULL, NULL, 'English', 2025,
    '1st Semester', 'Programming Fundamentals', 'CSE 101', 'Final', 'Fall 2025',
    ARRAY[]::TEXT[],
    39, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    6, 'pyq', 'CSE 205 — Data Structures',
    'A sample exam record with semester, course, and batch metadata.',
    'Past Questions', ARRAY['CSE 205', 'data structures', 'sample']::TEXT[],
    'published', NULL,
    NULL, NULL, NULL, NULL,
    'free', FALSE, NULL, NULL, 'English', 2024,
    '3rd Semester', 'Data Structures', 'CSE 205', 'Midterm', 'Spring 2024',
    ARRAY[]::TEXT[],
    64, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

-- Keep the auto-generated ID sequence in step with the explicit starter IDs.
SELECT setval(
  pg_get_serial_sequence('public.library_resources', 'id'),
  COALESCE((SELECT MAX(id) FROM public.library_resources), 1),
  EXISTS (SELECT 1 FROM public.library_resources)
);

COMMIT;
