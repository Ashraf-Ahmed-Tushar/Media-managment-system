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
  cloneDemoValue,
  demoCategories,
  demoPlaylists,
  demoResources,
  readDemoValue,
  writeDemoValue,
  type DemoFavorite,
  type DemoHistoryEntry,
  type DemoPlaylistRecord,
} from "./demo-data";
import {
  getConnectionMode as readConnectionMode,
  requireSupabase,
} from "./supabase-client";

type Row = Record<string, any>;

const tableByKind: Record<ResourceKind, string> = {
  book: "books",
  video: "videos",
  pyq: "pyq_papers",
};

const demoKeys = {
  categories: "categories",
  resources: "resources",
  playlists: "playlists",
  favorites: "favorites",
  history: "history",
  searches: "searches",
};

function throwIfError(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || "The request could not be completed.");
}

function useDemoData(): boolean {
  const mode = readConnectionMode();
  if (mode === "configuration-needed") requireSupabase();
  return mode === "demo";
}

function getDemoResources(): Resource[] {
  return readDemoValue(demoKeys.resources, cloneDemoValue(demoResources));
}

function setDemoResources(resources: Resource[]): void {
  writeDemoValue(demoKeys.resources, resources);
}

function getDemoCategories(): Category[] {
  return readDemoValue(demoKeys.categories, cloneDemoValue(demoCategories));
}

function setDemoCategories(categories: Category[]): void {
  writeDemoValue(demoKeys.categories, categories);
}

function getDemoPlaylists(): DemoPlaylistRecord[] {
  return readDemoValue(demoKeys.playlists, cloneDemoValue(demoPlaylists));
}

function setDemoPlaylists(playlists: DemoPlaylistRecord[]): void {
  writeDemoValue(demoKeys.playlists, playlists);
}

function getDemoFavorites(): DemoFavorite[] {
  return readDemoValue<DemoFavorite[]>(demoKeys.favorites, []);
}

function getDemoHistory(): DemoHistoryEntry[] {
  return readDemoValue<DemoHistoryEntry[]>(demoKeys.history, []);
}

function getDemoSearches(): Array<{ query: string; created_at: string }> {
  return readDemoValue(demoKeys.searches, []);
}

function categoryName(row: Row): string | null {
  const value = row.categories;
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value?.name ?? null;
}

function toResource(kind: ResourceKind, row: Row): Resource {
  const base = {
    id: Number(row.id),
    kind,
    title: String(row.title ?? ""),
    description: row.description ?? null,
    category_id: row.category_id == null ? null : Number(row.category_id),
    category_name: categoryName(row),
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status === "draft" ? "draft" : "published",
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    created_by: row.created_by ?? null,
    author: row.author ?? row.subject_name ?? null,
    cover_url: row.cover_url ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    source_type: row.source_type ?? (kind === "book" ? "pdf" : null),
    access_level: row.access_level ?? "free",
    is_restricted: Boolean(row.is_restricted),
    total_pages: row.total_pages == null ? null : Number(row.total_pages),
    preview_pages: row.preview_pages == null ? null : Number(row.preview_pages),
    language: row.language ?? null,
    publish_year: row.publish_year == null ? null : Number(row.publish_year),
    semester: row.semester ?? null,
    subject_name: row.subject_name ?? null,
    course_code: row.course_code ?? null,
    exam_type: row.exam_type ?? null,
    batch_info: row.batch_info ?? null,
    file_urls: Array.isArray(row.file_urls) ? row.file_urls : [],
    view_count: Number(row.view_count ?? 0),
  } satisfies Omit<Resource, "source_url">;

  const sourceUrl =
    kind === "book"
      ? row.pdf_url ?? null
      : kind === "video"
        ? row.source_url ?? null
        : row.file_urls?.[0] ?? null;

  return { ...base, source_url: sourceUrl };
}

function toPlaylist(row: Row): Playlist {
  const playlistItems = Array.isArray(row.playlist_items)
    ? row.playlist_items
    : [];
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    description: row.description ?? null,
    kind: row.kind === "book" ? "book" : "video",
    thumbnail_url: row.thumbnail_url ?? null,
    created_by: String(row.created_by ?? ""),
    is_public: Boolean(row.is_public),
    category_id: row.category_id == null ? null : Number(row.category_id),
    created_at: String(row.created_at ?? new Date().toISOString()),
    item_count: Number(row.item_count ?? playlistItems.length),
  };
}

function filterResources(
  resources: Resource[],
  filters: ResourceFilters = {},
): Resource[] {
  const query = filters.query?.trim().toLowerCase();
  return resources
    .filter((resource) => !filters.categoryId || resource.category_id === filters.categoryId)
    .filter((resource) => !filters.semester || resource.semester === filters.semester)
    .filter((resource) => !filters.courseCode || resource.course_code?.toLowerCase().includes(filters.courseCode.trim().toLowerCase()))
    .filter((resource) => !filters.examType || resource.exam_type?.toLowerCase().includes(filters.examType.trim().toLowerCase()))
    .filter((resource) => {
      if (!query) return true;
      const haystack = [
        resource.title,
        resource.description,
        resource.author,
        resource.category_name,
        resource.subject_name,
        resource.course_code,
        resource.semester,
        resource.exam_type,
        resource.batch_info,
        ...resource.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function getDemoResource(kind: ResourceKind, id: number): Resource | null {
  return getDemoResources().find((resource) => resource.kind === kind && resource.id === id) ?? null;
}

function makeResourceRow(kind: ResourceKind, input: ResourceInput, userId: string | null): Row {
  const common = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category_id: input.category_id ?? null,
    tags: input.tags ?? [],
    status: input.status ?? "published",
    is_restricted: input.is_restricted ?? false,
    created_by: userId,
  };

  if (kind === "book") {
    return {
      ...common,
      author: input.author ?? null,
      cover_url: input.cover_url ?? null,
      pdf_url: input.source_url ?? input.file_urls?.[0] ?? null,
      preview_pages: input.preview_pages ?? null,
      total_pages: input.total_pages ?? null,
      language: input.language ?? null,
      publish_year: input.publish_year ?? null,
    };
  }

  if (kind === "video") {
    return {
      ...common,
      type: "lecture",
      thumbnail_url: input.thumbnail_url ?? null,
      source_type: input.source_type ?? "external",
      source_url: input.source_url ?? "",
      access_level: input.access_level ?? "free",
      release_date: input.publish_year ? `${input.publish_year}-01-01` : null,
    };
  }

  return {
    ...common,
    semester: input.semester ?? null,
    subject_name: input.subject_name ?? null,
    course_code: input.course_code ?? null,
    exam_type: input.exam_type ?? null,
    batch_info: input.batch_info ?? null,
    file_urls: input.file_urls ?? (input.source_url ? [input.source_url] : []),
  };
}

async function currentLiveUser(): Promise<LibraryUser | null> {
  if (useDemoData()) return null;
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  throwIfError(error);
  const authUser = data.user;
  if (!authUser) return null;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,email,name,role,semester")
    .eq("id", authUser.id)
    .maybeSingle();
  throwIfError(profileError);

  const metadata = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email ?? String(profile?.email ?? ""),
    name: String(profile?.name ?? metadata.name ?? authUser.email ?? "Student"),
    role: profile?.role === "admin" ? "admin" : "user",
    semester: profile?.semester ?? metadata.semester ?? null,
  };
}

async function loadLiveResources(
  kind: ResourceKind,
  filters: ResourceFilters = {},
): Promise<Resource[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from(tableByKind[kind])
    .select("*, categories(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  throwIfError(error);
  const mapped = ((data ?? []) as Row[]).map((row) => toResource(kind, row));
  return filterResources(mapped, filters);
}

async function listResources(
  kind: ResourceKind,
  filters: ResourceFilters = {},
): Promise<Resource[]> {
  if (useDemoData()) {
    return filterResources(
      getDemoResources().filter((resource) => resource.kind === kind),
      filters,
    );
  }
  return loadLiveResources(kind, filters);
}

async function getResource(kind: ResourceKind, id: number): Promise<Resource | null> {
  if (useDemoData()) return getDemoResource(kind, id);
  const client = requireSupabase();
  const { data, error } = await client
    .from(tableByKind[kind])
    .select("*, categories(name)")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error);
  return data ? toResource(kind, data as Row) : null;
}

async function getDashboard(): Promise<DashboardSummary> {
  const [books, videos, pyqs, playlists] = await Promise.all([
    listResources("book"),
    listResources("video"),
    listResources("pyq"),
    listPlaylists(),
  ]);
  const all = [...books, ...videos, ...pyqs];
  return {
    total_books: books.length,
    total_videos: videos.length,
    total_pyqs: pyqs.length,
    total_playlists: playlists.length,
    recent: [...all]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6),
    popular: [...all].sort((a, b) => b.view_count - a.view_count).slice(0, 6),
  };
}

async function listCategories(kind?: ResourceKind): Promise<Category[]> {
  if (useDemoData()) {
    const categories = getDemoCategories();
    return categories
      .filter((category) => !kind || category.kind === "all" || category.kind === kind)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  const client = requireSupabase();
  let request = client.from("categories").select("*").order("name");
  if (kind) request = request.in("kind", ["all", kind]);
  const { data, error } = await request;
  throwIfError(error);
  return (data ?? []) as Category[];
}

async function createCategory(input: Omit<Category, "id">): Promise<Category> {
  if (useDemoData()) {
    const categories = getDemoCategories();
    const category: Category = {
      ...input,
      id: Math.max(0, ...categories.map((item) => item.id)) + 1,
      slug: input.slug.trim().toLowerCase(),
    };
    setDemoCategories([...categories, category]);
    return category;
  }
  const user = await currentLiveUser();
  if (!user) throw new Error("Sign in with an administrator account to manage categories.");
  const client = requireSupabase();
  const { data, error } = await client
    .from("categories")
    .insert({ ...input, slug: input.slug.trim().toLowerCase(), created_by: user.id })
    .select("*")
    .single();
  throwIfError(error);
  return data as Category;
}

async function updateCategory(
  id: number,
  input: Partial<Omit<Category, "id">>,
): Promise<Category> {
  if (useDemoData()) {
    const categories = getDemoCategories();
    const updated = categories.map((category) =>
      category.id === id
        ? {
            ...category,
            ...input,
            slug: input.slug?.trim().toLowerCase() ?? category.slug,
          }
        : category,
    );
    setDemoCategories(updated);
    const category = updated.find((item) => item.id === id);
    if (!category) throw new Error("Category not found.");
    return category;
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from("categories")
    .update({
      ...input,
      ...(input.slug ? { slug: input.slug.trim().toLowerCase() } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();
  throwIfError(error);
  return data as Category;
}

async function deleteCategory(id: number): Promise<void> {
  if (useDemoData()) {
    setDemoCategories(getDemoCategories().filter((category) => category.id !== id));
    setDemoResources(
      getDemoResources().map((resource) =>
        resource.category_id === id
          ? { ...resource, category_id: null, category_name: null }
          : resource,
      ),
    );
    return;
  }
  const client = requireSupabase();
  const { error } = await client.from("categories").delete().eq("id", id);
  throwIfError(error);
}

async function createResource(
  kind: ResourceKind,
  input: ResourceInput,
): Promise<Resource> {
  if (useDemoData()) {
    const resources = getDemoResources();
    const categories = getDemoCategories();
    const category = categories.find((item) => item.id === input.category_id);
    const id = Math.max(0, ...resources.map((resource) => resource.id)) + 1;
    const row = makeResourceRow(kind, input, "demo-student");
    const resource = toResource(kind, {
      ...row,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_id: input.category_id ?? null,
      categories: category ? { name: category.name } : null,
      view_count: 0,
    });
    setDemoResources([resource, ...resources]);
    return resource;
  }
  const user = await currentLiveUser();
  if (!user) throw new Error("Sign in before adding a resource.");
  const client = requireSupabase();
  const { data, error } = await client
    .from(tableByKind[kind])
    .insert(makeResourceRow(kind, input, user.id))
    .select("*, categories(name)")
    .single();
  throwIfError(error);
  return toResource(kind, data as Row);
}

async function updateResource(
  kind: ResourceKind,
  id: number,
  input: Partial<ResourceInput>,
): Promise<Resource> {
  if (useDemoData()) {
    const resources = getDemoResources();
    const categories = getDemoCategories();
    const index = resources.findIndex((resource) => resource.kind === kind && resource.id === id);
    if (index < 0) throw new Error("Resource not found.");
    const oldResource = resources[index];
    const merged = {
      ...oldResource,
      ...input,
      category_name:
        input.category_id === undefined
          ? oldResource.category_name
          : categories.find((category) => category.id === input.category_id)?.name ?? null,
      updated_at: new Date().toISOString(),
    };
    const updated = { ...merged, id, kind };
    resources[index] = updated;
    setDemoResources(resources);
    return updated;
  }
  const user = await currentLiveUser();
  if (!user) throw new Error("Sign in before editing a resource.");
  const existing = await getResource(kind, id);
  if (!existing) throw new Error("Resource not found.");
  const client = requireSupabase();
  const patch = makeResourceRow(kind, { ...existing, ...input }, user.id);
  delete patch.created_by;
  const { data, error } = await client
    .from(tableByKind[kind])
    .update(patch)
    .eq("id", id)
    .select("*, categories(name)")
    .single();
  throwIfError(error);
  return toResource(kind, data as Row);
}

async function deleteResource(kind: ResourceKind, id: number): Promise<void> {
  if (useDemoData()) {
    setDemoResources(
      getDemoResources().filter((resource) => !(resource.kind === kind && resource.id === id)),
    );
    setDemoFavorites(
      getDemoFavorites().filter((favorite) => !(favorite.kind === kind && favorite.resource_id === id)),
    );
    setDemoHistory(
      getDemoHistory().filter((entry) => !(entry.kind === kind && entry.resource_id === id)),
    );
    return;
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from(tableByKind[kind])
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("Resource not found or you do not have permission to delete it.");
}

function setDemoFavorites(favorites: DemoFavorite[]): void {
  writeDemoValue(demoKeys.favorites, favorites);
}

function setDemoHistory(history: DemoHistoryEntry[]): void {
  writeDemoValue(demoKeys.history, history);
}

async function listPlaylists(kind?: "book" | "video"): Promise<Playlist[]> {
  if (useDemoData()) {
    return getDemoPlaylists()
      .filter((playlist) => !kind || playlist.kind === kind)
      .map(({ items, ...playlist }) => ({ ...playlist, item_count: items.length }));
  }
  const client = requireSupabase();
  let request = client
    .from("playlists")
    .select("*, playlist_items(id)")
    .order("created_at", { ascending: false });
  if (kind) request = request.eq("kind", kind);
  const { data, error } = await request;
  throwIfError(error);
  return ((data ?? []) as Row[]).map((row) => toPlaylist(row));
}

async function getPlaylist(
  id: number,
): Promise<{ playlist: Playlist; items: Resource[] } | null> {
  if (useDemoData()) {
    const playlist = getDemoPlaylists().find((item) => item.id === id);
    if (!playlist) return null;
    const items: Resource[] = playlist.items.flatMap((item) => {
        const resource = getDemoResource(item.kind, item.resource_id);
        return resource ? [{ ...resource, playlist_item_id: item.id }] : [];
      });
    return { playlist: { ...playlist, item_count: items.length }, items };
  }
  const client = requireSupabase();
  const { data: playlistRow, error: playlistError } = await client
    .from("playlists")
    .select("*, playlist_items(id)")
    .eq("id", id)
    .maybeSingle();
  throwIfError(playlistError);
  if (!playlistRow) return null;

  const { data: itemRows, error: itemError } = await client
    .from("playlist_items")
    .select("id,position,book:books(*, categories(name)),video:videos(*, categories(name))")
    .eq("playlist_id", id)
    .order("position");
  throwIfError(itemError);
  const items: Resource[] = ((itemRows ?? []) as Row[]).flatMap((item) => {
      if (item.book) {
        return [{
          ...toResource("book", item.book),
          playlist_item_id: Number(item.id),
        }];
      }
      if (item.video) {
        return [{
          ...toResource("video", item.video),
          playlist_item_id: Number(item.id),
        }];
      }
      return [];
    });
  return { playlist: toPlaylist(playlistRow as Row), items };
}

async function createPlaylist(input: PlaylistInput): Promise<Playlist> {
  if (useDemoData()) {
    const playlists = getDemoPlaylists();
    const id = Math.max(0, ...playlists.map((playlist) => playlist.id)) + 1;
    const playlist: DemoPlaylistRecord = {
      id,
      title: input.title.trim(),
      description: input.description ?? null,
      kind: input.kind,
      thumbnail_url: null,
      created_by: "demo-student",
      is_public: input.is_public ?? false,
      category_id: input.category_id ?? null,
      created_at: new Date().toISOString(),
      item_count: 0,
      items: [],
    };
    setDemoPlaylists([playlist, ...playlists]);
    const { items: _items, ...result } = playlist;
    return result;
  }
  const user = await currentLiveUser();
  if (!user) throw new Error("Sign in to create a playlist.");
  const client = requireSupabase();
  const { data, error } = await client
    .from("playlists")
    .insert({ ...input, created_by: user.id })
    .select("*, playlist_items(id)")
    .single();
  throwIfError(error);
  return toPlaylist(data as Row);
}

async function deletePlaylist(id: number): Promise<void> {
  if (useDemoData()) {
    setDemoPlaylists(getDemoPlaylists().filter((playlist) => playlist.id !== id));
    return;
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from("playlists")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("Playlist not found or you do not have permission to delete it.");
}

async function addPlaylistItem(
  playlistId: number,
  kind: "book" | "video",
  resourceId: number,
): Promise<void> {
  if (useDemoData()) {
    const playlists = getDemoPlaylists();
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist) throw new Error("Playlist not found.");
    if (playlist.kind !== kind) throw new Error(`This playlist accepts ${playlist.kind}s only.`);
    if (playlist.items.some((item) => item.kind === kind && item.resource_id === resourceId)) return;
    if (!getDemoResource(kind, resourceId)) throw new Error("Resource not found.");
    const nextId = Math.max(0, ...playlists.flatMap((item) => item.items.map((entry) => entry.id))) + 1;
    playlist.items.push({
      id: nextId,
      kind,
      resource_id: resourceId,
      position: playlist.items.length,
    });
    playlist.item_count = playlist.items.length;
    setDemoPlaylists(playlists);
    return;
  }
  const client = requireSupabase();
  const { data: existingItems, error: listError } = await client
    .from("playlist_items")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1);
  throwIfError(listError);
  const nextPosition = Number((existingItems?.[0] as Row | undefined)?.position ?? -1) + 1;
  const { error } = await client.from("playlist_items").insert({
    playlist_id: playlistId,
    book_id: kind === "book" ? resourceId : null,
    video_id: kind === "video" ? resourceId : null,
    position: nextPosition,
  });
  throwIfError(error);
}

async function removePlaylistItem(playlistId: number, itemId: number): Promise<void> {
  if (useDemoData()) {
    setDemoPlaylists(
      getDemoPlaylists().map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        const items = playlist.items.filter((item) => item.id !== itemId);
        return { ...playlist, items, item_count: items.length };
      }),
    );
    return;
  }
  const client = requireSupabase();
  const { error } = await client
    .from("playlist_items")
    .delete()
    .eq("id", itemId)
    .eq("playlist_id", playlistId);
  throwIfError(error);
}

async function listFavorites(): Promise<Resource[]> {
  if (useDemoData()) {
    return getDemoFavorites()
      .map((favorite) => getDemoResource(favorite.kind, favorite.resource_id))
      .filter((resource): resource is Resource => Boolean(resource));
  }
  const user = await currentLiveUser();
  if (!user) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from("favorites")
    .select("content_type,content_id")
    .order("created_at", { ascending: false });
  throwIfError(error);
  const rows = (data ?? []) as Row[];
  const resources = await Promise.all(
    rows.map((favorite) =>
      getResource(favorite.content_type as ResourceKind, Number(favorite.content_id)),
    ),
  );
  return resources.filter((resource): resource is Resource => Boolean(resource));
}

async function toggleFavorite(
  kind: ResourceKind,
  resourceId: number,
): Promise<boolean> {
  if (useDemoData()) {
    const favorites = getDemoFavorites();
    const existingIndex = favorites.findIndex(
      (favorite) => favorite.kind === kind && favorite.resource_id === resourceId,
    );
    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      setDemoFavorites(favorites);
      return false;
    }
    favorites.unshift({ kind, resource_id: resourceId });
    setDemoFavorites(favorites);
    return true;
  }
  const user = await currentLiveUser();
  if (!user) throw new Error("Sign in to save this resource.");
  const client = requireSupabase();
  const { data: existing, error: findError } = await client
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("content_type", kind)
    .eq("content_id", resourceId)
    .maybeSingle();
  throwIfError(findError);
  if (existing) {
    const { error } = await client.from("favorites").delete().eq("id", existing.id);
    throwIfError(error);
    return false;
  }
  const { error } = await client.from("favorites").insert({
    user_id: user.id,
    content_type: kind,
    content_id: resourceId,
  });
  throwIfError(error);
  return true;
}

async function listHistory(): Promise<Resource[]> {
  if (useDemoData()) {
    return getDemoHistory()
      .sort((a, b) => b.visited_at.localeCompare(a.visited_at))
      .map((entry) => getDemoResource(entry.kind, entry.resource_id))
      .filter((resource): resource is Resource => Boolean(resource));
  }
  const user = await currentLiveUser();
  if (!user) return [];
  const client = requireSupabase();
  const [videos, books, pyqs] = await Promise.all([
    client
      .from("watch_history")
      .select("video_id,last_watched_at")
      .order("last_watched_at", { ascending: false })
      .limit(50),
    client
      .from("book_history")
      .select("book_id,last_read_at")
      .order("last_read_at", { ascending: false })
      .limit(50),
    client
      .from("pyq_history")
      .select("pyq_id,last_opened_at")
      .order("last_opened_at", { ascending: false })
      .limit(50),
  ]);
  throwIfError(videos.error);
  throwIfError(books.error);
  throwIfError(pyqs.error);
  const entries: Array<{ kind: ResourceKind; id: number; at: string }> = [
    ...((videos.data ?? []) as Row[]).map((row) => ({
      kind: "video" as const,
      id: Number(row.video_id),
      at: String(row.last_watched_at),
    })),
    ...((books.data ?? []) as Row[]).map((row) => ({
      kind: "book" as const,
      id: Number(row.book_id),
      at: String(row.last_read_at),
    })),
    ...((pyqs.data ?? []) as Row[]).map((row) => ({
      kind: "pyq" as const,
      id: Number(row.pyq_id),
      at: String(row.last_opened_at),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const resources = await Promise.all(
    entries.map((entry) => getResource(entry.kind, entry.id)),
  );
  return resources.filter((resource): resource is Resource => Boolean(resource));
}

async function recordHistory(
  kind: ResourceKind,
  resourceId: number,
  progressSeconds = 0,
): Promise<void> {
  if (useDemoData()) {
    const history = getDemoHistory();
    const entry: DemoHistoryEntry = {
      kind,
      resource_id: resourceId,
      visited_at: new Date().toISOString(),
      progress_seconds: progressSeconds,
    };
    setDemoHistory([
      entry,
      ...history.filter(
        (item) => !(item.kind === kind && item.resource_id === resourceId),
      ),
    ]);
    const resources = getDemoResources().map((resource) =>
      resource.kind === kind && resource.id === resourceId
        ? { ...resource, view_count: resource.view_count + 1 }
        : resource,
    );
    setDemoResources(resources);
    return;
  }
  const user = await currentLiveUser();
  if (!user) return;
  const client = requireSupabase();
  const table =
    kind === "video"
      ? "watch_history"
      : kind === "book"
        ? "book_history"
        : "pyq_history";
  const row =
    kind === "video"
      ? {
          user_id: user.id,
          video_id: resourceId,
          progress_seconds: progressSeconds,
          last_watched_at: new Date().toISOString(),
        }
      : kind === "book"
        ? {
            user_id: user.id,
            book_id: resourceId,
            last_page: Math.max(0, progressSeconds),
            last_read_at: new Date().toISOString(),
          }
        : {
            user_id: user.id,
            pyq_id: resourceId,
            last_opened_at: new Date().toISOString(),
          };
  const conflictTarget =
    kind === "video" ? "user_id,video_id" : kind === "book" ? "user_id,book_id" : "user_id,pyq_id";
  const { error } = await client
    .from(table)
    .upsert(row as never, { onConflict: conflictTarget });
  throwIfError(error);
}

async function saveSearch(
  query: string,
  contentType: ResourceKind | "all" = "all",
): Promise<void> {
  const text = query.trim();
  if (!text) return;
  if (useDemoData()) {
    const searches = getDemoSearches();
    writeDemoValue(demoKeys.searches, [
      { query: text, created_at: new Date().toISOString() },
      ...searches.filter((item) => item.query !== text),
    ].slice(0, 30));
    return;
  }
  const user = await currentLiveUser();
  if (!user) return;
  const client = requireSupabase();
  const { error } = await client.from("search_history").insert({
    user_id: user.id,
    query_text: text,
    content_type: contentType,
  });
  throwIfError(error);
}

async function listSearchHistory(): Promise<Array<{ query: string; created_at: string }>> {
  if (useDemoData()) return getDemoSearches();
  const user = await currentLiveUser();
  if (!user) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from("search_history")
    .select("query_text,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  throwIfError(error);
  return ((data ?? []) as Row[]).map((row) => ({
    query: String(row.query_text),
    created_at: String(row.created_at),
  }));
}

async function getUser(): Promise<LibraryUser | null> {
  if (useDemoData()) return null;
  return currentLiveUser();
}

async function signIn(email: string, password: string): Promise<LibraryUser> {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });
  throwIfError(error);
  const user = await currentLiveUser();
  if (!user) throw new Error("The account signed in, but its profile is not ready yet.");
  return user;
}

async function signUp(
  name: string,
  email: string,
  password: string,
  semester?: string,
): Promise<LibraryUser> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name.trim(),
        ...(semester?.trim() ? { semester: semester.trim() } : {}),
      },
    },
  });
  throwIfError(error);
  if (!data.user) throw new Error("Supabase did not return a user for this signup.");
  return {
    id: data.user.id,
    email: data.user.email ?? email,
    name: name.trim(),
    role: "user",
    semester: semester?.trim() || null,
  };
}

async function signOut(): Promise<void> {
  if (useDemoData()) return;
  const { error } = await requireSupabase().auth.signOut();
  throwIfError(error);
}

export const library: LibraryService = {
  getDashboard,
  listResources,
  getResource,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createResource,
  updateResource,
  deleteResource,
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
  getUser,
  signIn,
  signUp,
  signOut,
};

export { readConnectionMode as getConnectionMode };
