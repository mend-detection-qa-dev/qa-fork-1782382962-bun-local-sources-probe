# bun-local-sources-probe

Mend SCA detection probe — Tier 2, entry #7.

## Pattern bundle

- `local-file-dep` — root `package.json` declares `"my-utils": "file:./vendor/my-utils"`. Bun copies the package directory into `node_modules` at install time. The lockfile records the protocol verbatim (`file:./vendor/my-utils`) in the `workspaces` section. Expected Mend output: `source="local"`, `editable=false` (or `editable` field absent — absence implies non-editable).
- `local-link-dep` — root `package.json` declares `"my-helpers": "link:./vendor/my-helpers"`. Bun creates a symlink in `node_modules` pointing to `vendor/my-helpers`. The lockfile records the protocol verbatim (`link:./vendor/my-helpers`) in the `workspaces` section. Expected Mend output: `source="local"`, `editable=true`.

## Why bundled

Both `file:` and `link:` map to `source="local"` in the expected Mend dep tree — they share the same top-level classification code path. Bundling them in a single probe concentrates the "Mend flattens file/link distinction" failure into one ReportPortal step rather than two unrelated regressions.

The `editable=true` flag is the only correct differentiator between the two protocols. If Mend emits the same `editable` value for both packages, the bundled-pattern failure mode fires: either:

- Both `editable=true` (Mend treats `file:` as a symlink — wrong), or
- Both `editable=false` (Mend treats `link:` as a copy — wrong), or
- `editable` absent for both (Mend does not distinguish protocols at all — most likely failure mode given that Bun has no UA resolver).

The `portal:` protocol (yarn compat, distinct lockfile shape from `link:`) is NOT covered here — it is reserved for Tier 4 probe #20 (`bun-portal-protocol-probe`).

## Mend config

No `.whitesource` is emitted for this probe. Bun is NOT in Mend's `install-tool` supported list — `scanSettings.versioning` cannot pin a Bun toolchain, and there is no UA pre-step toggle for Bun. Detection is lockfile-driven only: Mend must parse `bun.lock` (text JSONC, Bun 1.2+ format) statically without running `bun install`.

The UA `javascript.md` resolver file (fetched 2026-05-15) has zero mentions of Bun. The UA resolver selection table maps `yarn.lock`, `package-lock.json` / `npm-shrinkwrap.json`, and `pnpm-lock.yaml` — `bun.lock` is not listed. This is the documented limitation referenced in `docs/BUN_COVERAGE_PLAN.md §4`, row "`link:` not distinguished from `file:`".

## Project layout

```
bun-local-sources-probe/
├── package.json                    <- root: file: + link: deps declared
├── bun.lock                        <- JSONC lockfile (Bun 1.2+), both protocols preserved
├── index.ts                        <- minimal stub
├── vendor/
│   ├── my-utils/                   <- file: package (copy on install)
│   │   └── package.json            <- declares "tslib": "^2.8.0"
│   └── my-helpers/                 <- link: package (symlink on install)
│       └── package.json            <- no dependencies
├── expected-tree.json
└── README.md
```

## Editable flag table

| Package | Protocol | Expected `source` | Expected `editable` | Install behavior |
|---|---|---|---|---|
| `my-utils` | `file:./vendor/my-utils` | `local` | `false` | Bun copies the directory into `node_modules` at install time. Changes to `vendor/my-utils` do NOT reflect without reinstall. |
| `my-helpers` | `link:./vendor/my-helpers` | `local` | `true` | Bun creates a symlink. Changes to `vendor/my-helpers` reflect immediately without reinstall. |

If Mend emits the same `editable` value for both rows, or omits `editable` for both, that is the bundled-pattern failure mode.

## Dep tree (expected)

```
bun-local-sources-probe@0.1.0
  my-utils@1.0.0     [source: local, editable: false, protocol: file:]
    tslib@2.8.1      [source: registry]
  my-helpers@1.0.0   [source: local, editable: true,  protocol: link:]
    (no deps)
```

- Direct deps: 2 (`my-utils`, `my-helpers`)
- Transitive deps: 1 (`tslib` via `my-utils`)
- Total: 3

## Key failure modes

| Failure | Symptom in Mend output | Coverage plan ref |
|---|---|---|
| Both local deps `editable=true` | Mend treats `file:` as a symlink | `BUN_COVERAGE_PLAN.md §4`, row "`link:` not distinguished from `file:`" |
| Both local deps `editable=false` | Mend treats `link:` as a copy | Same as above |
| `editable` absent for both | Protocol distinction not modeled | Same as above |
| `my-utils` or `my-helpers` missing entirely | Parser only reads `packages` object, drops `workspaces` entries | `BUN_COVERAGE_PLAN.md §9 Q2` |
| `tslib` missing from tree | Mend does not follow transitive chain through local file: packages | `BUN_COVERAGE_PLAN.md §4` |
| `tslib` reported as direct root dep | Mend misattributes the transitive edge | dep-tree comparator check |
| JSONC parse failure | Empty dep tree (comments / trailing commas crash non-JSONC parser) | `BUN_COVERAGE_PLAN.md §4`, row 1 |

## Resolver notes (UA — javascript.md)

The UA `javascript.md` resolver file (fetched live 2026-05-15) contains zero references to Bun. The resolver selection table covers `yarn.lock`, `package-lock.json` / `npm-shrinkwrap.json`, and `pnpm-lock.yaml` only. `bun.lock` is not listed.

The npm resolver DOES document `file:` protocol handling for `package-lock.json` (`link: true` packages), but this is a different serialization format from Bun's `bun.lock` workspaces structure. The `link:` protocol is not mentioned anywhere in the javascript.md resolver file — it is Bun-specific (yarn-compat).

Because this pattern targets something the resolver file does not mention, the comparator must treat this probe as exploratory (not regression-bound against a documented Mend behavior). A passing result indicates Mend added Bun support; a failing result documents the gap.

## Tracked in

`docs/BUN_COVERAGE_PLAN.md` §11.2 entry #7
