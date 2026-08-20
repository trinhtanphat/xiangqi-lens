# Model provenance gate

The production repository intentionally contains no `.onnx`, `.pt`, `.pth`, `.nnue`, `.ckpt`, or `.safetensors` files.

A model may be added only after all of the following are documented:

1. Exact model name/version and cryptographic hash.
2. Source URL and author/organization.
3. Source-code license (if applicable).
4. Weight/data license, checked independently from code license.
5. Explicit commercial-use permission.
6. Explicit redistribution permission for the intended delivery method.
7. Dataset provenance and restrictions when available.
8. Required notices/attribution.
9. A regression fixture demonstrating the model is actually needed and improves the chosen metric.

`scripts/license-guard.mjs` fails CI if an unreviewed model/weight extension is committed.
