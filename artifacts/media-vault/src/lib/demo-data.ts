import type {
  Category,
  Playlist,
  Resource,
  ResourceKind,
} from "./library";

export interface DemoPlaylistItem {
  id: number;
  kind: "book" | "video";
  resource_id: number;
  position: number;
}

export interface DemoPlaylistRecord extends Playlist {
  items: DemoPlaylistItem[];
}

export interface DemoFavorite {
  kind: ResourceKind;
  resource_id: number;
}

export interface DemoHistoryEntry {
  kind: ResourceKind;
  resource_id: number;
  visited_at: string;
  progress_seconds: number;
}

export const demoCategories: Category[] = [
  {
    id: 1,
    name: "Programming",
    slug: "programming",
    description: "Programming books, lectures, and practice material.",
    kind: "all",
  },
  {
    id: 2,
    name: "Algorithms",
    slug: "algorithms",
    description: "Data structures and algorithm design.",
    kind: "all",
  },
  {
    id: 3,
    name: "Computer Science",
    slug: "computer-science",
    description: "Core computer science courses and references.",
    kind: "all",
  },
  {
    id: 4,
    name: "Past Questions",
    slug: "past-questions",
    description: "Organized past exams and practice sheets.",
    kind: "pyq",
  },
];

const now = new Date().toISOString();

export const demoResources: Resource[] = [
  {
    id: 1,
    kind: "book",
    title: "Think Python",
    description:
      "A practical introduction to programming using Python, with clear examples and exercises.",
    category_id: 1,
    category_name: "Programming",
    tags: ["python", "programming", "beginner"],
    status: "published",
    created_at: now,
    updated_at: now,
    created_by: null,
    author: "Allen B. Downey",
    cover_url: null,
    thumbnail_url: null,
    source_type: "pdf",
    source_url: "https://greenteapress.com/thinkpython3/thinkpython3.pdf",
    access_level: "free",
    is_restricted: false,
    total_pages: 300,
    preview_pages: 20,
    language: "English",
    publish_year: 2024,
    semester: null,
    subject_name: null,
    course_code: null,
    exam_type: null,
    batch_info: null,
    file_urls: ["https://greenteapress.com/thinkpython3/thinkpython3.pdf"],
    view_count: 246,
  },
  {
    id: 2,
    kind: "book",
    title: "The Linux Command Line",
    description:
      "A free, approachable guide to working in a command-line environment.",
    category_id: 1,
    category_name: "Programming",
    tags: ["linux", "terminal", "open book"],
    status: "published",
    created_at: now,
    updated_at: now,
    created_by: null,
    author: "William E. Shotts, Jr.",
    cover_url: null,
    thumbnail_url: null,
    source_type: "external",
    source_url: "https://linuxcommand.org/tlcl.php",
    access_level: "free",
    is_restricted: false,
    total_pages: null,
    preview_pages: null,
    language: "English",
    publish_year: 2019,
    semester: null,
    subject_name: null,
    course_code: null,
    exam_type: null,
    batch_info: null,
    file_urls: ["https://linuxcommand.org/tlcl.php"],
    view_count: 151,
  },
  {
    id: 3,
    kind: "video",
    title: "CS50x — Introduction to Computer Science",
    description:
      "Harvard's introductory computer science course, with lectures, notes, and problem sets.",
    category_id: 3,
    category_name: "Computer Science",
    tags: ["computer science", "cs50", "introductory"],
    status: "published",
    created_at: now,
    updated_at: now,
    created_by: null,
    author: "Harvard University",
    cover_url: null,
    thumbnail_url: "https://img.youtube.com/vi/8mAITcNt710/hqdefault.jpg",
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=8mAITcNt710",
    access_level: "free",
    is_restricted: false,
    total_pages: null,
    preview_pages: null,
    language: "English",
    publish_year: 2025,
    semester: null,
    subject_name: null,
    course_code: null,
    exam_type: null,
    batch_info: null,
    file_urls: [],
    view_count: 847,
  },
  {
    id: 4,
    kind: "video",
    title: "Introduction to Algorithms — MIT OpenCourseWare",
    description:
      "Lecture materials and course videos for an undergraduate algorithms course.",
    category_id: 2,
    category_name: "Algorithms",
    tags: ["algorithms", "MIT", "data structures"],
    status: "published",
    created_at: now,
    updated_at: now,
    created_by: null,
    author: "MIT OpenCourseWare",
    cover_url: null,
    thumbnail_url: null,
    source_type: "external",
    source_url:
      "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/",
    access_level: "free",
    is_restricted: false,
    total_pages: null,
    preview_pages: null,
    language: "English",
    publish_year: 2011,
    semester: null,
    subject_name: null,
    course_code: null,
    exam_type: null,
    batch_info: null,
    file_urls: [],
    view_count: 522,
  },
  {
    id: 5,
    kind: "pyq",
    title: "CSE 101 — Programming Fundamentals",
    description:
      "A sample past-question entry. Add your department's file link from Manage to make the paper available.",
    category_id: 4,
    category_name: "Past Questions",
    tags: ["CSE 101", "programming", "sample"],
    status: "published",
    created_at: now,
    updated_at: now,
    created_by: null,
    author: null,
    cover_url: null,
    thumbnail_url: null,
    source_type: null,
    source_url: null,
    access_level: "free",
    is_restricted: false,
    total_pages: null,
    preview_pages: null,
    language: "English",
    publish_year: 2025,
    semester: "1st Semester",
    subject_name: "Programming Fundamentals",
    course_code: "CSE 101",
    exam_type: "Final",
    batch_info: "Fall 2025",
    file_urls: [],
    view_count: 39,
  },
  {
    id: 6,
    kind: "pyq",
    title: "CSE 205 — Data Structures",
    description:
      "A sample exam record with semester, course, and batch metadata.",
    category_id: 4,
    category_name: "Past Questions",
    tags: ["CSE 205", "data structures", "sample"],
    status: "published",
    created_at: now,
    updated_at: now,
    created_by: null,
    author: null,
    cover_url: null,
    thumbnail_url: null,
    source_type: null,
    source_url: null,
    access_level: "free",
    is_restricted: false,
    total_pages: null,
    preview_pages: null,
    language: "English",
    publish_year: 2024,
    semester: "3rd Semester",
    subject_name: "Data Structures",
    course_code: "CSE 205",
    exam_type: "Midterm",
    batch_info: "Spring 2024",
    file_urls: [],
    view_count: 64,
  },
];

export const demoPlaylists: DemoPlaylistRecord[] = [
  {
    id: 1,
    title: "Start with Computer Science",
    description: "A short reading and lecture path for a first-time learner.",
    kind: "video",
    thumbnail_url: null,
    created_by: "demo-student",
    is_public: true,
    category_id: 3,
    created_at: now,
    item_count: 2,
    items: [
      { id: 1, kind: "video", resource_id: 3, position: 0 },
      { id: 2, kind: "video", resource_id: 4, position: 1 },
    ],
  },
];

export function readDemoValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`maat-space-demo:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeDemoValue<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `maat-space-demo:${key}`,
    JSON.stringify(value),
  );
}

export function cloneDemoValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
