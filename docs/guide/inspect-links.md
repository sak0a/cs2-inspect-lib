# Inspect links

Two kinds of links use the same `csgo_econ_action_preview` command. Their payload determines how they are resolved.

## Embedded (masked) links

An embedded link contains a hex token carrying protobuf item data, a mask byte and a checksum. The item can be decoded locally.

```ts
import { createInspectUrl, analyzeUrl, decodeMaskedData } from 'cs2-inspect-lib'

const url = createInspectUrl({
  defindex: 7, paintindex: 44, paintseed: 661, paintwear: 0.15
})
const analysis = analyzeUrl(url)
if (analysis.hex_data) {
  console.log(decodeMaskedData(analysis.hex_data))
}
```

`decodeMaskedData` expects the complete hex token, including its framing and checksum, rather than bare protobuf bytes. Zero-mask links created by this library and checksum-valid nonzero XOR-mask links are supported. Historical unprefixed protobuf-plus-checksum input remains accepted. Legacy decoding does not authenticate the checksum; do not treat decoded data as proof of item ownership or authenticity.

## Legacy inventory and market links

Legacy payloads reference an item held by Steam:

| Payload | Meaning |
| --- | --- |
| `S<owner>A<asset>D<inspect-token>` | Inventory item |
| `M<listing>A<asset>D<inspect-token>` | Market listing |

These require an authenticated Steam client and an available Game Coordinator. See [Steam integration](./steam.md).

```ts
import { analyzeUrl, requiresSteamClient } from 'cs2-inspect-lib'

// Example format only; these IDs do not identify a real item.
const url = 'S76561198123456789A987654321D456789123'
console.log(analyzeUrl(url).url_type) // 'unmasked'
console.log(requiresSteamClient(url)) // true
```

## Accepted input forms

The URL analyzer accepts a full `steam://rungame/730/…` link, a preview command, a hex token or a legacy S/M payload. Spaces and `%20` separators are supported. `normalizeUrl(url)` returns the canonical Steam URL form.

`validateUrl` performs basic validation. Use `analyzeUrl` for actual format classification, and decode to verify that the payload can be read.

## Working with item IDs

Decoded `itemid` values use `bigint`. Use decimal strings when writing JSON:

```ts
const json = JSON.stringify(item, (_key, value) =>
  typeof value === 'bigint' ? value.toString() : value
)
```
