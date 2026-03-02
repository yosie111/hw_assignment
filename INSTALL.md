# Documentation & Port Fixes — Installation Guide

## Copy the following files to your project root (overwrite existing):

```
README.md                     ← Bug 1: localhost:3001 → 3500
src/api/server.js             ← Bug 2: fallback 8000 → 3000, Bug 4: CORS comment 3000 → 3500
client/src/api/client.js      ← Bug 3: comment :8000 → :3000
scripts/start-client.js       ← Bug 5: comment default (3000) → (3500)
implementation_plan.md        ← Bug 6: 5173 → 3500, Bug 7: BASE_URL → SAUCEDEMO_BASE_URL
README_AI_BUGS.md             ← Bug 8: removed all backslash escaping (\#, \**, \_)
```

## Summary

| # | File | Fix |
|---|------|-----|
| 1 | README.md:101 | `localhost:3001` → `localhost:3500` |
| 2 | server.js:71 | fallback `|| 8000` → `|| 3000` |
| 3 | client.js:4 | comment `:8000` → `:3000` |
| 4 | server.js:6 | CORS comment `port 3000` → `port 3500` |
| 5 | start-client.js:2 | comment `default (3000)` → `(3500)` |
| 6 | implementation_plan.md:371,374 | `localhost:5173` → `localhost:3500` |
| 7 | implementation_plan.md:33,45 | `BASE_URL` → `SAUCEDEMO_BASE_URL` |
| 8 | README_AI_BUGS.md | removed 87 lines of `\#`, `\**`, `\_` escaping |

## Note
Bug 2 (server.js fallback port) was also included in the previous bugfix ZIP.
This ZIP contains the full corrected server.js with both Bug 2 and Bug 4 applied.
