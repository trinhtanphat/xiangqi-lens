# XiangqiLens — Commercial Cloudflare Architecture Design

**Date:** 2026-08-20
**Status:** Approved direction, implementation pending spec review
**Repository:** `trinhtanphat/xiangqi-lens`

## 1. Product goal

XiangqiLens is a commercial-ready web application that accepts Xiangqi video, screenshots, or camera input, reconstructs the board state, validates moves against Xiangqi rules, analyzes positions through a pluggable engine, and renders best-move arrows and evaluation overlays synchronized with video playback.

Primary experience:

1. User uploads a video or image.
2. XiangqiLens detects and calibrates the board.
3. The system tracks board-state changes instead of re-running full recognition on every frame.
4. Each candidate state transition is reconciled against legal Xiangqi moves.
5. Engine analysis produces top moves and evaluations.
6. The player overlays arrows, evaluation, confidence, and move timeline at the correct timestamps.

The first production target is Cloudflare Workers with Cloudflare-native storage and durable processing where it provides clear value.

## 2. Commercial and licensing constraints

Commercial use is a first-class requirement. The default distribution must not include assets, model weights, engine binaries, datasets, or code whose terms prohibit commercial use or impose incompatible redistribution requirements.

Rules:

- Third-party projects may be studied for architecture, algorithms, file formats, tests, and implementation ideas.
- Code is copied only when its license is verified compatible with the project's chosen distribution model and all required notices are preserved.
- Models and weights are treated independently from source-code licenses.
- Pikafish is integrated behind an engine adapter. The default commercial build must not bundle NNUE weights with non-commercial restrictions.
- GPL components, if ever distributed with the product, must be isolated and handled in a way that satisfies GPL obligations. The commercial SaaS core must not silently absorb GPL source into proprietary modules.
- Recognition models must have explicit commercial-use provenance before inclusion in production artifacts.
- A `THIRD_PARTY_NOTICES.md` and machine-readable dependency/license audit are required before release.

## 3. Sources studied and lessons adopted

### Xiangqi Arena / `dffge552/xiangqi-pwa-offline`

Useful patterns:

- Browser-side ONNX inference.
- Separate piece detection and classification paths for digital boards.
- Board recognition to FEN.
- PWA/offline-first operation.
- Browser-side engine integration through WebAssembly.

We use the architectural lessons, but every model and copied implementation must pass the commercial-license gate.

### DeepXiangQi / `DuyLeTran/DeepXiangQi`

Useful patterns:

- Board-corner detection.
- Homography/perspective correction.
- Multiple visual signals rather than a single detector.
- Rule-based correction of impossible board reconstructions.

DeepXiangQi itself is treated as research/reference material unless individual assets are separately cleared for commercial use.

### XiangqiPilot / `sunqinji666-dotcom/xiangqi-pilot`

Useful patterns:

- Maintain a trusted board state.
- Detect incremental changes and reconcile them with legal moves.
- Do not trust one visual frame as authoritative when temporal and rules-based evidence disagree.
- Fail closed on stale frames, ambiguous moves, calibration drift, and state inconsistency.

### Pikafish and Pikafish WASM

Useful patterns:

- UCI-style engine boundary.
- Strong Xiangqi analysis.
- Browser/WebAssembly viability.

Commercial distribution must respect source and NNUE licensing independently. The XiangqiLens engine contract is intentionally implementation-agnostic.

## 4. Architectural principles

1. **Cloudflare-first orchestration, browser-first heavy inference.** Workers coordinate storage, auth, jobs, metadata, and delivery. Expensive repeated CV and engine analysis should run in the browser when practical to reduce server cost and Worker CPU pressure.
2. **Trusted-state tracking.** Full recognition is the cold path. Incremental board-change tracking is the hot path.
3. **Rules are a validator, not decoration.** Visual inference produces candidates; the Xiangqi rules core decides whether a transition is legal and unique.
4. **Adapters around replaceable technology.** CV models, engine, storage, and optional Workers AI are replaceable implementations behind stable interfaces.
5. **Confidence-aware fail-closed behavior.** Ambiguous board reconstruction is surfaced explicitly instead of silently generating a confident arrow.
6. **Deterministic analysis artifacts.** Results are stored as time-indexed JSON so overlays can be replayed without recomputing the video.
7. **Commercial license safety.** No opaque model/binary enters production merely because it is technically convenient.

## 5. System architecture

### 5.1 Web application

Recommended stack:

- TypeScript.
- React + Vite for the application UI.
- Cloudflare Workers Static Assets for deployment.
- Web Workers for CPU-heavy browser tasks.
- ONNX Runtime Web for commercial-cleared ONNX models.
- Canvas 2D initially for overlays; WebGL/WebGPU only where profiling proves a benefit.

Main screens:

- Upload/import.
- Calibration and recognition review.
- Video analysis workspace.
- Image/position analysis.
- Job history.
- Settings/model/engine diagnostics.

### 5.2 Worker API

Responsibilities:

- Session/auth boundary.
- Signed/direct upload creation.
- R2 object metadata and access control.
- Analysis job creation and status.
- Durable workflow orchestration.
- Result ingestion from trusted clients.
- Validation of result schemas and ownership.
- Static app delivery.
- Rate limiting and abuse controls.

The Worker does not synchronously run long video analysis loops.

### 5.3 Storage

**R2** stores:

- Original uploads.
- Optional normalized media.
- Extracted reference frames when server extraction is used.
- Analysis result JSON.
- Debug artifacts when explicitly enabled.

**D1** stores small relational metadata:

- users/sessions if required by the selected auth strategy.
- videos.
- analysis jobs.
- analysis versions.
- model metadata.
- timestamps, status, ownership, and artifact references.

Large frame data and model files are not stored in D1.

### 5.4 Media processing

Use Cloudflare Media Transformations when server-side frame extraction is useful, especially for:

- thumbnails.
- sparse reference frames.
- fallback re-recognition.
- normalized short clips.

The default client path uses the browser video element plus frame extraction to avoid uploading/generated-frame fan-out when unnecessary.

### 5.5 Durable analysis orchestration

Cloudflare Workflows coordinate server-side multi-step tasks that need retries or durable state, for example:

1. register upload.
2. validate metadata.
3. create reference frame(s).
4. optional Workers AI fallback classification.
5. persist status.
6. finalize analysis artifact.

Browser-only analysis can still report durable progress/results through the Worker API.

### 5.6 Workers AI role

Workers AI is optional and not the authoritative Xiangqi recognizer.

Appropriate uses:

- fallback visual description when confidence is low.
- diagnostics.
- natural-language explanations of already validated engine output.
- future coaching features.

It must not overwrite a trusted board state without rule reconciliation.

## 6. Computer-vision pipeline

### 6.1 Board localization

Inputs:

- image frame.
- previous calibration state when available.

Output:

- board quadrilateral.
- 9x10 logical grid transform.
- orientation estimate.
- confidence.

Methods:

- detector/keypoint model when commercially cleared.
- geometric line/grid fallback.
- manual four-corner calibration as a guaranteed recovery path.

### 6.2 Perspective normalization

A homography maps camera coordinates to a canonical Xiangqi board coordinate system. Overlay rendering uses the inverse mapping so arrows remain aligned to the original video.

### 6.3 Piece recognition

Cold path:

- detect occupied intersections.
- classify piece identity and color.
- construct candidate board state.
- validate counts and rule invariants.

Hot path:

- compare stable sampled frames.
- identify changed intersections.
- generate candidate legal moves from the trusted state.
- use pixel evidence to choose among candidates.
- update trusted state only when the move is uniquely and confidently resolved.

### 6.4 Temporal consensus

A move is not committed from a hand-obscured or transition frame. The tracker waits for stability across a configurable number of samples and uses hysteresis to avoid oscillating between states.

### 6.5 Recovery

Full recognition is triggered when:

- calibration drifts.
- more intersections change than a legal move can explain.
- no legal transition matches visual evidence.
- confidence remains below threshold.
- the user seeks into an unrelated point in the video.

The UI exposes recovery status and allows manual correction.

## 7. Xiangqi core

A framework-independent TypeScript package provides:

- board representation.
- FEN parse/serialize.
- side-to-move.
- legal move generation.
- move application/undo.
- check, flying-general, checkmate/stalemate validation.
- deterministic move notation conversion.
- board-state hashing.
- transition reconciliation.

This package has no UI, Cloudflare, ONNX, or engine dependency.

The trusted-state tracker depends on this package, not vice versa.

## 8. Engine architecture

Interface example conceptually:

- initialize.
- setPosition(FEN, moveHistory?).
- analyze({ depth | nodes | movetime, multiPV }).
- cancel().
- dispose().

Implementations may include:

- a commercially cleared local WASM engine.
- a user-supplied compatible UCI engine where the browser/runtime allows it.
- a future hosted analysis service.

Pikafish-specific code is contained in its own adapter/package and is never assumed by the product core.

Analysis output is normalized to:

- best move.
- principal variation.
- score in centipawn-like normalized units or mate distance.
- search metadata.
- engine identity/version.

## 9. Video analysis data model

A versioned analysis artifact contains:

- video id.
- schema version.
- recognition model version.
- engine version.
- calibration keyframes.
- trusted-state snapshots.
- detected moves.
- confidence and diagnostic evidence.
- analysis entries keyed by timestamp/state hash.

Each move entry includes at least:

- timestamp start/end.
- source square.
- destination square.
- resulting FEN/state hash.
- recognition confidence.
- top engine lines.

The UI renders overlays from this artifact without modifying or re-encoding the source video.

## 10. Performance strategy

- Never infer every video frame by default.
- Start with a low sampling rate and adaptive scene/board-change detection.
- Increase sampling temporarily around detected state transitions.
- Use Web Workers to keep UI responsive.
- Cache recognition by frame hash and engine analysis by board-state hash + engine settings.
- Reuse homography until drift detection invalidates it.
- Deduplicate repeated positions.
- Lazy-load ONNX runtime, model weights, and engine WASM only when analysis is requested.
- Prefer overlay metadata to burned-in video rendering.

Initial performance objective on a modern desktop browser:

- responsive UI during analysis.
- no unbounded main-thread loop.
- processing work proportional to board changes rather than raw FPS.

## 11. Security and privacy

- Uploaded videos are private by default.
- Object access uses authenticated Worker routes or signed URLs.
- Validate content type and enforce upload size/duration policy.
- Never trust client-provided ownership ids.
- Analysis uploads are schema validated and tied to the authenticated job.
- Debug frames are opt-in and have retention policy.
- Secrets live in Cloudflare secrets/bindings, never in git.
- Add Turnstile/rate limiting if public anonymous upload is enabled.

## 12. Error handling

Errors are classified into stable machine-readable codes:

- upload failure.
- unsupported media.
- board not found.
- calibration ambiguous.
- recognition low confidence.
- illegal/ambiguous transition.
- engine unavailable.
- analysis cancelled.
- artifact persistence failure.

The UI provides recovery actions instead of generic failure messages.

## 13. Observability

Track:

- Worker request/error rates.
- job stage durations.
- model load/inference time.
- number of cold recognitions vs incremental transitions.
- recovery frequency.
- ambiguous-transition rate.
- engine latency.
- client/browser capability failures.

No raw user media is logged.

## 14. Testing strategy

### Unit tests

- Xiangqi rule engine and FEN round trips.
- legal transition reconciliation.
- coordinate transforms/homography helpers.
- confidence/state-machine behavior.
- analysis artifact schema.
- engine adapter contract.

### Golden fixtures

A license-safe fixture set includes synthetic and explicitly permitted screenshots/frames with expected:

- board corners.
- orientation.
- piece positions.
- FEN.
- move deltas.

### Integration tests

- upload registration.
- R2 metadata flow.
- D1 job lifecycle.
- Worker API schema/auth checks.
- Workflow retry/idempotency behavior.
- client analysis result submission.

### Browser tests

Playwright covers:

- upload flow.
- calibration.
- video seek + synchronized arrow overlay.
- pause/resume/cancel.
- low-confidence recovery.

### CI

Every push to `main` must run typecheck, lint, unit tests, and build. Browser/integration suites may be split by cost but release tags require the complete suite.

## 15. Repository structure

Proposed monorepo:

```text
/
├── apps/
│   └── web/                  # React UI + Worker entry
├── packages/
│   ├── xiangqi-core/         # rules, FEN, moves, hashing
│   ├── vision-core/          # geometry, tracking, recognition contracts
│   ├── engine-core/          # engine contract + normalized analysis
│   ├── analysis-schema/      # shared schemas/types
│   └── ui-overlay/           # board/video overlay primitives
├── workers/
│   └── analysis-workflow/    # durable Cloudflare workflow
├── models/
│   └── README.md             # provenance rules; no unapproved weights
├── tests/
│   └── fixtures/             # license-safe fixtures
├── docs/
│   ├── architecture/
│   ├── licensing/
│   └── superpowers/specs/
├── wrangler.jsonc
├── package.json
├── pnpm-workspace.yaml
├── THIRD_PARTY_NOTICES.md
└── README.md
```

## 16. Delivery phases

### Phase 1 — Foundation

- workspace/tooling.
- Worker static app/API skeleton.
- Xiangqi core with tests.
- analysis schema.
- basic manual board UI.
- CI.

### Phase 2 — Image recognition

- board calibration.
- perspective mapping.
- pluggable recognition adapter.
- image -> validated state -> FEN.
- manual correction and confidence UI.

### Phase 3 — Engine + overlays

- engine adapter.
- position analysis.
- top-N arrows and evaluation display.
- engine cancellation/cache.

### Phase 4 — Video tracking

- video upload/playback.
- adaptive sampling.
- trusted-state temporal tracker.
- timeline artifacts.
- synchronized animated arrows.

### Phase 5 — Cloudflare durable pipeline

- R2/D1 bindings.
- Media Transformations fallback/reference frames.
- Workflows.
- production auth/rate limits/observability.

### Phase 6 — Production hardening

- full license audit.
- performance profiling.
- browser compatibility.
- failure recovery.
- security review.
- deployment documentation.

## 17. Acceptance criteria for first production-capable release

A release is production-capable when:

1. A user can upload a supported Xiangqi video.
2. The board can be calibrated automatically or manually.
3. The application creates a validated board state and tracks legal moves over time.
4. Ambiguous visual transitions are not silently committed.
5. The application can analyze validated states through a replaceable engine adapter.
6. The video player displays synchronized arrows and evaluation data without re-encoding the source video.
7. Analysis artifacts are versioned and replayable.
8. Cloudflare deployment is reproducible from git with documented bindings/migrations.
9. CI is green.
10. No bundled third-party model, weight, engine binary, dataset, or copied code lacks verified commercial-compatible provenance and required notices.

## 18. Explicit non-goals for the initial release

- Automated clicking or interaction with third-party Xiangqi game services.
- Circumventing anti-cheat systems or platform restrictions.
- Re-encoding full videos merely to burn in arrows.
- Training a large proprietary vision model before the tracking architecture is proven.
- Treating a general-purpose vision LLM as the authoritative rules/state engine.

## 19. Implementation decision

Proceed with a Cloudflare-first TypeScript monorepo, browser-side adaptive CV/tracking, a framework-independent Xiangqi rules core, pluggable recognition and engine adapters, R2/D1/Workflows for durable server concerns, and metadata-based video overlays. Commercial-license safety is a release gate, not a post-release cleanup task.
