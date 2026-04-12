# Fluxa – Copilot Instructions

Fluxa is a **cross-platform LAN file explorer and transfer system**: a Rust/Axum backend serving a React 19/TypeScript SPA. Users browse, upload, download, and transfer files over a local network — no installation required on the receiving end.

## Architecture

```
frontend/   React 19 + TypeScript + Vite + Tailwind CSS 4
backend/    Rust + Axum 0.8 + Tokio (single binary, serves frontend as static files)
docs/       API reference (api.md) and user guide (user-guide.md)
```

The backend embeds the built frontend under `backend/public/` and serves it as a fallback SPA. In production, a single binary at `backend/target/release/fluxa` runs on `0.0.0.0:7070`.

## Build & Test

```bash
make build    # Build frontend (npm) then backend (cargo --release)
make dev      # Backend (cargo-watch) + frontend (Vite HMR) concurrently
make check    # cargo check + tsc --noEmit — run before submitting changes
make start    # Build + run production binary
make clean    # Remove all build artifacts
```

Dev endpoints: backend `http://localhost:7070`, frontend `http://localhost:5173` (proxies API calls to backend).

## Backend Conventions

- **Modular routes**: each domain lives in `backend/src/api/<module>.rs` and exposes a `router()` function. Add new routes there, not in `main.rs`.
- **Shared state**: `AppState` in `backend/src/state.rs` uses `DashMap` for concurrent access (sessions, devices, transfers). Never introduce per-handler `Mutex`; use `DashMap` or atomic types.
- **Configuration**: `Config::from_env()` in `backend/src/config.rs` — defaults to `HOME` as root dir, `0.0.0.0:7070`, 4 GiB upload limit, 2 MiB chunks.
- **Real-time events**: broadcast `WsEvent` (defined in `backend/src/state.rs`) over the WebSocket channel. Use `#[serde(tag = "type", content = "payload")]` for all new events; keep parity with `WsEventType` in `frontend/src/types/index.ts`.
- **Error handling**: use `AppError` from `backend/src/error.rs`; return it from handlers via `Result<_, AppError>`.
- **Logging**: `tracing` macros (`info!`, `debug!`, `warn!`). Log at `debug` level inside handlers, `info` at service boundaries.

See [docs/api.md](../docs/api.md) for the full REST + WebSocket endpoint reference.

## Frontend Conventions

- **State**: Zustand store with Immer middleware in `frontend/src/store/index.ts`. All mutations must go through Immer's `produce` — never mutate state directly.
- **Server state**: TanStack React Query (v5) for all API fetches. Configure `staleTime` and `gcTime` per query; do not use `refetchOnWindowFocus`.
- **HTTP client**: the Axios instance in `frontend/src/api/client.ts` — use it for all requests. Base URL comes from `VITE_API_URL`; the interceptor extracts `response.data.error`.
- **Types**: all shared types (including `WsEvent` discriminated union) live in `frontend/src/types/index.ts`. Keep TypeScript event types in sync with Rust `WsEvent` variants.
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/vite` plugin). Use `clsx` for conditional classes. No inline `style` props.
- **Icons**: `lucide-react` only — do not add other icon libraries.

## Key Reference Files

| File | What it shows |
|------|---------------|
| `backend/src/state.rs` | `AppState`, `DashMap` usage, `WsEvent` enum |
| `backend/src/api/mod.rs` | How routes are composed |
| `backend/src/config.rs` | `from_env()` config pattern |
| `frontend/src/store/index.ts` | Zustand + Immer store shape |
| `frontend/src/types/index.ts` | All TypeScript types and WS event contracts |
| `frontend/src/api/client.ts` | Axios instance + interceptors |
