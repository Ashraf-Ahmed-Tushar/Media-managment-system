---
name: Maat Space data editing
description: The chosen source of truth and editing boundary for shared Maat Space resources.
---

Shared library resources belong in Replit PostgreSQL. The user chose the Replit Database pane as the only way to add or edit those records; keep the app read-only for shared resource content and do not introduce in-app resource-management writes or new authentication unless the user changes this decision.

**Why:** The user asked to remove hardcoded library data and keep the database-editing setup small.

**How to apply:** Put future shared resource fields in the PostgreSQL schema/API, show read-only data in the app, and keep browser-specific favorites, history, searches, and playlists separate.
