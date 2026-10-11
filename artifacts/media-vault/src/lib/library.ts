export type ResourceKind = "book" | "video" | "pyq";
export type LibraryKind = ResourceKind | "playlist";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  kind: ResourceKind | "all";
}

export interface Resource {
  id: number;
  playlist_item_id?: number;
  kind: ResourceKind;
  title: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  tags: string[];
  status: "published" | "draft";
  created_at: string;
  updated_at: string;
  created_by: string | null;
  author: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  source_type: string | null;
  source_url: string | null;
  access_level: string | null;
  is_restricted: boolean;
  total_pages: number | null;
  preview_pages: number | null;
  language: string | null;
  publish_year: number | null;
  semester: string | null;
  subject_name: string | null;
  course_code: string | null;
  exam_type: string | null;
  batch_info: string | null;
  file_urls: string[];
  view_count: number;
}

export interface Playlist {
  id: number;
  title: string;
  description: string | null;
  kind: "book" | "video";
  thumbnail_url: string | null;
  created_by: string;
  is_public: boolean;
  category_id: number | null;
  created_at: string;
  item_count: number;
}

export interface ResourceInput {
  title: string;
  description?: string | null;
  category_id?: number | null;
  tags?: string[];
  status?: "published" | "draft";
  author?: string | null;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  source_type?: string | null;
  source_url?: string | null;
  access_level?: string | null;
  is_restricted?: boolean;
  total_pages?: number | null;
  preview_pages?: number | null;
  language?: string | null;
  publish_year?: number | null;
  semester?: string | null;
  subject_name?: string | null;
  course_code?: string | null;
  exam_type?: string | null;
  batch_info?: string | null;
  file_urls?: string[];
}

export interface PlaylistInput {
  title: string;
  description?: string | null;
  kind: "book" | "video";
  is_public?: boolean;
  category_id?: number | null;
}

export interface LibraryUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  semester: string | null;
}

export interface DashboardSummary {
  total_books: number;
  total_videos: number;
  total_pyqs: number;
  total_playlists: number;
  recent: Resource[];
  popular: Resource[];
}

export interface ResourceFilters {
  query?: string;
  categoryId?: number;
  semester?: string;
  courseCode?: string;
  examType?: string;
  sort?: "newest" | "title";
}

export interface LibraryService {
  getDashboard(): Promise<DashboardSummary>;
  listResources(
    kind: ResourceKind,
    filters?: ResourceFilters,
  ): Promise<Resource[]>;
  getResource(kind: ResourceKind, id: number): Promise<Resource | null>;
  listCategories(kind?: ResourceKind): Promise<Category[]>;
  createCategory(input: Omit<Category, "id">): Promise<Category>;
  updateCategory(id: number, input: Partial<Omit<Category, "id">>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  createResource(kind: ResourceKind, input: ResourceInput): Promise<Resource>;
  updateResource(
    kind: ResourceKind,
    id: number,
    input: Partial<ResourceInput>,
  ): Promise<Resource>;
  deleteResource(kind: ResourceKind, id: number): Promise<void>;
  listPlaylists(kind?: "book" | "video"): Promise<Playlist[]>;
  getPlaylist(id: number): Promise<{ playlist: Playlist; items: Resource[] } | null>;
  createPlaylist(input: PlaylistInput): Promise<Playlist>;
  deletePlaylist(id: number): Promise<void>;
  addPlaylistItem(
    playlistId: number,
    kind: "book" | "video",
    resourceId: number,
  ): Promise<void>;
  removePlaylistItem(playlistId: number, itemId: number): Promise<void>;
  listFavorites(): Promise<Resource[]>;
  toggleFavorite(kind: ResourceKind, resourceId: number): Promise<boolean>;
  listHistory(): Promise<Resource[]>;
  recordHistory(
    kind: ResourceKind,
    resourceId: number,
    progressSeconds?: number,
  ): Promise<void>;
  saveSearch(query: string, contentType?: ResourceKind | "all"): Promise<void>;
  listSearchHistory(): Promise<Array<{ query: string; created_at: string }>>;
  getUser(): Promise<LibraryUser | null>;
  signIn(email: string, password: string): Promise<LibraryUser>;
  signUp(
    name: string,
    email: string,
    password: string,
    semester?: string,
  ): Promise<LibraryUser>;
  signOut(): Promise<void>;
}

export type ConnectionMode = "database";

export { library, getConnectionMode } from "./library-repository";
