# Local tools, batches, and editing

These APIs are additive in 5.1. Existing root imports, `CS2Inspect`, analyzers, codecs,
CLI commands, and authenticated configuration remain available.

## Browser entry and authenticated entry

```ts
import { createInspectUrl, decodeMaskedUrl, diagnoseInspectLink } from 'cs2-inspect-lib/core';
import { CS2Inspect, SteamClientManager } from 'cs2-inspect-lib/steam';
```

`/core` has no `node-cs2`, `steam-user`, Node built-in, or Buffer runtime dependency.
It uses browser `TextEncoder`, `TextDecoder`, typed arrays, and BigInt. Root imports
retain authenticated functionality; use `/core` explicitly in a browser bundle.
`/steam` re-exports the existing root API. CommonJS and ESM consumers can use the
package exports; historical `dist/*` imports remain supported.

## Batch inspection

```ts
import { inspectBatch } from 'cs2-inspect-lib/core';
const controller = new AbortController();
const results = await inspectBatch(links, {
  steamClient: existingManager, // existing SteamClientManager, already initialized
  signal: controller.signal,
  concurrency: 4,
  onProgress: ({ completed, total, result }) => console.log(completed, total, result.status)
});
for (const result of results) {
  if (result.status === 'success') console.log(result.item);
  else console.error(result.index, result.error);
}
```

`CS2Inspect.inspectBatch(links, options)` supplies its own manager and configuration.
Embedded data decodes locally. Legacy S/M links use the existing manager queue and
rate limiting. Inputs retain their original order in the result array, including
duplicates. Progress fires once per input in completion order. Duplicate canonical
requests share a lookup within one batch, including failures; there is no persistent
cache. Duplicate successes share the same item object, so clone before modifying it.
The default concurrency is 4, allowed range 1–100. Progress callbacks should not
throw; a thrown exception rejects the batch promise.

Malformed links and missing Steam prerequisites become per-item errors. Batch errors
have codes `CANCELLED`, `STEAM_REQUIRED`, or `INSPECTION_FAILED`; existing parser and
Steam errors retain their original class and code. Cancellation settles waiting batch
results, removes unsent requests from the manager queue, and prevents further batch
scheduling. A sent Steam read is not recalled: it retains its internal queue slot
until response or timeout. Neither cancellation nor a partial failure disconnects a
shared manager, and the batch API never retries operations. A custom structural
resolver may continue work in the background if it ignores `signal`.

## Wire validation and game data

```ts
import { validateWireItem, validateItemData, ITEM_DATA_VERSION } from 'cs2-inspect-lib/core';
const wire = validateWireItem(item);
const game = validateItemData(item, { mode: 'permissive' });
console.log(ITEM_DATA_VERSION, game.valid, game.diagnostics);
```

Wire validation reports invalid field paths and checks whether the existing encoder can represent the item, including
uint32/uint64 and finite float32 boundaries. Wire strings and the complete encoded message have a 10 MiB resource limit; the legacy cosmetic name limit is not applied by this check. It does not assert that an item exists
in the game. `validateItemData` checks weapon/paint pairs and wear ranges against the
versioned ByMykel/CSGO-API snapshot also used by the weapon enums. The snapshot is
bundled offline and identified by its exact upstream commit. `npm run check:weapon-data`
verifies generated validation data and enums together.

Each diagnostic includes `code`, `path`, `message`, and `severity`. Strict mode rejects
unknown weapons, paints, and wear ranges. Explicit `mode: 'permissive'` turns unknown
catalog entries into warnings, allowing new items to remain usable. Known incompatible
weapon/paint combinations, invalid wire values, and out-of-range wear still fail.
Wear endpoints are compared in float32 space. Paint zero is treated as vanilla with
wear range [0,1]. This is snapshot validation, not evidence of Steam accepting an item.
Legacy `Validator` behavior is unchanged; use the new functions for separated checks.

## Semantic comparison

```ts
import { compareItems } from 'cs2-inspect-lib/core';
const changes = compareItems(before, after);
// [{ path: 'stickers.0.rotation', before: 0, after: 90,
//    beforePresent: true, afterPresent: true }]
```

Comparison covers item properties, repeated names, stickers, keychains, variations,
transforms, and opaque byte arrays. Float fields compare their float32 representation;
there is no arbitrary epsilon. Array order matters, including repeated custom names.
Missing properties, explicitly present `undefined`, zero, negative zero, empty strings,
and empty arrays remain distinct. Exact safe integer item IDs compare equal to the
same bigint. Comparison operates on the supplied model; legacy decoders insert defaults
for some absent required fields, so use wire documents when original field presence
matters. `customname` and `customnames` are compared as provided, not silently reconciled.

## Lossless editing

```ts
import { decodeInspectDocument } from 'cs2-inspect-lib/core';
const document = decodeInspectDocument(embeddedLink);
const edited = document
  .edit({ paintseed: 42, customnames: ['First', 'Second'] })
  .editAttachment('stickers', 0, { rotation: 90, offset_x: 0 });
const newLink = edited.toUrl();
```

`InspectDocument` accepts raw item protobuf bytes in its constructor. It copies input
bytes; `toProtobuf()` returns a copy. `item` returns a fresh decoded model.
`decodeInspectDocument` requires embedded framing and verifies its checksum for both
zero and nonzero masks. Unlike legacy decoding, it never falls back to an unframed or
unchecked interpretation. `ProtobufReader.decodeItemData` exposes raw protobuf decoding.

Preservation guarantees:

- A document with no edits returns identical raw protobuf bytes, including field order,
  duplicate occurrences, and noncanonical but accepted varints.
- Editing a known property removes every occurrence of that field and appends the new
  encoding. Every other raw field segment retains its original bytes and relative order.
- `blobdata` stays opaque. Unedited bytes and unknown top-level fields are preserved.
- `editAttachment(collection, occurrenceIndex, patch)` edits one existing sticker,
  keychain, or variation by wire occurrence, preserving all unedited nested segments,
  including unknown fields. It does not use slot as an identity or reorder attachments.
- `undefined` removes optional scalar fields; `customnames: []` removes repeated names.
  `customname` remains a convenience alias unless `customnames` is explicitly supplied.
  Required model fields cannot be deleted. Attachments cannot be replaced wholesale
  through `edit`; this prevents accidental loss of their unknown nested data.
- Documents retain existing decoder resource limits (10 MiB message, 100 UTF-8 bytes per name, 1 KiB per attachment).
- Supported wire types are varint, fixed64, length-delimited, and fixed32. Deprecated
  protobuf groups and malformed fields are rejected. Unknown length-delimited bytes
  are opaque; the editor does not guess whether they contain nested messages.

Edited protobuf output is not promised byte-identical or canonically ordered.
`toUrl()` regenerates checksum and uses a zero mask; original URL spelling, mask, and
prefix are not preserved. Only unedited raw protobuf segments have byte preservation.

## Structured diagnostics

```ts
const report = diagnoseInspectLink(link, { mode: 'permissive' });
// type: embedded | inventory | market | invalid
// requiresSteam, valid, diagnostics, optional item, snapshot
```

Diagnostics distinguish URL parsing (`URL_PARSE`), strict embedded decoding
(`WIRE_DECODE`, including checksum errors), and game-data errors. A valid legacy link
reports `requiresSteam: true`; this verifies its syntax, not item existence or account
access. Existing `analyzeInspectUrl`, `analyzeUrl`, and `UrlAnalyzer` APIs retain their
behavior. No authenticated or inventory-changing operation is performed by diagnostics.
