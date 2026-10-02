# CS2 Inspect Library

[![npm version](https://badge.fury.io/js/cs2-inspect-lib.svg)](https://www.npmjs.com/package/cs2-inspect-lib)
[![Documentation](https://img.shields.io/badge/docs-VitePress-orange)](https://sak0a.github.io/cs2-inspect-lib/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Encode and decode Counter-Strike 2 inspect URLs with TypeScript. Read embedded links offline, create previews with skins and stickers, or resolve legacy inventory and market links through Steam.

**[Read the documentation →](https://sak0a.github.io/cs2-inspect-lib/)**

## Install

Requires Node.js **22.12+**.

```sh
npm install cs2-inspect-lib
```

## Quick start

```ts
import { createInspectUrl, decodeMaskedUrl, WeaponType, WeaponPaints, type WeaponEconItem } from 'cs2-inspect-lib'

const item = {
  defindex: WeaponType.AK_47,
  paintindex: WeaponPaints.AK_47.CASE_HARDENED,
  paintseed: 661,
  paintwear: 0.15
} satisfies WeaponEconItem<WeaponType.AK_47>

const url = createInspectUrl(item)
const decoded = decodeMaskedUrl(url)
console.log(decoded.paintseed) // 661
```

Embedded links do not need Steam credentials. Legacy `S…A…D…` and `M…A…D…` links require an initialized Steam client. See the [Steam guide](https://sak0a.github.io/cs2-inspect-lib/guide/steam.html).

## What's included

- Local inspect-link encoding and decoding, including nonzero XOR-mask tokens.
- Stickers, charms, variations, StatTrak fields and bigint item IDs.
- September 2026 protocol fields: `customnames`, `pet_food_expiration_date` and `blobdata`. The singular `customname` API remains supported.
- Validation, typed errors, paint lookup helpers and a CLI.
- Steam integration through `node-cs2`, with request queuing and timeouts.

For examples and behavior details, see [getting started](https://sak0a.github.io/cs2-inspect-lib/guide/getting-started.html), the [API guide](https://sak0a.github.io/cs2-inspect-lib/api.html) and [protocol compatibility](https://sak0a.github.io/cs2-inspect-lib/guide/protocol.html).

## CLI

```sh
npx cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15
npx cs2inspect --help
```

## Development

```sh
npm ci
npm run build
npm run lint
npm run check:weapon-data
npm test -- --runInBand
npm run docs:dev
npm run docs:build
npm run docs:preview
```

Documentation lives in `docs/` as hand-written Markdown. `npm run docs` is an alias for the production site build. GitHub Actions checks the package and builds the site on pull requests; pushes to `master` or `main` deploy `docs/.vitepress/dist` to GitHub Pages at `/cs2-inspect-lib/`.

Weapon and paint enums come from pinned ByMykel API data. Run `npm run generate:weapon-paints` to fetch and regenerate both, or add `-- --offline` to use the checked-in snapshot. See the [weapon data guide](https://sak0a.github.io/cs2-inspect-lib/guide/weapon-data.html) for naming, lookup helpers and the corrected default CT/T glove IDs.

Use npm for the CI lockfile. After dependency changes, also run `bun install --lockfile-only` to update the checked-in Bun lockfile.

TypeScript remains on 6.0.3 because the latest TypeScript ESLint packages and ts-jest do not support TypeScript 7 yet. Other direct dependencies target their latest stable releases. `npm audit` currently reports upstream findings in Steam's `adm-zip` dependency and the stable VitePress development toolchain; see the v5.0.0 changelog notes.

Tests run offline and do not verify live Steam authentication or Game Coordinator availability. Contributions should include regression tests for protocol changes and a successful documentation build.

[Changelog](CHANGELOG.md) · [Report an issue](https://github.com/sak0a/cs2-inspect-lib/issues) · [MIT license](LICENSE)

## Browser, batch, validation, and lossless editing (5.1)

Use `cs2-inspect-lib/core` for browser-safe embedded encoding/decoding, batch inspection,
structured diagnostics, game-aware validation, semantic comparison, and lossless wire
editing. Use `cs2-inspect-lib/steam` for authenticated APIs; existing root imports remain
compatible. See [the item-tools guide](https://sak0a.github.io/cs2-inspect-lib/guide/item-tools.html)
for API examples, snapshot provenance, cancellation semantics, and exact preservation guarantees.
