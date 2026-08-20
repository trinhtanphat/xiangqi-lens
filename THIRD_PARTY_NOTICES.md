# Third-Party Notices

XiangqiLens v0.1 intentionally ships without third-party Xiangqi engine binaries, NNUE weights, ONNX/PT model weights, or copied source from the research/reference repositories below.

## Architecture/research references

- `dffge552/xiangqi-pwa-offline` (Xiangqi Arena): studied for browser-side ONNX recognition, FEN flow, PWA architecture, and WebAssembly engine integration. Its repository declares MIT for its source, but model assets are treated as separate artifacts and are not bundled here.
- `DuyLeTran/DeepXiangQi`: studied for YOLO/pose board localization, homography, and reconstruction concepts. Its README asks users to contact the author before commercial use; no source or weights from it are bundled here.
- `sunqinji666-dotcom/xiangqi-pilot`: studied for trusted-state tracking, incremental move reconciliation, and fail-closed safety patterns. No source is copied here.
- Pikafish/Pikafish-WASM: studied for UCI/engine architecture. No Pikafish binary, source, or NNUE file is bundled. Pikafish source is GPLv3 and its NNUE weights have additional commercial-use terms; these remain outside the default commercial build.

## Hosted service

Cloudflare Workers AI is invoked as a hosted inference service through the configured `AI` binding. XiangqiLens does not redistribute Cloudflare-hosted model weights.

Before adding any new model or binary, record its source URL, exact version/hash, license text, commercial-use permission, redistribution permission, and attribution obligations in this file and in `models/README.md`.
