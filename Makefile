.PHONY: dev build start clean

## dev – run backend + frontend in watch mode (requires cargo-watch)
dev:
	@bash dev.sh

## build – build frontend and backend in release mode
build: build-frontend build-backend

build-frontend:
	cd frontend && npm install && npm run build

build-backend:
	cd backend && cargo build --release

## start – launch the compiled production binary
start: build
	@bash start.sh

## clean – remove build artifacts
clean:
	rm -rf backend/target backend/public frontend/node_modules

## check – lint and type-check
check:
	cd backend && cargo check
	cd frontend && npx tsc --noEmit
