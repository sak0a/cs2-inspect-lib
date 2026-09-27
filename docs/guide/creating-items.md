# Creating items

An item needs four values: `defindex`, `paintindex`, `paintseed` and `paintwear`. Numeric indices work alongside the exported `WeaponType` and `WeaponPaint` enums.

## Stickers, charms and names

```ts
import { createInspectUrl, type EconItem } from 'cs2-inspect-lib'

const item: EconItem = {
  defindex: 7,
  paintindex: 44,
  paintseed: 661,
  paintwear: 0.15,
  customnames: ['Case study'],
  stickers: [{
    slot: 0,
    sticker_id: 1,
    wear: 0.1,
    scale: 1,
    rotation: 15,
    offset_x: 0.1,
    offset_y: -0.1
  }],
  keychains: [{ slot: 0, sticker_id: 20, pattern: 148 }]
}

console.log(createInspectUrl(item))
```

A generated URL is a preview. Creating one does not modify a Steam inventory item.

## Validate before encoding

```ts
import { validateItem, createInspectUrl } from 'cs2-inspect-lib'

const item = { defindex: 7, paintindex: 44, paintseed: 661, paintwear: 0.15 }
const result = validateItem(item)
if (!result.valid) {
  throw new Error(result.errors.join(', '))
}
console.log(result.warnings ?? [])
console.log(createInspectUrl(item))
```

Public encoding helpers validate by default. Integer fields must fit their protobuf ranges; item IDs supplied as numbers must also be safe integers. Names are limited by UTF-8 bytes, consistently across validation, encoding and decoding. Wear must be between `0` and `1`. Sticker slots are validated in the range `0`–`4`. Unusual paint seeds and duplicate sticker slots produce warnings.

## Look up paints

```ts
import { WeaponPaint, getPaintName, getPaintIndex } from 'cs2-inspect-lib'

console.log(WeaponPaint.AK_47_CASE_HARDENED) // 44
console.log(getPaintIndex('AK_47_CASE_HARDENED')) // 44
console.log(getPaintName(44))
```

Paint indices can be shared by several weapons. Pass a weapon as the second argument to `getPaintName`, for example `getPaintName(44, WeaponType.KARAMBIT)`, to disambiguate. See [weapons and paints](./weapon-data.md) for phase aliases, definition indices and catalog updates. Numeric IDs let you use new paints before the bundled enum is refreshed.

## September fields

Use `customnames` for multiple names, `pet_food_expiration_date` for the uint32 timestamp and `blobdata` for opaque bytes. See the [protocol notes](./protocol.md) for precedence and compatibility behavior.
