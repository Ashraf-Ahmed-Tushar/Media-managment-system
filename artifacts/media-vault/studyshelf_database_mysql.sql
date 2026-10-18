-- StudyShelf database script for MySQL 8+
-- Paste only this file's SQL into OneCompiler with MySQL selected.
-- Categories come from category_name. Personal favorites, history, and playlists
-- remain browser-local in the current website.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS library_resources (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind ENUM('book', 'video', 'pyq') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category_name VARCHAR(150) NULL,
  tags JSON NOT NULL,
  status ENUM('published', 'draft') NOT NULL DEFAULT 'published',
  author VARCHAR(255) NULL,
  cover_url TEXT NULL,
  thumbnail_url TEXT NULL,
  source_type VARCHAR(60) NULL,
  source_url TEXT NULL,
  access_level VARCHAR(40) NULL,
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  total_pages INT UNSIGNED NULL,
  preview_pages INT UNSIGNED NULL,
  language VARCHAR(64) NULL,
  publish_year SMALLINT UNSIGNED NULL,
  semester VARCHAR(100) NULL,
  subject_name VARCHAR(255) NULL,
  course_code VARCHAR(100) NULL,
  exam_type VARCHAR(100) NULL,
  batch_info VARCHAR(120) NULL,
  file_urls JSON NOT NULL,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_library_resources_feed (status, created_at, id)
);

INSERT IGNORE INTO library_resources (
  id, kind, title, description, category_name, tags, status, author,
  cover_url, thumbnail_url, source_type, source_url, access_level,
  is_restricted, total_pages, preview_pages, language, publish_year,
  semester, subject_name, course_code, exam_type, batch_info, file_urls,
  view_count
) VALUES
  (
    1, 'book', 'Think Python',
    'A practical introduction to programming using Python, with clear examples and exercises.',
    'Programming', JSON_ARRAY('python', 'programming', 'beginner'),
    'published', 'Allen B. Downey',
    NULL, NULL, 'pdf',
    'https://greenteapress.com/thinkpython3/thinkpython3.pdf',
    'free', FALSE, 300, 20, 'English', 2024,
    NULL, NULL, NULL, NULL, NULL,
    JSON_ARRAY('https://greenteapress.com/thinkpython3/thinkpython3.pdf'),
    246
  ),
  (
    2, 'book', 'The Linux Command Line',
    'A free, approachable guide to working in a command-line environment.',
    'Programming', JSON_ARRAY('linux', 'terminal', 'open book'),
    'published', 'William E. Shotts, Jr.',
    NULL, NULL, 'external', 'https://linuxcommand.org/tlcl.php',
    'free', FALSE, NULL, NULL, 'English', 2019,
    NULL, NULL, NULL, NULL, NULL,
    JSON_ARRAY('https://linuxcommand.org/tlcl.php'),
    151
  ),
  (
    3, 'video', 'CS50x — Introduction to Computer Science',
    'Harvard''s introductory computer science course, with lectures, notes, and problem sets.',
    'Computer Science', JSON_ARRAY('computer science', 'cs50', 'introductory'),
    'published', 'Harvard University',
    NULL, 'https://img.youtube.com/vi/8mAITcNt710/hqdefault.jpg',
    'youtube', 'https://www.youtube.com/watch?v=8mAITcNt710',
    'free', FALSE, NULL, NULL, 'English', 2025,
    NULL, NULL, NULL, NULL, NULL,
    JSON_ARRAY(),
    847
  ),
  (
    4, 'video', 'Introduction to Algorithms — MIT OpenCourseWare',
    'Lecture materials and course videos for an undergraduate algorithms course.',
    'Algorithms', JSON_ARRAY('algorithms', 'MIT', 'data structures'),
    'published', 'MIT OpenCourseWare',
    NULL, NULL, 'external',
    'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
    'free', FALSE, NULL, NULL, 'English', 2011,
    NULL, NULL, NULL, NULL, NULL,
    JSON_ARRAY(),
    522
  ),
  (
    5, 'pyq', 'CSE 101 — Programming Fundamentals',
    'A sample past-question entry. Add your department''s file link from the Database pane to make the paper available.',
    'Past Questions', JSON_ARRAY('CSE 101', 'programming', 'sample'),
    'published', NULL,
    NULL, NULL, NULL, NULL,
    'free', FALSE, NULL, NULL, 'English', 2025,
    '1st Semester', 'Programming Fundamentals', 'CSE 101', 'Final', 'Fall 2025',
    JSON_ARRAY(),
    39
  ),
  (
    6, 'pyq', 'CSE 205 — Data Structures',
    'A sample exam record with semester, course, and batch metadata.',
    'Past Questions', JSON_ARRAY('CSE 205', 'data structures', 'sample'),
    'published', NULL,
    NULL, NULL, NULL, NULL,
    'free', FALSE, NULL, NULL, 'English', 2024,
    '3rd Semester', 'Data Structures', 'CSE 205', 'Midterm', 'Spring 2024',
    JSON_ARRAY(),
    64
  );

SELECT id, kind, title, category_name, status
FROM library_resources
ORDER BY created_at DESC, id DESC;
