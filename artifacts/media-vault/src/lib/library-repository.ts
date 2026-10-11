import { listLibraryResources } from "@workspace/api-client-react";
import type { LibraryResource as ApiResource } from "@workspace/api-client-react";
import type {
  Category,
  DashboardSummary,
  LibraryService,
  LibraryUser,
  Playlist,
  PlaylistInput,
  Resource,
  ResourceFilters,
  ResourceInput,
  ResourceKind,
} from "./library";
import {
  readLocalValue,
  writeLocalValue,
  type HistoryEntry,
  type SavedResource,
  type SearchEntry,
  type StoredPlaylist,
} from "./local-state";

const localKeys = {
  favorites: "favorites",
  history: "history",
  playlists: "playlists",
  searches: "searches",
  views: "views",
};

let resourcesCache: { expiresAt: number; value: Promise<Resource[]> } | undefined;

function stableCategoryId(name: string): number {
  let hash = 0;
  for (const character of name.toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) + 1;
}

function toResource(row: ApiResource): Resource {
  const viewCounts = readLocalValue<Record<string, number>>(localKeys.views, {});
  const key = `${row.kind}:${row.id}`;
  return {
    ...row,
    category_id: row.category_name ? stableCategoryId(row.category_name) : null,
    created_by: null,
    source_url: row.source_url ?? row.file_urls[0] ?? null,
    view_count: row.view_count + (viewCounts[key] ?? 0),
  };
}

function getResources(): Promise<Resource[]> {
  if (resourcesCache && resourcesCache.expiresAt > Date.now()) {
    return resourcesCache.value;
  }
  const value = listLibraryResources().then((rows) => rows.map(toResource));
  resourcesCache = { value, expiresAt: Date.now() + 8_000 };
  value.catch(() => {
    if (resourcesCache?.value === value) resourcesCache = undefined;
  });
  return value;
}

function filterResources(resources: Resource[], filters: ResourceFilters = {}): Resource[] {
  const query = filters.query?.trim().toLowerCase();
  return resources
    .filter((resource) => !filters.categoryId || resource.category_id === filters.categoryId)
    .filter((resource) => !filters.semester || resource.semester === filters.semester)
    .filter((resource) => !filters.courseCode || resource.course_code?.toLowerCase().includes(filters.courseCode.trim().toLowerCase()))
    .filter((resource) => !filters.examType || resource.exam_type?.toLowerCase().includes(filters.examType.trim().toLowerCase()))
    .filter((resource) => {
      if (!query) return true;
      const text = [
        resource.title, resource.description, resource.author, resource.category_name,
        resource.subject_name, resource.course_code, resource.semester, resource.exam_type,
        resource.batch_info, ...resource.tags,
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(query);
    })
    .sort((a, b) => filters.sort === "title"
      ? a.title.localeCompare(b.title)
      : b.created_at.localeCompare(a.created_at));
}

function storedPlaylists(): StoredPlaylist[] {
  return readLocalValue<StoredPlaylist[]>(localKeys.playlists, []);
}

function savePlaylists(playlists: StoredPlaylist[]): void {
  writeLocalValue(localKeys.playlists, playlists);
}

function readonlyError(): Error {
  return new Error("Shared library records are read-only here. Edit public.library_resources in the Replit Database pane.");
}

async function listResources(kind: ResourceKind, filters: ResourceFilters = {}): Promise<Resource[]> {
  return filterResources((await getResources()).filter((resource) => resource.kind === kind), filters);
}

async function getResource(kind: ResourceKind, id: number): Promise<Resource | null> {
  return (await getResources()).find((resource) => resource.kind === kind && resource.id === id) ?? null;
}

async function getDashboard(): Promise<DashboardSummary> {
  const [books, videos, pyqs, playlists] = await Promise.all([
    listResources("book"), listResources("video"), listResources("pyq"), listPlaylists(),
  ]);
  const all = [...books, ...videos, ...pyqs];
  return {
    total_books: books.length,
    total_videos: videos.length,
    total_pyqs: pyqs.length,
    total_playlists: playlists.length,
    recent: [...all].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
    popular: [...all].sort((a, b) => b.view_count - a.view_count).slice(0, 6),
  };
}

async function listCategories(kind?: ResourceKind): Promise<Category[]> {
  const resources = await getResources();
  const groups = new Map<string, Set<ResourceKind>>();
  for (const resource of resources) {
    if (!resource.category_name) continue;
    const kinds = groups.get(resource.category_name) ?? new Set<ResourceKind>();
    kinds.add(resource.kind);
    groups.set(resource.category_name, kinds);
  }
  return [...groups].map(([name, kinds]): Category => {
    const categoryKind: Category["kind"] = kinds.size === 1 ? [...kinds][0] ?? "all" : "all";
    return {
      id: stableCategoryId(name),
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: null,
      kind: categoryKind,
    };
  }).filter((category) => !kind || category.kind === "all" || category.kind === kind)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function listPlaylists(kind?: "book" | "video"): Promise<Playlist[]> {
  return storedPlaylists().filter((playlist) => !kind || playlist.kind === kind)
    .map(({ items, ...playlist }) => ({ ...playlist, item_count: items.length }));
}

async function getPlaylist(id: number): Promise<{ playlist: Playlist; items: Resource[] } | null> {
  const playlist = storedPlaylists().find((item) => item.id === id);
  if (!playlist) return null;
  const resources = await getResources();
  const items = playlist.items.flatMap((item) => {
    const resource = resources.find((row) => row.kind === item.kind && row.id === item.resource_id);
    return resource ? [{ ...resource, playlist_item_id: item.id }] : [];
  });
  const { items: _storedItems, ...record } = playlist;
  return { playlist: { ...record, item_count: items.length }, items };
}

async function createPlaylist(input: PlaylistInput): Promise<Playlist> {
  const playlists = storedPlaylists();
  const record: StoredPlaylist = {
    id: Math.max(0, ...playlists.map((playlist) => playlist.id)) + 1,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    kind: input.kind,
    thumbnail_url: null,
    created_by: "local",
    is_public: input.is_public ?? false,
    category_id: input.category_id ?? null,
    created_at: new Date().toISOString(),
    item_count: 0,
    items: [],
  };
  savePlaylists([record, ...playlists]);
  const { items: _items, ...playlist } = record;
  return playlist;
}

async function deletePlaylist(id: number): Promise<void> {
  savePlaylists(storedPlaylists().filter((playlist) => playlist.id !== id));
}

async function addPlaylistItem(playlistId: number, kind: "book" | "video", resourceId: number): Promise<void> {
  const playlists = storedPlaylists();
  const playlist = playlists.find((item) => item.id === playlistId);
  if (!playlist || playlist.kind !== kind) throw new Error("Playlist not found.");
  if (!(await getResource(kind, resourceId))) throw new Error("Resource not found.");
  if (playlist.items.some((item) => item.resource_id === resourceId)) return;
  const id = Math.max(0, ...playlist.items.map((item) => item.id)) + 1;
  playlist.items.push({ id, kind, resource_id: resourceId, position: playlist.items.length });
  savePlaylists(playlists);
}

async function removePlaylistItem(playlistId: number, itemId: number): Promise<void> {
  savePlaylists(storedPlaylists().map((playlist) => playlist.id === playlistId
    ? { ...playlist, items: playlist.items.filter((item) => item.id !== itemId) }
    : playlist));
}

async function listFavorites(): Promise<Resource[]> {
  const favorites = readLocalValue<SavedResource[]>(localKeys.favorites, []);
  const resources = await getResources();
  return favorites.flatMap((favorite) => {
    const resource = resources.find((item) => item.kind === favorite.kind && item.id === favorite.resource_id);
    return resource ? [resource] : [];
  });
}

async function toggleFavorite(kind: ResourceKind, resourceId: number): Promise<boolean> {
  const favorites = readLocalValue<SavedResource[]>(localKeys.favorites, []);
  const index = favorites.findIndex((item) => item.kind === kind && item.resource_id === resourceId);
  if (index >= 0) {
    favorites.splice(index, 1);
    writeLocalValue(localKeys.favorites, favorites);
    return false;
  }
  favorites.unshift({ kind, resource_id: resourceId });
  writeLocalValue(localKeys.favorites, favorites);
  return true;
}

async function listHistory(): Promise<Resource[]> {
  const history = readLocalValue<HistoryEntry[]>(localKeys.history, []);
  const resources = await getResources();
  return history.sort((a, b) => b.visited_at.localeCompare(a.visited_at)).flatMap((entry) => {
    const resource = resources.find((item) => item.kind === entry.kind && item.id === entry.resource_id);
    return resource ? [resource] : [];
  });
}

async function recordHistory(kind: ResourceKind, resourceId: number, progressSeconds = 0): Promise<void> {
  const history = readLocalValue<HistoryEntry[]>(localKeys.history, []);
  writeLocalValue(localKeys.history, [
    { kind, resource_id: resourceId, visited_at: new Date().toISOString(), progress_seconds: progressSeconds },
    ...history.filter((item) => item.kind !== kind || item.resource_id !== resourceId),
  ].slice(0, 50));
  const views = readLocalValue<Record<string, number>>(localKeys.views, {});
  const key = `${kind}:${resourceId}`;
  views[key] = (views[key] ?? 0) + 1;
  writeLocalValue(localKeys.views, views);
  resourcesCache = undefined;
}

async function saveSearch(query: string): Promise<void> {
  const value = query.trim();
  if (!value) return;
  const history = readLocalValue<SearchEntry[]>(localKeys.searches, []);
  writeLocalValue(localKeys.searches, [
    { query: value, created_at: new Date().toISOString() },
    ...history.filter((item) => item.query !== value),
  ].slice(0, 30));
}

async function listSearchHistory(): Promise<SearchEntry[]> {
  return readLocalValue<SearchEntry[]>(localKeys.searches, []);
}

export const library: LibraryService = {
  getDashboard,
  listResources,
  getResource,
  listCategories,
  createCategory: async () => { throw readonlyError(); },
  updateCategory: async () => { throw readonlyError(); },
  deleteCategory: async () => { throw readonlyError(); },
  createResource: async (_kind: ResourceKind, _input: ResourceInput) => { throw readonlyError(); },
  updateResource: async (_kind: ResourceKind, _id: number, _input: Partial<ResourceInput>) => { throw readonlyError(); },
  deleteResource: async () => { throw readonlyError(); },
  listPlaylists,
  getPlaylist,
  createPlaylist,
  deletePlaylist,
  addPlaylistItem,
  removePlaylistItem,
  listFavorites,
  toggleFavorite,
  listHistory,
  recordHistory,
  saveSearch,
  listSearchHistory,
  getUser: async (): Promise<LibraryUser | null> => null,
  signIn: async () => { throw new Error("Account sign-in is not enabled. You can browse the shared library without an account."); },
  signUp: async () => { throw new Error("Account creation is not enabled. Favorites and playlists are saved in this browser."); },
  signOut: async () => undefined,
};

export function getConnectionMode(): "database" {
  return "database";
}
