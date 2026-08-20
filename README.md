# XiangqiLens

Commercial-ready Xiangqi video/image analysis for Cloudflare Workers.

XiangqiLens accepts a local video or image, samples frames in the browser, asks Workers AI Vision to reconstruct a candidate board position, validates that candidate with a deterministic Xiangqi rules core, runs a license-safe local alpha-beta engine, and draws Top-N best-move arrows directly over the media without re-encoding the video.

## Current v0.1 vertical slice

- Local video and image upload; media stays in the browser in this release.
- Automatic frame analysis while video plays (about every 2.5 seconds).
- Workers AI vision adapter with modern multimodal request plus a byte-array fallback.
- Strict FEN/king/piece-count validation in the client core.
- Trusted-state reconciliation: a new board is accepted only when it is the same state or uniquely reachable by one legal Xiangqi move from the previous trusted state.
- Full movement rules for king, advisor, elephant, horse, rook, cannon, and pawn plus flying-general/check filtering.
- Built-in deterministic alpha-beta/negamax engine with Top 3 lines, evaluation and PV. It contains no Pikafish or restricted NNUE asset.
- Four-corner perspective calibration and projective arrow overlay.
- Vietnamese AI explanation endpoint based only on validated FEN + engine lines.
- Commercial model/weight license guard in CI.

## Why the engine is in-repo

Pikafish is very strong, but the default commercial build does not bundle Pikafish NNUE weights because their published terms include commercial-use restrictions. XiangqiLens therefore ships a clean-room, lightweight rules/search engine for the first commercial-safe release and keeps the engine boundary replaceable for a future licensed engine.

## Architecture

```text
Browser
  local video/image
       |
       +--> sparse frame JPEG + tiny-frame signature
       |        |
       |        v
       |   POST /api/recognize
       |        |
       |        v
       |   Cloudflare Workers AI vision
       |        |
       |        v
       +--> candidate FEN
                |
                v
        deterministic schema + Xiangqi rules
                |
        unique legal transition?
          yes / unchanged
                |
                v
          trusted board state
                |
                v
       local alpha-beta engine
                |
                v
       Top 3 + PV + evaluation
                |
                v
     projective canvas arrow overlay
```

Workers AI is intentionally non-authoritative: the rules core may reject its output.

## Local verification

Requirements: Node.js 22+ and TypeScript 5.8+ available as `tsc` (or run `npm install` to install the dev dependency).

```bash
npm install
npm run verify
```

`npm run verify` runs Node's built-in test suite, JavaScript type checking, production Worker generation, and the commercial model/weight license guard.

## Build

```bash
npm run build
```

The dependency-free build script embeds the HTML/CSS/browser ES modules into `dist/worker.js`. No Vite/Webpack bundle is required for production.

## Cloudflare deployment

`wrangler.jsonc` declares:

- Worker name: `xiangqi-lens`
- main module: `dist/worker.js`
- Workers AI binding: `AI`

With Wrangler authenticated:

```bash
npm run verify
npx wrangler deploy
```

The ChatGPT implementation workflow can also upload the generated module directly through Cloudflare's Workers API.

## API

### `GET /api/health`

Returns Worker build identity and whether the `AI` binding is available.

### `POST /api/recognize`

```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "previousFen": "optional trusted FEN",
  "sideToMove": "red"
}
```

Returns a vision candidate containing FEN, turn, confidence, orientation, optional normalized board corners, and notes. The browser still validates/reconciles it before trusting the state.

### `POST /api/explain`

Accepts validated FEN plus normalized engine lines and returns a short Vietnamese explanation.

## Accuracy and production limitations

The current vision layer uses a general-purpose multimodal Workers AI model, not a dedicated commercial-cleared Xiangqi detector. It is useful as a functional cloud vision path but will be less reliable than a domain-specific detection/classification model on motion blur, occlusion, unusual piece skins, or strong camera perspective. The fail-closed trusted-state architecture is specifically designed so a later commercial-cleared ONNX model can replace the vision adapter without replacing the rules, engine, timeline, or overlay layers.

The current alpha-beta engine is intentionally lightweight. It predicts strong legal moves and principal variations but is not presented as equivalent in strength to Pikafish.

## Security/privacy

- v0.1 does not upload the original video to Cloudflare storage; only sampled JPEG frames are sent to `/api/recognize` when analysis is requested.
- No raw media is logged by application code.
- The Worker enforces a per-frame payload size limit and security headers.
- No automated clicking or anti-cheat circumvention is implemented.

## Commercial licensing

The project is source-visible but all rights are reserved unless the copyright holder grants additional permission. See `LICENSE` and `THIRD_PARTY_NOTICES.md`. Third-party model/binary licenses are evaluated independently from source licenses.
