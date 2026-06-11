# Changelog

All notable changes to this project are documented here.

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
