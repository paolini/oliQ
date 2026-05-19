# Virtual Queue

Mobile-first Next.js app to manage a shared bathroom queue for a 300-table math contest hall. Uses Redis for queue ordering and MongoDB for persistent table state and audit logs.

Quick start

1. Copy `.env.example` to `.env` and set `MONGO_URI` and `REDIS_URL`.
2. Start dependencies:

```bash
docker-compose up -d
```

3. Install deps and run dev server:

```bash
npm install
npm run dev
```

API
- `POST /api/queue/join` — join queue
- `POST /api/queue/leave` — leave queue
- `GET /api/queue/status` — snapshot
- `GET /api/rooms/:id/tables` — tables for a room
- `POST /api/rooms/:id/tables` — replace tables for a room (tooling)
