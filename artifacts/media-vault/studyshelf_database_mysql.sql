-- StudyShelf full relational database schema for MySQL 8+
-- Based on the supplied 15-entity ER/schema diagrams.
-- Run this file in OneCompiler with MySQL selected.
--
-- Assumptions from the supplied notes:
-- 1. categories.parent_id and videos.subcategory_id reference categories.id.
-- 2. favorites.content_id is polymorphic (book/video/pyq), so it has no
--    direct foreign key; content_type identifies the target table.
-- 3. Playlist item pairs and per-user history pairs are unique.
-- 4. source_url/source_type/access_level fields are retained where the website
--    needs them. Personal website state is not yet connected to these tables.
-- 5. This MySQL submission schema is separate from the live Replit PostgreSQL
--    table. Do not run it against the app's PostgreSQL database.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  `role` VARCHAR(40) NOT NULL DEFAULT 'student',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  phone VARCHAR(32) NULL,
  username VARCHAR(80) NULL,
  avatar_color VARCHAR(24) NULL,
  avatar_url TEXT NULL,
  semester VARCHAR(80) NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NULL,
  kind ENUM('book', 'video', 'pyq', 'all') NOT NULL DEFAULT 'all',
  parent_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_parent (parent_id),
  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS books (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NULL,
  description TEXT NULL,
  cover_url TEXT NULL,
  pdf_url TEXT NULL,
  category_id BIGINT UNSIGNED NULL,
  preview_pages INT UNSIGNED NULL,
  total_pages INT UNSIGNED NULL,
  rating DECIMAL(3,2) NULL,
  language VARCHAR(80) NULL,
  publish_year SMALLINT UNSIGNED NULL,
  tags JSON NOT NULL,
  status ENUM('published', 'draft') NOT NULL DEFAULT 'published',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL,
  pdf_hosted_path TEXT NULL,
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  source_type VARCHAR(60) NULL,
  source_url TEXT NULL,
  access_level VARCHAR(40) NULL,
  PRIMARY KEY (id),
  KEY idx_books_category (category_id),
  KEY idx_books_creator (created_by),
  KEY idx_books_status_created (status, created_at),
  CONSTRAINT fk_books_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_books_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  `type` VARCHAR(60) NOT NULL DEFAULT 'lecture',
  category_id BIGINT UNSIGNED NULL,
  subcategory_id BIGINT UNSIGNED NULL,
  thumbnail_url TEXT NULL,
  tags JSON NOT NULL,
  source_type VARCHAR(60) NULL,
  source_resource_key VARCHAR(255) NULL,
  source_url TEXT NULL,
  status ENUM('published', 'draft') NOT NULL DEFAULT 'published',
  access_level VARCHAR(40) NULL,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  release_date DATE NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  KEY idx_videos_category (category_id),
  KEY idx_videos_subcategory (subcategory_id),
  KEY idx_videos_creator (created_by),
  KEY idx_videos_status_created (status, created_at),
  CONSTRAINT fk_videos_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_videos_subcategory
    FOREIGN KEY (subcategory_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_videos_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pyq_papers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  semester VARCHAR(100) NULL,
  subject_name VARCHAR(255) NULL,
  course_code VARCHAR(100) NULL,
  exam_type VARCHAR(100) NULL,
  batch_info VARCHAR(120) NULL,
  file_urls JSON NOT NULL,
  file_type VARCHAR(60) NULL,
  title VARCHAR(255) NOT NULL,
  `type` VARCHAR(60) NOT NULL DEFAULT 'exam_paper',
  description TEXT NULL,
  status ENUM('published', 'draft') NOT NULL DEFAULT 'published',
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  file_hosted_paths JSON NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pyq_course_semester (course_code, semester),
  KEY idx_pyq_creator (created_by),
  KEY idx_pyq_status_sort (status, sort_order),
  CONSTRAINT fk_pyq_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  thumbnail_url TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  source_type VARCHAR(60) NULL,
  source_url TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  category_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_playlists_creator (created_by),
  KEY idx_playlists_category (category_id),
  CONSTRAINT fk_playlists_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_playlists_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book_playlists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  thumbnail_url TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  category_id BIGINT UNSIGNED NULL,
  source_type VARCHAR(60) NULL,
  source_url TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_book_playlists_creator (created_by),
  KEY idx_book_playlists_category (category_id),
  CONSTRAINT fk_book_playlists_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_book_playlists_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlist_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  playlist_id BIGINT UNSIGNED NOT NULL,
  video_id BIGINT UNSIGNED NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_playlist_video (playlist_id, video_id),
  KEY idx_playlist_items_video (video_id),
  CONSTRAINT fk_playlist_items_playlist
    FOREIGN KEY (playlist_id) REFERENCES playlists(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_playlist_items_video
    FOREIGN KEY (video_id) REFERENCES videos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book_playlist_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  playlist_id BIGINT UNSIGNED NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_book_playlist_book (playlist_id, book_id),
  KEY idx_book_playlist_items_book (book_id),
  CONSTRAINT fk_book_playlist_items_playlist
    FOREIGN KEY (playlist_id) REFERENCES book_playlists(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_book_playlist_items_book
    FOREIGN KEY (book_id) REFERENCES books(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS watch_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  video_id BIGINT UNSIGNED NOT NULL,
  progress_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_watch_history_user_video (user_id, video_id),
  KEY idx_watch_history_video (video_id),
  CONSTRAINT fk_watch_history_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_watch_history_video
    FOREIGN KEY (video_id) REFERENCES videos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_book_history_user_book (user_id, book_id),
  KEY idx_book_history_book (book_id),
  CONSTRAINT fk_book_history_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_book_history_book
    FOREIGN KEY (book_id) REFERENCES books(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  content_type ENUM('book', 'video', 'pyq') NOT NULL,
  content_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_favorites_user_content (user_id, content_type, content_id),
  KEY idx_favorites_content (content_type, content_id),
  CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS search_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  query VARCHAR(500) NOT NULL,
  content_type ENUM('all', 'book', 'video', 'pyq') NOT NULL DEFAULT 'all',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_search_history_user_created (user_id, created_at),
  CONSTRAINT fk_search_history_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_custom_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  custom_role_id BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, custom_role_id),
  KEY idx_user_custom_roles_role (custom_role_id),
  CONSTRAINT fk_user_custom_roles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_custom_roles_role
    FOREIGN KEY (custom_role_id) REFERENCES custom_roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Starter categories and resources from the current website.
-- No sample users or passwords are created.
INSERT IGNORE INTO categories
  (id, name, slug, description, kind, parent_id)
VALUES
  (1, 'Programming', 'programming', 'Programming books and learning resources.', 'book', NULL),
  (2, 'Computer Science', 'computer-science', 'Introductory computer science courses.', 'video', NULL),
  (3, 'Algorithms', 'algorithms', 'Algorithms and data structures lectures.', 'video', NULL),
  (4, 'Past Questions', 'past-questions', 'Past exam papers and practice questions.', 'pyq', NULL);

INSERT IGNORE INTO books
  (id, title, author, description, cover_url, pdf_url, category_id,
   preview_pages, total_pages, rating, language, publish_year, tags, status,
   created_by, pdf_hosted_path, is_restricted, source_type, source_url, access_level)
VALUES
  (1, 'Think Python', 'Allen B. Downey',
   'A practical introduction to programming using Python, with clear examples and exercises.',
   NULL, 'https://greenteapress.com/thinkpython3/thinkpython3.pdf', 1,
   20, 300, NULL, 'English', 2024, JSON_ARRAY('python', 'programming', 'beginner'),
   'published', NULL, NULL, FALSE, 'pdf',
   'https://greenteapress.com/thinkpython3/thinkpython3.pdf', 'free'),
  (2, 'The Linux Command Line', 'William E. Shotts, Jr.',
   'A free, approachable guide to working in a command-line environment.',
   NULL, NULL, 1, NULL, NULL, NULL, 'English', 2019,
   JSON_ARRAY('linux', 'terminal', 'open book'), 'published',
   NULL, NULL, FALSE, 'external', 'https://linuxcommand.org/tlcl.php', 'free');

INSERT IGNORE INTO videos
  (id, title, description, `type`, category_id, subcategory_id, thumbnail_url,
   tags, source_type, source_resource_key, source_url, status, access_level,
   view_count, release_date, created_by, is_restricted)
VALUES
  (1, 'CS50x — Introduction to Computer Science',
   'Harvard''s introductory computer science course, with lectures, notes, and problem sets.',
   'course', 2, NULL, 'https://img.youtube.com/vi/8mAITcNt710/hqdefault.jpg',
   JSON_ARRAY('computer science', 'cs50', 'introductory'),
   'youtube', '8mAITcNt710', 'https://www.youtube.com/watch?v=8mAITcNt710',
   'published', 'free', 847, NULL, NULL, FALSE),
  (2, 'Introduction to Algorithms — MIT OpenCourseWare',
   'Lecture materials and course videos for an undergraduate algorithms course.',
   'lecture', 3, NULL, NULL,
   JSON_ARRAY('algorithms', 'MIT', 'data structures'),
   'external', NULL,
   'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
   'published', 'free', 522, NULL, NULL, FALSE);

INSERT IGNORE INTO pyq_papers
  (id, semester, subject_name, course_code, exam_type, batch_info, file_urls,
   file_type, title, `type`, description, status, is_restricted, sort_order,
   created_by, file_hosted_paths)
VALUES
  (1, '1st Semester', 'Programming Fundamentals', 'CSE 101', 'Final',
   'Fall 2025', JSON_ARRAY(), 'pdf', 'CSE 101 — Programming Fundamentals',
   'exam_paper',
   'A sample past-question entry. Add the department file URL to make the paper available.',
   'published', FALSE, 1, NULL, JSON_ARRAY()),
  (2, '3rd Semester', 'Data Structures', 'CSE 205', 'Midterm',
   'Spring 2024', JSON_ARRAY(), 'pdf', 'CSE 205 — Data Structures',
   'exam_paper', 'A sample exam record with semester, course, and batch metadata.',
   'published', FALSE, 2, NULL, JSON_ARRAY());

-- Quick check: all 15 tables exist; starter rows appear in the four seeded tables.
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'custom_roles', COUNT(*) FROM custom_roles
UNION ALL SELECT 'books', COUNT(*) FROM books
UNION ALL SELECT 'videos', COUNT(*) FROM videos
UNION ALL SELECT 'pyq_papers', COUNT(*) FROM pyq_papers
UNION ALL SELECT 'playlists', COUNT(*) FROM playlists
UNION ALL SELECT 'playlist_items', COUNT(*) FROM playlist_items
UNION ALL SELECT 'book_playlists', COUNT(*) FROM book_playlists
UNION ALL SELECT 'book_playlist_items', COUNT(*) FROM book_playlist_items
UNION ALL SELECT 'watch_history', COUNT(*) FROM watch_history
UNION ALL SELECT 'book_history', COUNT(*) FROM book_history
UNION ALL SELECT 'favorites', COUNT(*) FROM favorites
UNION ALL SELECT 'search_history', COUNT(*) FROM search_history
UNION ALL SELECT 'user_custom_roles', COUNT(*) FROM user_custom_roles;
