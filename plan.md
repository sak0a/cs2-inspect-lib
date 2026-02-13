# Hotfix Plan: v3.2.2 - Fix Steam Integration Test Failures

## Root Cause Analysis

### Failure 1: `tests/steam-integration.test.ts` line 141
- **Test expects:** `"...Use inspectItem() instead for Steam client inspection."`
- **Source produces:** `"...Use inspectItem() for Steam client inspection."` (missing the word **"instead"**)
- **Root cause:** In v3.2.1 code cleanup, the error message in `src/index.ts:53` was changed but the test was not updated to match.
- **Fix:** Update the error message in `src/index.ts:53` to include the word "instead" so it matches the intended behavior described in the test.

### Failure 2: `tests/steam-client.test.ts` — 6 failing console spy tests
All 6 failures share the same root cause. The tests expect direct `console.log()` / `console.error()` calls with plain `[Steam Manager]` prefix, but v3.2.1 changed all logging in `SteamClientManager` to go through `debugLog()`, which:
1. Only logs when `this.config.enableLogging === true` (tests don't set this)
2. Prepends a timestamp: `[${timestamp}] [Steam Manager] ${message}` (tests expect `[Steam Manager] ...` without timestamp)
3. Uses `console.log()` for everything (tests at line 679 spy on `console.error`)

Specific failing tests:

| Line | Test | Expected console call |
|------|------|-----------------------|
| 641 | should not initialize when disabled | `console.log('[Steam Manager] Steam client disabled in configuration')` |
| 653 | should not initialize without credentials | `console.warn('[Steam Manager] Steam credentials not provided...')` |
| 694 | should handle initialization errors | `console.error('[Steam Manager] Failed to initialize Steam client:', testError)` |
| 717 | should successfully initialize with valid credentials | `console.log('[Steam Manager] Steam client initialized successfully')` |
| 994 | should disconnect without error when no client | `console.log('[Steam Manager] Steam client disconnected')` |
| 1013 | should disconnect client and reset state | `console.log('[Steam Manager] Steam client disconnected')` |

**Fix:** Update the 6 tests in `tests/steam-client.test.ts` to match the actual `debugLog()` behavior:
- Set `enableLogging: true` in manager configs for these tests so `debugLog` fires
- Match the timestamped log format `[<timestamp>] [Steam Manager] <message>` using `expect.stringContaining('[Steam Manager] ...')`
- Change `console.error` spy to `console.log` spy (line 679) since `debugLog` always uses `console.log`
- Remove the error object argument check at line 694 (debugLog serializes the error to JSON, doesn't pass it as a second arg)

---

## Implementation Steps

### Step 1: Fix error message in `src/index.ts`
- **File:** `src/index.ts:53`
- **Change:** Add the word "instead" to the error message
- **From:** `'This is an unmasked URL (market/inventory link). Use inspectItem() for Steam client inspection.'`
- **To:** `'This is an unmasked URL (market/inventory link). Use inspectItem() instead for Steam client inspection.'`

### Step 2: Fix 6 tests in `tests/steam-client.test.ts`

**Test 1 — "should not initialize when disabled" (lines 634-644):**
- Add `enableLogging: true` to the config: `new SteamClientManager({ enabled: false, enableLogging: true })`
- Change assertion to: `expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Steam Manager] Steam client disabled in configuration'))`

**Test 2 — "should not initialize without credentials" (lines 646-656):**
- Add `enableLogging: true` to the config: `new SteamClientManager({ enabled: true, enableLogging: true })`
- Change spy from `console.warn` to `console.log` (debugLog uses console.log)
- Change assertion to: `expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Steam Manager] Steam credentials not provided - unmasked URL support disabled'))`

**Test 3 — "should handle initialization errors" (lines 678-697):**
- Add `enableLogging: true` to the config
- Change spy from `console.error` to `console.log` (debugLog uses console.log)
- Change assertion to check for two console.log calls:
  - `expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Steam Manager] Failed to initialize Steam client'))`
  - Also expect a `[Steam Manager DATA]` log with the error details
- Rename spy variable from `consoleErrorSpy` to `consoleSpy` for consistency

**Test 4 — "should successfully initialize with valid credentials" (lines 699-720):**
- Add `enableLogging: true` to the config
- Change assertion to: `expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Steam Manager] Steam client initialized successfully'))`

**Test 5 — "should disconnect without error when no client" (lines 990-997):**
- The default `manager` is created at the top of the describe block. We need to set `enableLogging: true` on it, or create a new manager with logging enabled.
- Change assertion to: `expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Steam Manager] Steam client disconnected'))`

**Test 6 — "should disconnect client and reset state" (lines 999-1016):**
- Same as test 5 — need `enableLogging: true` on the manager
- Change assertion to: `expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Steam Manager] Steam client disconnected'))`

### Step 3: Update version and changelog
- **File:** `package.json` — bump version from `3.2.1` to `3.2.2`
- **File:** `README.md` — Add v3.2.2 changelog entry above v3.2.1:

```
### v3.2.2 (Latest) - Test Alignment Hotfix
- **Fixed error message**: Restored missing "instead" in unmasked URL error for `decodeMaskedUrl()` / `decodeInspectUrl()`
- **Fixed Steam client tests**: Updated 6 test assertions to match debug-guarded logging introduced in v3.2.1 (timestamped format, `console.log` via `debugLog()`, `enableLogging` flag)
```

### Step 4: Run tests to verify all pass
- Run `npx jest` to confirm all tests pass

### Step 5: Commit and push
- Commit with message describing the hotfix
- Push to `claude/fix-steam-integration-tests-c8nY7`
