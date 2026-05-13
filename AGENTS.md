# Virtual Queue — Agents Guide

This document describes the "Virtual Queue" project and the responsibilities expected from automated agents (AI assistants) working on it.

## Project summary
- Purpose: a shared virtual queue for participants at a math contest (300 tables in one hall). Assistants use a smartphone UI to add a participant to the queue when they leave (e.g. to go to the bathroom) and remove them when their turn arrives. The app shows table positions and the current queue.
- Scale: 300 tables, moderate concurrent usage (many assistants using mobile clients).
- Tech stack: Next.js (frontend + API routes), MongoDB (persistent models), Redis (fast queue operations / pubsub).

## Data model (high level)
- `Table`: { id: integer (1..300), x: number, y: number, shape: enum('square','semicircle-left','semicircle-right'), rotation?: number, status?: enum('normal','raised-hand','queued','in-bathroom') }
- Queue representation: Redis list(s) per queue (single global bathroom queue by default). MongoDB stores final state/history and table records. Participant details are represented only by their numeric identifier in queue events (no separate `Participant` collection required).

## API surface (required)
- `POST /api/queue/join` — payload: { participantNumber, tableId } — push participant into Redis queue and persist join event (audit record with timestamp).
- `POST /api/queue/leave` — payload: { participantNumber } — remove participant from queue (or pop next) and persist leave event (audit record with timestamp).
- `GET /api/queue/status` — return queue snapshot (ordered list of participant numbers, positions, ETA estimate), optionally table map. Source of truth for order: Redis list; MongoDB provides history/audit.
- `GET /api/tables` — return all 300 tables and positions, including `status` and `lastStatusChange` timestamps.
- `POST /api/tables/:id/state` — payload: { status: 'normal'|'raised-hand'|'queued'|'in-bathroom', participantNumber?: integer } — update a table's state, set `lastStatusChange`, and emit an audit event and realtime pub/sub message. If status changes to `queued`, client may include `participantNumber` to add to queue.
- `GET /api/audit` — optional: return recent audit log entries (joins/leaves/state changes) for debugging and analytics.
- WebSocket or Redis Pub/Sub endpoint to push queue and table state changes to connected clients in realtime.

## Agent responsibilities
- Create, update, and review API routes and data models consistent with stack above.
- Implement Redis-backed queue operations with atomic semantics (LPUSH/RPUSH + LPOP or blocking ops depending on UX).
- Ensure MongoDB models for participants & tables, and an audit log for joins/leaves.
- Implement Next.js mobile-first UI that shows:
  - a 300-table layout (grid or map) with table statuses,
  - current queue (ordered list) and participant positions,
  - controls for assistants to `join` or `call next`.
- Add realtime updates using WebSocket (Next.js) or Redis pub/sub.
- Provide docker-compose for local dev with MongoDB and Redis, and `.env.example` for secrets.


## Developer notes for agents
- Use Redis for queue semantics and MongoDB for persistent state and history. Keep API surface minimal and well-documented.
- When adding new features, keep this file updated.

