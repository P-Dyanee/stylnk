# StyLnk Backend

Express + Socket.IO backend for the StyLnk messaging app, backed by PostgreSQL.

## Quick start

1. Create the `stylnk` database in PostgreSQL.
2. Run [`backend/sql/schema.sql`](./sql/schema.sql) in pgAdmin4.
3. Optionally run [`backend/sql/sample_data.sql`](./sql/sample_data.sql) for demo data.
4. Set `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/stylnk"
JWT_SECRET="change-this-secret"
PORT=4000
```

5. Install dependencies:

```bash
npm install --prefix backend
```

6. Start the API:

```bash
npm run start:backend
```

For live reload while developing the backend:

```bash
npm run dev:backend
```

## API highlights

- `POST /auth/register`
- `POST /auth/login`
- `GET /users`
- `GET /conversations`
- `GET /groups`
- `POST /conversations/direct`
- `POST /conversations/group`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`
- `POST /conversations/:id/seen`
- `PATCH /me/avatar`

## Real-time events

- `presence:snapshot`
- `presence:update`
- `conversation:refresh`
- `message:new`
- `message:status`
- `call:incoming`
- `call:accepted`
- `call:declined`
- `call:ended`
- `webrtc:offer`
- `webrtc:answer`
- `webrtc:ice-candidate`
