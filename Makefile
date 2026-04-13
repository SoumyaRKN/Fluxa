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

## bump-version VERSION=x.y.z – update version in all manifests
## Usage: make bump-version VERSION=1.1.0
bump-version:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make bump-version VERSION=x.y.z"; exit 1; fi
	cd backend && cargo-set-version set-version $(VERSION)
	cd frontend && npm version $(VERSION) --no-git-tag-version
	sed -i 's/>v[0-9]*\.[0-9]*\.[0-9]*</>v$(VERSION)</g' frontend/src/components/Layout/Sidebar.tsx
	@echo "Bumped all versions to $(VERSION)"