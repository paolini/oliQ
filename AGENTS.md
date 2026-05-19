# Virtual Queue — Agents Guide

This document describes the "Virtual Queue" project and the responsibilities expected from automated agents (AI assistants) working on it.

## Project summary
- Purpose: a shared virtual queue for participants at a math contest (300 tables in one hall). Assistants use a smartphone UI to add a participant to the queue when they leave (e.g. to go to the bathroom) and remove them when their turn arrives. The app shows table positions and the current queue.
- Scale: 300 tables, moderate concurrent usage (many assistants using mobile clients).
- Tech stack: Next.js (frontend + API routes), MongoDB (persistent models), Redis (fast queue operations / pubsub).

## Key design principles
- Tables are immutable geometry documents: created at setup and not changed during the contest (position/shape fixed).
- Tables come in two shapes: squares (1 participant) and circles (2 participants). The `tables` collection defines the geometry and participant capacity.
- All runtime activity is recorded in a single append-only `events` collection. The `events` collection contains participant-oriented events only — it must not reference tables or seats.
- State for the UI (who is queued, called, checked-in) is derived by reducing the `events` log; for responsiveness the server may cache a materialized `state` view, but the `events` collection is authoritative.


## Database model
- `tables` (immutable map geometry)
  - Document shape:
    - { participant_ids: [number], x: number, y: number, shape: 'square'|'circle', rotation?: number, roomId?: ObjectId }
 - `rooms` (room definitions)
  - Document shape:
    - { title: string, width: number, height: number }
 - `events` (append-only event log — source of truth for participant activity)
  - Document shape:
    - { ts: Date, event: 'raise-hand'|'join-queue'|'bathroom-1'|'bathroom-2'|'seat', participantNumber: number, }

## How current state is obtained
- The server provides `GET /api/state` which reduces recent `events` entries (or returns a cached snapshot) and computes the participant-oriented view: queue order (from Redis), who was called, who is checked-in, etc.
- For realtime UX, write to `events` then update cache and publish a Redis pub/sub message so clients receive updates.

## API (canonical list)
- `POST /api/events` — append an event to `events`. Body: `{ type, participantNumber?, details? }`.
- `GET /api/events` — query the events log (filters: participantNumber, type, since/until).
- `GET /api/state` — return computed state (optionally cached). Supports filters for participant or time window.
 - `POST /api/queue/join` — push participant into Redis queue and append an `events` record.
 - `POST /api/queue/leave` — remove participant from Redis queue and append an `events` record.
- `GET /api/queue/status` — return queue snapshot (ordered list + ETA estimate). Source of order: Redis.
- `GET /api/tables` — return all table geometry documents (for rendering the map).
- `POST /api/tables` — (tooling only) sets all tables at once (geometry + participant capacity). Not used during runtime, only for initial setup.
 - `GET /api/tables` — return table geometry documents; supports query param `roomId` to filter tables for a room.
 - `POST /api/tables` — (tooling only) sets all tables at once (geometry + participant capacity). When working with multiple rooms, POST should include tables for a single room or include `roomId` per table.
 - `GET /api/rooms` — return list of rooms.
 - `POST /api/rooms` — create a new room. Body: `{ title: string, width: number, height: number }`.
 - `PUT /api/rooms/:id` — update room metadata (title/width/height).
 - `DELETE /api/rooms/:id` — delete a room (should consider cascading or reassigning tables).

Notes:
- Avoid duplicating these endpoints in other docs — this is the canonical list.
- If you need auxiliary endpoints (e.g., `/api/tables/upsert`) keep them small and documented in code.

## Realtime & caching
- Publish events to Redis pub/sub after writing to `events` (or after updating the cached state). Clients subscribe to receive immediate updates.
- Cache `GET /api/state` materialized snapshots in memory or Redis for low-latency reads. Invalidate/update on new `events` writes.

## Frontend (mobile-first)
- Rendering choice: **SVG** for the room map and table rendering (crisp shapes, easy hit-testing, small DOM for 300 elements).
- `RoomMap` React component responsibilities:
  - Accept `Table[]` from `/api/tables` and render each as an SVG primitive.
  - Map table `x,y` coordinates into a scalable `viewBox`.
  - Support touch handlers (`tap` -> bottom sheet), pinch-to-zoom and pan.
  - Allow rectangle selection for grid insertion (tooling mode) and selection-based bulk edits.
- UI patterns:
  - Bottom sheet for table details and quick actions (raise-hand, join queue, call next).
  - Compact queue view (ordered) and a map view.
  - Batch and debounce frequent updates; use `requestAnimationFrame` for animations.

## Operational notes for agents
- Always append to `events` for user actions. Then update cache and publish pub/sub messages.
- Keep `tables` immutable after initial creation; any geometry changes are part of setup tooling, not runtime.
- For reliability, consider MongoDB transactions if you need strong atomicity between writing `audit` and updating caches.

## Next steps (recommended)
1. Implement `POST /api/audit`, `GET /api/audit` and `GET /api/state` (state reducer + optional caching).
2. Provide `GET /api/tables` (geometry) and a simple `RoomMap` implementation in the frontend.
3. Add Redis pub/sub wiring so new `audit` writes trigger realtime notifications to clients.

## Developer notes
- Use Redis for queue semantics and pub/sub; MongoDB `audit` is the single source of truth for history.
- Keep this document updated when API or data-model decisions change.
