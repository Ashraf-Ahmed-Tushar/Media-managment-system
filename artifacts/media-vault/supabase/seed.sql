-- Optional starter records for a fresh Maat Space project.
-- The media URLs are public external learning resources; replace them with
-- materials your department is allowed to share.

insert into public.categories (name, slug, description, kind)
values
  ('Programming', 'programming', 'Programming books, lectures, and practice material.', 'all'),
  ('Algorithms', 'algorithms', 'Data structures and algorithm design.', 'all'),
  ('Computer Science', 'computer-science', 'Core computer science courses and references.', 'all'),
  ('Past Questions', 'past-questions', 'Organized past exams and practice sheets.', 'pyq')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    kind = excluded.kind;

insert into public.books
  (title, author, description, category_id, pdf_url, language, publish_year, tags, status)
select
  'Think Python',
  'Allen B. Downey',
  'A practical introduction to programming with Python, examples, and exercises.',
  c.id,
  'https://greenteapress.com/thinkpython3/thinkpython3.pdf',
  'English',
  2024,
  array['python', 'programming', 'beginner'],
  'published'
from public.categories c
where c.slug = 'programming'
on conflict (title, author) do update
set description = excluded.description,
    category_id = excluded.category_id,
    pdf_url = excluded.pdf_url,
    tags = excluded.tags,
    status = excluded.status;

insert into public.books
  (title, author, description, category_id, pdf_url, language, publish_year, tags, status)
select
  'The Linux Command Line',
  'William E. Shotts, Jr.',
  'A free, approachable guide to working in a command-line environment.',
  c.id,
  'https://linuxcommand.org/tlcl.php',
  'English',
  2019,
  array['linux', 'terminal', 'open book'],
  'published'
from public.categories c
where c.slug = 'programming'
on conflict (title, author) do update
set description = excluded.description,
    category_id = excluded.category_id,
    pdf_url = excluded.pdf_url,
    tags = excluded.tags,
    status = excluded.status;

insert into public.videos
  (title, description, type, category_id, tags, source_type, source_url, status, access_level, release_date)
select
  'CS50x — Introduction to Computer Science',
  'Harvard''s introductory computer science course, with lectures, notes, and problem sets.',
  'lecture',
  c.id,
  array['computer science', 'cs50', 'introductory'],
  'external',
  'https://cs50.harvard.edu/x/2025/',
  'published',
  'free',
  date '2025-01-01'
from public.categories c
where c.slug = 'computer-science'
and not exists (
  select 1 from public.videos v
  where v.title = 'CS50x — Introduction to Computer Science'
);

insert into public.videos
  (title, description, type, category_id, tags, source_type, source_url, status, access_level, release_date)
select
  'Introduction to Algorithms — MIT OpenCourseWare',
  'Lecture materials and course videos for an undergraduate algorithms course.',
  'lecture',
  c.id,
  array['algorithms', 'MIT', 'data structures'],
  'external',
  'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
  'published',
  'free',
  date '2011-09-01'
from public.categories c
where c.slug = 'algorithms'
and not exists (
  select 1 from public.videos v
  where v.title = 'Introduction to Algorithms — MIT OpenCourseWare'
);

insert into public.pyq_papers
  (title, description, category_id, semester, subject_name, course_code, exam_type, batch_info, status)
select
  'CSE 101 — Programming Fundamentals',
  'Starter entry. Add your department''s approved paper URL from the Manage page.',
  c.id,
  '1st Semester',
  'Programming Fundamentals',
  'CSE 101',
  'Final',
  'Fall 2025',
  'published'
from public.categories c
where c.slug = 'past-questions'
on conflict (course_code, semester, exam_type, batch_info) do update
set title = excluded.title,
    description = excluded.description,
    category_id = excluded.category_id,
    status = excluded.status;

