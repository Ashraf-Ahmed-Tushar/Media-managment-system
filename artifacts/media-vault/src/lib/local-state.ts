import type { Playlist, ResourceKind } from "./library";

export interface SavedResource {
  kind: ResourceKind;
  resource_id: number;
}

export interface HistoryEntry extends SavedResource {
  visited_at: string;
  progress_seconds: number;
}

export interface SearchEntry {
  query: string;
  created_at: string;
}

export interface PlaylistEntry {
  id: number;
  kind: "book" | "video";
  resource_id: number;
  position: number;
}

export interface StoredPlaylist extends Playlist {
  items: PlaylistEntry[];
}

const keyPrefix = "studyshelf:";
const legacyKeyPrefixes = ["maat-space:", "maat-space-demo:"];

export function readLocalValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${keyPrefix}${key}`)
      ?? legacyKeyPrefixes.map((prefix) => window.localStorage.getItem(`${prefix}${key}`)).find(Boolean);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalValue<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${keyPrefix}${key}`, JSON.stringify(value));
}

