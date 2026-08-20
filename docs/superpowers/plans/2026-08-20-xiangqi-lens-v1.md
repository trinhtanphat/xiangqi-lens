# XiangqiLens V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a commercial-safe Cloudflare Worker application that accepts Xiangqi video/image input, recognizes board positions through a Workers AI vision adapter, validates positions with a TypeScript Xiangqi rules core, computes top moves with an in-repo license-safe alpha-beta engine, and renders synchronized best-move arrows over the board/video.

**Architecture:** A single Cloudflare Worker serves the web app and API. Heavy deterministic chess logic runs client-side; Workers AI is used only for vision recognition/explanations and its output is always validated by the Xiangqi core. The first production vertical slice avoids bundling third-party model weights or Pikafish NNUE assets so the default build remains commercially distributable.

**Tech Stack:** Dependency-free ES modules with TypeScript `checkJs`, Node built-in test runner, Cloudflare Workers, Workers AI vision binding, HTML5 video/canvas, and hand-written runtime schema guards. This avoids an npm-registry dependency during build/deploy while keeping static type checking.

**Spec:** `docs/superpowers/specs/2026-08-20-xiangqi-lens-design.md`

## Global Constraints

- Commercial use is a first-class requirement.
- Do not bundle third-party weights or binaries without verified commercial permission.
- Workers AI output is non-authoritative and must pass deterministic validation.
- No automated clicking or interaction with third-party Xiangqi game services.
- CI-equivalent local verification requires typecheck, unit tests, and production build before pushing to `main`.
- Deployment target is Cloudflare Workers.

---

### Task 1: Workspace, Core Types, and Board Model

**Files:**
- Create: `package.json`, `tsconfig.json`, `index.html`, `scripts/build.mjs`
- Create: `src/core/types.js`, `src/core/fen.js`, `src/core/board.js`
- Test: `src/core/fen.test.js`, `src/core/board.test.js`

**Interfaces:**
- Produces `Board`, `Piece`, `Side`, `Square`, `parseFen(fen)`, `serializeFen(board, sideToMove)`.

- [ ] Write failing tests for FEN round-trip, starting-position piece counts, and invalid FEN rejection.
- [ ] Run Vitest and confirm RED failures caused by missing production modules.
- [ ] Implement minimal board/FEN modules.
- [ ] Run focused tests and confirm GREEN.
- [ ] Refactor types without changing behavior.

### Task 2: Legal Xiangqi Move Generation

**Files:**
- Create: `src/core/rules.js`
- Test: `src/core/rules.test.js`

**Interfaces:**
- Consumes `Board`, `Square`, `Side`.
- Produces `Move`, `generatePseudoLegalMoves`, `generateLegalMoves`, `applyMove`, `isInCheck`.

- [ ] Write failing tests for rook, cannon screen capture, horse-leg blocking, elephant river restriction, advisor palace, king palace/flying-general, pawn river behavior, and self-check rejection.
- [ ] Run tests and confirm RED.
- [ ] Implement minimal movement/rule logic.
- [ ] Run focused tests and confirm GREEN.
- [ ] Add move application and legal filtering; keep all tests green.

### Task 3: Commercial-Safe Local Analysis Engine

**Files:**
- Create: `src/engine/evaluate.js`, `src/engine/search.js`
- Test: `src/engine/search.test.js`

**Interfaces:**
- Produces `analyzePosition(board, side, {depth, multiPv}) -> AnalysisLine[]`.
- `AnalysisLine` contains `move`, `score`, `pv`, `depth`, and `nodes`.

- [ ] Write failing tests proving the engine finds immediate king capture/checkmate-equivalent tactical wins, prefers free material, returns sorted top-N legal moves, and never returns illegal moves.
- [ ] Run tests and confirm RED.
- [ ] Implement material + positional evaluation and alpha-beta negamax with node limit/cancellation-friendly structure.
- [ ] Run tests and confirm GREEN.
- [ ] Add deterministic move ordering and stable tie-breaking.

### Task 4: Vision Response Validation and Temporal State Reconciliation

**Files:**
- Create: `src/vision/schema.js`, `src/vision/reconcile.js`
- Test: `src/vision/schema.test.js`, `src/vision/reconcile.test.js`

**Interfaces:**
- Produces `parseVisionCandidate(json)`, `reconcileCandidate(previousBoard, candidateBoard, sideToMove)`.
- Reconciliation returns `accepted`, `ambiguous`, or `rejected` with legal-move evidence.

- [ ] Write failing tests for malformed AI JSON, invalid piece counts, impossible duplicate kings, one-legal-move reconciliation, ambiguous transitions, and illegal transitions.
- [ ] Run tests and confirm RED.
- [ ] Implement strict runtime validation and legal transition matching.
- [ ] Run tests and confirm GREEN.

### Task 5: Geometry and Arrow Overlay Mapping

**Files:**
- Create: `src/overlay/geometry.js`, `src/overlay/draw.js`
- Test: `src/overlay/geometry.test.js`

**Interfaces:**
- Produces `solveHomography(src4, dst4)`, `projectPoint(H, point)`, `squareCenterToVideo(square, calibration)`.

- [ ] Write failing tests for identity mapping, rectangle scaling, and perspective quadrilateral corner/interior projection.
- [ ] Run tests and confirm RED.
- [ ] Implement 8-parameter homography solver and projection helpers.
- [ ] Run tests and confirm GREEN.
- [ ] Implement canvas arrow drawing using projected square centers.

### Task 6: Cloudflare Worker API and Workers AI Vision Adapter

**Files:**
- Create: `src/worker.js`, `src/api/vision-prompt.js`, `src/api/http.js`
- Test: `src/api/http.test.js`
- Create: `wrangler.jsonc`

**Interfaces:**
- `POST /api/recognize` accepts `{imageDataUrl, previousFen?, sideToMove?}` and returns a strictly shaped vision candidate plus diagnostics.
- `POST /api/explain` accepts validated FEN + normalized engine lines and returns Vietnamese explanation text.
- `GET /api/health` returns build/runtime capability info.

- [ ] Write failing tests for request validation, method rejection, oversized image rejection, AI-unavailable response, and successful adapter normalization using an injected fake AI runner.
- [ ] Run tests and confirm RED.
- [ ] Implement pure request handlers with dependency injection.
- [ ] Run tests and confirm GREEN.
- [ ] Wire Cloudflare `AI` binding in Worker entry.

### Task 7: React Web App, Video Sampling, and Analysis Loop

**Files:**
- Create: `src/web/app.js`, `src/web/styles.css`
- Create: `src/app/video.js`, `src/app/analysis-controller.js`
- Test: `src/app/analysis-controller.test.js`

**Interfaces:**
- `AnalysisController` samples a local video, captures frames, calls `/api/recognize`, validates/reconciles states, runs local engine, and publishes timestamped `AnalysisEvent` objects.

- [ ] Write failing tests for adaptive skip of unchanged frame hashes, accepted legal transition, rejected ambiguous candidate, and engine analysis caching by state hash.
- [ ] Run tests and confirm RED.
- [ ] Implement controller with injectable frame source/recognizer/engine.
- [ ] Run tests and confirm GREEN.
- [ ] Implement dependency-free DOM UI for video/image upload, board/FEN state, start/pause analysis, Top 3 moves, confidence, diagnostics, and timeline.
- [ ] Implement four-corner calibration interaction and synchronized arrow canvas over the video.

### Task 8: Documentation, License Guard, and CI

**Files:**
- Create: `README.md`, `THIRD_PARTY_NOTICES.md`, `models/README.md`, `.gitignore`
- Create: `.github/workflows/ci.yml`
- Create: `scripts/license-guard.mjs`
- Test: `scripts/license-guard.test.mjs`

**Interfaces:**
- `npm run verify` runs tests, typecheck, build, and license guard.

- [ ] Write failing guard tests for prohibited bundled extensions (`.nnue`, unapproved `.onnx`, `.pt`, `.pth`) outside documented fixture allow-list.
- [ ] Run test and confirm RED.
- [ ] Implement guard and project scripts.
- [ ] Run full `npm run verify` and confirm GREEN.
- [ ] Document Cloudflare binding/deploy instructions and current accuracy limitations of general-purpose vision models.

### Task 9: Release Commit and Cloudflare Deployment

**Files:**
- Modify: `wrangler.jsonc` only if deployment requires account-specific binding metadata that is safe to commit.

**Interfaces:**
- GitHub `main` points to the verified source tree.
- Cloudflare Worker `xiangqi-lens` serves production build and `/api/*` endpoints.

- [ ] Re-run `npm run verify` from a clean scratch build directory.
- [ ] Batch-create GitHub blobs/tree/commit from the verified files and fast-forward `main` without force.
- [ ] Verify GitHub commit contents and status.
- [ ] Deploy Worker through Cloudflare API with AI binding.
- [ ] Smoke-test `/api/health` and production HTML through Cloudflare API/route metadata where available.
- [ ] Report exact commit SHA, Worker script name, deployment/version identifier, and any remaining runtime limitation.
