# API & configuration

This page covers the public workflows. The package includes TypeScript declarations for detailed signatures and editor completion.

## Core functions

| Function | Result | Use |
| --- | --- | --- |
| `createInspectUrl(item, config?)` | `string` | Encode an `EconItem` |
| `decodeMaskedUrl(url, config?)` | `EconItem` | Decode an embedded URL synchronously |
| `decodeMaskedData(hex, config?)` | `EconItem` | Decode a complete embedded hex token |
| `inspectItem(url, options?)` | `Promise<EconItem \| SteamInspectResult>` | Decode locally or use an explicitly supplied Steam manager |
| `analyzeUrl(url, config?)` | `AnalyzedInspectURL` | Parse and classify the input |
| `requiresSteamClient(url, config?)` | `boolean` | Check whether a link needs the GC |
| `normalizeUrl(url, config?)` | `string` | Normalize a supported input |
| `isValidUrl(url, config?)` | `boolean` | Check whether the analyzer accepts the input |
| `validateItem(item)` | `ValidationResult` | Return errors and warnings for item data |
| `validateUrl(url)` | `ValidationResult` | Perform basic URL validation |

`inspectItem` options contain `config?: CS2InspectConfig` and `steamClient?: SteamClientManager`. Other helpers accept configuration directly.

## Instance API

`new CS2Inspect(config?)` shares configuration across calls and manages an optional Steam connection. It exposes `createInspectUrl`, `decodeMaskedUrl`, `inspectItem`, `analyzeUrl`, `normalizeUrl`, `validateItem` and `validateUrl`.

Steam lifecycle methods are `initializeSteamClient()`, `isSteamClientReady()`, `getSteamClientManager()`, `getSteamClientStats()` and `disconnectSteamClient()`. Use `getConfig()` and `updateConfig(partial)` for library configuration.

The older `decodeInspectUrl` and `decodeInspectUrlAsync` names remain available. Prefer `decodeMaskedUrl` and `inspectItem` in new code.

## Library configuration

| Option | Default | Meaning |
| --- | --- | --- |
| `validateInput` | `true` | Validate input before supported operations |
| `maxUrlLength` | `2048` | Maximum URL length when encoding or validating |
| `maxCustomNameLength` | `100` | Maximum UTF-8 bytes per custom name |
| `enableLogging` | `false` | Diagnostic logging |
| `steamClient` | Disabled | [Steam credentials and queue settings](./guide/steam.md) |

Name validation, encoding and decoding use the same UTF-8 byte limit. A name can contain fewer than 100 characters and still exceed 100 bytes. Use the same configuration for encoding and decoding when increasing limits. Instance `validateItem` and `validateUrl` methods use the instance configuration.

Public decoders validate item data by default. `inspectItem(url, { config: { validateInput: false } })` explicitly disables item validation. Protobuf integer bounds and finite float representation are always enforced when encoding: disabling validation never permits silent integer truncation. Encode uint64 IDs above JavaScript's safe integer range as `bigint`; unsafe numeric IDs are rejected.

## Weapon-specific types

Use `WeaponPaints.AK_47.CASE_HARDENED` for weapon-specific constants, `PaintFor<WeaponType.AK_47>` for valid paint indices, and `WeaponEconItem<WeaponType.AK_47>` to check an entire item. `WeaponEconItem` with no parameter checks all supported weapon/paint combinations as a discriminated union. See [weapons and paints](./guide/weapon-data.md).

## Item data

Required fields are `defindex`, `paintindex`, `paintseed` and `paintwear`. Optional data includes IDs, rarity, quality, StatTrak counters, names, stickers, keychains, variations, style and upgrade level.

- `itemid` decodes as `bigint`; encode with `bigint` for IDs beyond JavaScript's safe integer range.
- `stickers`, `keychains` and `variations` share the `Sticker` shape, including offsets, pattern, highlight reel and wrapped sticker IDs.
- `customnames`, `pet_food_expiration_date` and `blobdata` follow the [September protocol](./guide/protocol.md).
- `WeaponType`, `WeaponPaint` and `ItemRarity` are convenience enums; numeric indices remain supported.

## Errors

```ts
import { createInspectUrl, CS2InspectError } from 'cs2-inspect-lib'

try {
  createInspectUrl({ defindex: 7, paintindex: 44, paintseed: 661, paintwear: 2 })
} catch (error) {
  if (error instanceof CS2InspectError) {
    console.error(error.message)
    console.error(error.context)
  } else {
    throw error
  }
}
```

Encoding and decoding use `ValidationError`, `EncodingError`, `DecodingError` and `InvalidUrlError`. Steam operations additionally use connection, authentication, readiness, timeout, queue and inspection errors. Catch specific exported error classes when your application needs different recovery behavior.
