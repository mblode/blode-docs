---
"blodemd": patch
---

Fix `npx blodemd` failing with `Cannot find package '@repo/common'`. The CLI build now builds the workspace `@repo/*` packages before running tsdown so their compiled output is inlined into the published bundle, and the npm publish workflow runs the CLI build through turbo so `^build` ordering is respected.
