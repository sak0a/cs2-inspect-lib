# Getting started

CS2 Inspect is a Node.js library for encoding and decoding Counter-Strike 2 inspect links. TypeScript declarations and a command-line tool ship with the package.

## Install

Use Node.js **22.12 or newer**.

::: code-group
```sh [npm]
npm install cs2-inspect-lib
```
```sh [Bun]
bun add cs2-inspect-lib
```
:::

## Create and decode a link

This complete example works offline. No credentials are needed.

```ts
import {
  createInspectUrl,
  decodeMaskedUrl,
  WeaponType,
  WeaponPaint
} from 'cs2-inspect-lib'

const url = createInspectUrl({
  defindex: WeaponType.AK_47,
  paintindex: WeaponPaint.AK_47_CASE_HARDENED,
  paintseed: 661,
  paintwear: 0.15
})

const item = decodeMaskedUrl(url)
console.log(url)
console.log(item.defindex, item.paintindex, item.paintseed)
```

Wear is stored as a 32-bit float. A value such as `0.15` may decode to `0.15000000596046448`; compare approximately when testing.

## Pick an entry point

| Your task | Use |
| --- | --- |
| Decode an embedded link | `decodeMaskedUrl(url)` |
| Decode its hex token directly | `decodeMaskedData(hex)` |
| Identify a link without fetching data | `analyzeUrl(url)` |
| Create an embedded link | `createInspectUrl(item)` |
| Support embedded and legacy links | `CS2Inspect` with [Steam integration](./steam.md) |

The top-level functions are convenient for independent operations. Use a `CS2Inspect` instance when you want shared configuration or a Steam connection.

## CommonJS

```js
const { createInspectUrl, decodeMaskedUrl } = require('cs2-inspect-lib')

const url = createInspectUrl({
  defindex: 7, paintindex: 44, paintseed: 661, paintwear: 0.15
})
console.log(decodeMaskedUrl(url))
```

Next: learn [which links need Steam](./inspect-links.md), or [customize an item](./creating-items.md).
