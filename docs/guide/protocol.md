# September 2026 protocol update

This library follows the inspection schema shipped in `node-cs2` **2.5.0**, synced to the September 25, 2026 GameTracking-CS2 snapshot.

## What changed

| Protobuf field | Public property | Behavior |
| --- | --- | --- |
| 11, repeated string | `customnames?: string[]` | Preserves every name in order |
| 24, uint32 | `pet_food_expiration_date?: number` | Preserves the pet food expiration timestamp |
| 25, bytes | `blobdata?: Uint8Array` | Preserves opaque bytes without interpreting them |

These fields work in local encoding/decoding and in converted Steam inspection results. `Buffer` is accepted as a `Uint8Array` when encoding binary data.

## Existing custom names keep working

```ts
import { createInspectUrl, decodeMaskedUrl } from 'cs2-inspect-lib'

const url = createInspectUrl({
  defindex: 7,
  paintindex: 44,
  paintseed: 661,
  paintwear: 0.15,
  customnames: ['First name', 'Last name'],
  pet_food_expiration_date: 1_800_000_000,
  blobdata: Uint8Array.from([1, 2, 3])
})

const item = decodeMaskedUrl(url)
console.log(item.customnames) // ['First name', 'Last name']
console.log(item.customname)  // 'Last name'
```

On encoding, `customnames` takes precedence over `customname`, including an explicitly empty array. If only `customname` is supplied, it is encoded as one name. On decoding, `customname` remains an alias for the last name. With no names it is absent/undefined, preserving this library's optional-string API.

The pet-related fields describe wire data. They do not make the library a pet management client or change the game's behavior.

## Embedded links

The September `node-cs2` releases also added offline embedded-link decoding. This library handles nonzero XOR-mask tokens as well as its existing zero-mask links. Legacy S/M links still require Steam. See [inspect links](./inspect-links.md) for framing and validation limits.

## Scope and verification

Protocol tests compare encoded data with `node-cs2`'s generated protobuf schema and cover repeated names, binary data, numeric boundaries and Steam result conversion. Live Steam/GC operations require a separate authenticated environment.

Other upstream changes, including pet acknowledgements, clan tags and network messages, belong to `node-cs2` and do not require new inspect-library APIs.

Sources: [node-cs2 release notes](https://github.com/sak0a/node-cs2/blob/master/RELEASE_NOTES.md) and the [pinned upstream schema snapshot](https://github.com/SteamTracking/GameTracking-CS2/commit/3fc98e763328f7d1627405b389d1b6b69c5b0e38).
