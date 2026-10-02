# Changelog

## v5.1.0 - Browser core, batches, and lossless item tools

Release date: 2026-10-02

### Added
- Browser-safe `/core` entry for local codecs, validation, comparison, diagnostics and wire editing; explicit `/steam` entry for authenticated APIs. Existing root and historical `dist/*` imports remain available.
- Mixed-link `inspectBatch` with per-input outcomes, completion progress, canonical duplicate suppression, and cancellation through the existing Steam queue.
- Separate wire and versioned weapon/paint/wear validation, with structured diagnostics and an explicit permissive mode for unknown catalog entries.
- Semantic item diffs respecting float32 values, ordered attachments/names, and missing/zero/empty distinctions.
- Immutable `InspectDocument` editing that preserves unedited protobuf segments, opaque bytes and unknown fields, including nested attachment fields. Strict inspect-link diagnostics check checksums without changing legacy analyzer APIs.
- Shared independently encoded fixture corpus with node-cs2: uint64/float32 boundaries, repeated Unicode names, stickers, charms, transformations, opaque bytes, unknown fields and malformed input.
- Packed consumer CI for Node 22.12, 24 and 26, root/deep exports, CLI, declarations, browser-only typing and a real browser bundle.

### Changed and fixed
- Minimum node-cs2 dependency is 2.6.0, published before this release, for request cleanup, serialization, precise decoding and structured lifecycle errors.
- Added raw `ProtobufReader.decodeItemData`; reject invalid known wire types, forbidden field zero and overflowing legacy link IDs. Large protobuf tags encode without signed truncation.
- Steam inspection errors retain the upstream error message and structured cause. Batch resolver failures receive structured codes; complete encoded messages respect the 10 MiB limit. Versioned game data includes glove definitions and wear bounds from the existing pinned snapshot.

### Migration
Existing root imports, method overloads and analyzer behavior remain compatible. Browser applications should switch local operations to `cs2-inspect-lib/core`. Strict document decoding rejects bad checksums which the historical masked decoder may accept. Review node-cs2's lifetime quarantine after a sent request has an uncertain result; reconnecting does not authorize a retry. A cancelled sent read retains its queue slot until its response or timeout. The item-tools guide defines exact preservation/resource limits: edited links are not promised byte-identical.

Live Steam/GC behavior remains unverified. No authenticated mutation or sanitized replay was available; synthetic wire fixtures and successful sends do not establish server acceptance.

## v5.0.0 - Protocol, weapon data and reliability

Release date: 2026-09-27

### Migration
- Review corrected default glove IDs: T is 5028 and CT is 5029.
- Numeric inputs must fit their protobuf ranges; use bigint for uint64 IDs beyond the safe integer range.
- Validation now applies by default in direct encoding/decoding helpers. Custom-name limits count UTF-8 bytes.
- Existing flat paint constants remain available; use WeaponPaints and WeaponEconItem for weapon-specific typing.

### Added
- Per-weapon `WeaponPaints` maps with one name per paint index, `PaintFor<W>` paint types and correlated `WeaponEconItem<W>` item types. Existing flat WeaponPaint constants remain compatible.
- Refreshed WeaponPaint and WeaponType from a pinned ByMykel snapshot: 2,126 skins, 75 weapon definitions and 2,300 paint names including aliases.
- Readable Doppler phase and accent-normalized paint aliases, while retaining all historical paint names and values.
- Weapon-aware `getPaintName(index, weapon)` and numeric defindex support in `getPaintsByWeapon`.
- Offline catalog snapshot, generation checks and exhaustive weapon/paint pair coverage tests.
- Hand-written VitePress documentation with local search, task-oriented guides, CLI examples and protocol migration notes.
- September 25, 2026 inspection fields from node-cs2 2.5.0: repeated `customnames`, uint32 `pet_food_expiration_date`, and binary `blobdata`, including Steam result conversion and validation.
- Decoding for checksum-valid nonzero XOR-mask inspect tokens, retaining historical zero-mask and unprefixed input support.

### Changed
- Match Steam inspection responses by asset through node-cs2's Promise API; observe late upstream rejections instead of leaving them unhandled.
- Recover from empty expired queues, reject pending work on disconnect, cancel queue delays and guard old workers/GC events across reconnects.
- Reject non-finite/fractional/out-of-range numeric fields, unsafe numeric item IDs and overflowing protobuf varints; unknown varints can now span uint64.
- Apply default validation in direct decoders and item encoding, honor config-only inspect options, and propagate configured URL/name limits.
- Measure custom-name limits in UTF-8 bytes consistently. Inputs that previously encoded corrupt values or undecodable names now fail early.
- Generated flat paint enums now express shared values as aliases, avoiding duplicate numeric initializers while preserving reverse mappings.
- Corrected reversed default glove definitions: `GLOVES_T = 5028`, `GLOVES_CT = 5029`. Consumers relying on the old values must adjust.
- Fixed generation to cover weapon/paint pairs instead of deduplicating paint IDs across weapons; generation now refreshes both enums using Node/npm without requiring Bun.
- `getPaintIndex` no longer returns a string for numeric enum keys; weapon searches use exact names and pattern searches normalize accents.
- Updated direct dependencies to latest compatible stable releases and refreshed npm/Bun lockfiles. TypeScript stays on 6.0.3: latest TypeScript ESLint and ts-jest peer ranges exclude 7.x.
- Preserved `customname` as the last decoded name. Explicit `customnames` takes precedence when encoding, including an empty array.
- Replaced TypeDoc and its configuration. GitHub Pages now deploys the built VitePress site, with package tests and lint required before deployment and Node 24 in CI.
- Applied default validation and URL-length settings to the top-level URL creation helper, matching instance behavior.
- Fixed protobuf float reads from byte-array views with nonzero offsets.

### Known limitations
- Offline tests do not cover live Steam authentication or GC availability.
- Latest stable VitePress 1.6.4 still includes audit findings through Vite/esbuild; latest steam-user includes findings through adm-zip. Compatible audit fixes were applied; no unsupported major overrides were introduced for these dependencies.
- Legacy zero-mask/unprefixed decoding still does not authenticate checksums.


## v4.1.0 - Dependency and Paint Data Update

Release date: 2026-07-12

### Changed
- Updated `node-cs2` to `2.3.1` with the latest GameTracking-CS2 protobuf definitions.
- Updated development dependencies: `@types/node@25.9.5`, `@typescript-eslint/*@8.63.0`, `eslint@10.7.0`, and `typedoc@0.28.20`.
- Added `scripts/generate-weapon-paints.ts` and `npm run generate:weapon-paints` for refreshing paint data from ByMykel CSGO-API.

### Data
- Regenerated `WeaponPaint` from the current `skins.json` dataset.
- Added 34 new paint indices (2,073 → 2,107 entries), including `AK_47_AUTOEXEC`, `AWP_BLACK_BOX`, `GLOCK_18_GHOST_PROTOCOL`, and `M4A1_S_FATAL_GLITCH`.

### Validation
- Verified protobuf reader/writer fields remain aligned with `CEconItemPreviewDataBlock` (fields 1–23).
- Verified Steam result conversion remains compatible with `node-cs2@2.3.1` `ItemInfo` types.
- Verified `npm run build`, `npm run lint`, and `npm test` (320 tests).

## v4.0.0 - Dependency, Protobuf, and Paint Data Refresh

Release date: 2026-06-11

### Breaking Changes
- Raised the supported Node.js runtime to `>=22.12.0` because the latest `commander@15` requires it.

### Changed
- Updated runtime and development dependencies to their latest versions, including `commander@15`, `node-cs2@2.3.0`, `jest@30`, `eslint@10`, `typescript@6`, and `typedoc@0.28`.
- Added an npm override for `steam-appticket@2.0.1` so the Steam dependency chain resolves to patched `protobufjs@7.6.3`.
- Migrated ESLint to flat config and added a dedicated `tsconfig.test.json` for Jest ambient types.
- Updated README badges and package metadata for the new Node.js and TypeScript baselines.

### Fixed
- Corrected `CEconItemPreviewDataBlock.entindex` encoding/decoding to protobuf `int32` wire semantics instead of ZigZag `sint32`.
- Aligned Steam inspection result conversion with the current `node-cs2@2.3.0` preview fields, including `variations`, `petindex`, `style`, and `upgrade_level`.
- Removed the stale local `node-cs2` declaration shim now that the package ships its own current TypeScript declarations.
- Fixed CLI integration tests to pass arguments without shell splitting and to use declared test tooling.
- Updated the exported `VERSION` constant to match `package.json`.

### Data
- Regenerated `WeaponPaint` from the current ByMykel CSGO-API `skins.json` dataset.
- Expanded paint coverage from 1,824 to 2,073 entries, including recent paint indexes such as `AK_47_THE_OLIGARCH`, `AWP_THE_END`, `M4A4_FULL_THROTTLE`, and `DRIVER_GLOVES_WAVE_CHASER`.

### Validation
- Verified `npm run build`, `npm run lint`, `npm test -- --runInBand`, and `npm audit --audit-level=low`.

## v3.2.2 - Test Alignment Hotfix
- **Fixed error message**: Restored missing "instead" in unmasked URL error for `decodeMaskedUrl()` / `decodeInspectUrl()`
- **Fixed Steam client tests**: Updated 6 test assertions to match debug-guarded logging introduced in v3.2.1 (timestamped format, `console.log` via `debugLog()`, `enableLogging` flag)

## v3.2.1 - Code Cleanup & Optimizations
- **Eliminated URL Parsing Duplication**: `UrlAnalyzer` class now delegates to pure functions in `url-parser.ts`, removing ~200 lines of duplicated parsing/formatting logic
- **Centralized Constants**: `INSPECT_BASE` constant defined once and imported everywhere (was duplicated in 3 files)
- **Consolidated URL Dispatch**: Extracted shared `decodeMaskedFromAnalyzed()` helper, removing repeated analyze-check-decode patterns across `index.ts`
- **Deduplicated Promise Timeout**: Extracted `waitForReady()` helper in Steam client, eliminating two identical promise-with-timeout blocks
- **CRC32 Performance**: Pre-computed CRC32 lookup table at module load instead of regenerating the 256-entry table on every `createInspectUrl()` call
- **Debug-Guarded Logging**: All `console.log`/`error`/`warn` calls in Steam client and manager now respect the `enableLogging` config flag via `debugLog()`
- **Fixed `processRarity()` Bug**: Unknown string rarity values now throw `EncodingError` instead of silently returning `STOCK` (0)
- **Fixed `cleanExpiredItems()` Performance**: Replaced O(n²) filter+indexOf+splice pattern with single O(n) reverse-iteration pass
- **Fixed Redundant Hex Validation**: Removed unreachable `>2000` length check that shadowed the correct `>4096` check
- **Removed Dead Code**: No-op ternary and deprecated `substr()` replaced with `slice()`
- **~330 lines removed** with zero public API changes - all existing tests pass

## v3.2.0 - Major Performance & API Improvements
- **True Static Methods**: All static convenience functions now use pure functions with zero instance creation
- **Optimized `inspectItem()`**: Uses static methods for masked URLs, requires explicit Steam client for unmasked URLs
- **Enhanced Error Messages**: Actionable suggestions, troubleshooting steps, and alternative solutions in all errors
- **Pure Function Extraction**: URL parsing and formatting logic extracted to pure functions for maximum performance
- **Performance Verification**: Comprehensive test suite verifying no instance creation in static methods
- **Explicit Dependencies**: `inspectItem()` now requires explicit SteamClientManager for unmasked URLs (no auto-initialization)
- **Better API Clarity**: Clear separation between optimized static methods and instance methods
- **Helper Methods**: Added `getSuggestion()`, `getAlternatives()`, `getSteps()` to error classes
- **Full Test Coverage**: 16 new tests verifying optimization claims and error message improvements
- **Backward Compatible**: All existing code continues to work with improved performance
- **Protobuf Updates**: Added support for `wrapped_sticker` field in Sticker message (CS2 protobuf update)

## v3.1.0 - Performance & Clarity Update
- **Performance Optimizations**: Added static methods for up to 90% performance improvement
- **Direct Protobuf Access**: `decodeMaskedData()` for fastest possible decoding
- **Clear Method Names**: `decodeMaskedUrl()` and `inspectItem()` for better clarity
- **Static Functions**: `analyzeUrl()`, `requiresSteamClient()`, `isValidUrl()` without instance creation
- **Method Selection Guide**: Clear guidance on when to use each method for optimal performance
- **Enhanced Documentation**: Comprehensive performance tiers and migration guide
- **Backward Compatible**: All old methods still work with deprecation notices

## v3.0.6
- **Updated README.md**

## v3.0.5
- **WeaponPaint Enum**: Comprehensive enum with 2,000+ CS2 skin definitions generated from skins.json
- **Smart Naming**: Weapon-specific paint naming (e.g., `AK_47_FIRE_SERPENT`, `AWP_DRAGON_LORE`, `KARAMBIT_DOPPLER`)
- **Type Safety**: Updated `EconItem.paintindex` to accept `WeaponPaint | number` for full TypeScript support
- **Utility Functions**: Added `getPaintName()`, `getPaintIndex()`, `isWeaponPaint()`, `getAllPaintNames()`, `getAllPaintIndices()`
- **Comprehensive Coverage**: All weapon categories including rifles, pistols, knives, gloves, and SMGs
- **Auto-Generation**: Script to regenerate enum from updated skins.json data
- **Full Testing**: Comprehensive tests covering all WeaponPaint functionality
- **Professional Documentation**: Updated README with WeaponPaint examples and API reference
- **Backward Compatible**: Maintains compatibility with numeric paint indices

## v3.0.4
- Enhanced documentation and professional README
- Improved error handling and validation
- Updated TypeScript definitions
- Performance optimizations

## v3.0.3
- Replaced the older `globaloffensive` integration with `node-cs2`.
- Added TypeScript declarations for `node-cs2` and `steam-user`.
- Updated examples, tests, README installation instructions, and URL testing/debug output for the new dependency.

## v3.0.2
- Removed remaining server-address references from tests and release metadata.

## v3.0.1
- Removed unused Steam server address functionality from CLI options, types, configuration, metadata, and documentation.
- Removed related `connectToServer` methods and logic.

## v3.0.0
- Established the v3 release line.

## v2.2.0
- Added 256 comprehensive tests across major components.
- Added CLI integration tests with file I/O coverage.
- Expanded Steam client, Steam client manager, protobuf reader, and error scenario tests.
- Raised overall test coverage from 73% to 88.41%.

## v2.1.0
- Steam Client Integration: Full support for unmasked URLs
- Debug Mode: Comprehensive logging for troubleshooting
- Enhanced Test Suite: Individual test functions with debug capabilities
- Connection Reuse: Intelligent Steam client connection management
- Extended CLI: Steam client commands and debug options

## v2.0.0
- Complete rewrite with enhanced error handling
- Added support for all new CS2 protobuf fields
- Comprehensive input validation
- CLI tool with full feature set
- 100% TypeScript with full type definitions
