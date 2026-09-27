# Weapons and paints

`WeaponType` contains item definition indices (`defindex`). `WeaponPaint` contains paint kit indices (`paintindex`). They are separate identifiers: the same paint kit can be used on several weapons.

The enums are generated from ByMykel's [skins](https://bymykel.com/CSGO-API/#list-skins) and [base weapons](https://bymykel.com/CSGO-API/#list-base-weapons) datasets. The checked-in snapshot contains **2,126 skins**, covering **75 weapon definitions** and **2,300 paint enum names**, including compatibility aliases. There are more enum names than skins because historical names and readable phase aliases coexist.

## Weapon-specific paints and types

Use `WeaponPaints` for a separate paint map for each weapon. Each map has one name per paint index, so a shared finish appears once in each applicable weapon's list. Doppler variants use their phase names.

```ts
import {
  createInspectUrl, WeaponType, WeaponPaints,
  type WeaponEconItem, type PaintFor
} from 'cs2-inspect-lib'

const item = {
  defindex: WeaponType.AK_47,
  paintindex: WeaponPaints.AK_47.CASE_HARDENED,
  paintseed: 661,
  paintwear: 0.15
} satisfies WeaponEconItem<WeaponType.AK_47>

const url = createInspectUrl(item)

// A type containing only the known AK-47 paint indices:
type AK47Paint = PaintFor<WeaponType.AK_47>
const paint: AK47Paint = WeaponPaints.AK_47.FIRE_SERPENT
```

`WeaponPaints.AWP.DRAGON_LORE` cannot be assigned to `AK47Paint`. A finish shared by both weapons is valid for both: Case Hardened remains the numeric value `44`, without conflicting enum identities.

`WeaponEconItem` without a type parameter is a discriminated union of all known weapon/paint combinations. It checks the pairing even when an application works with multiple weapons. Each variant includes the other `EconItem` fields, including stickers, names and wear.

This checking is opt-in: use an annotation or `satisfies WeaponEconItem`. The existing `EconItem` and encoding functions still accept general numeric IDs so new game content and dynamically decoded items remain supported. These types do not perform runtime validation of external data.

Map names follow `WeaponType`, for example `WeaponPaints.BOWIE`, `WeaponPaints.GLOVES_SPORT` and `WeaponPaints.KUKRI_KNIFE`. All maps include `VANILLA`. Names beginning with a digit use bracket access, such as `WeaponPaints.FAMAS['2A2F']`.

The original flat `WeaponPaint.AK_47_CASE_HARDENED` API remains available. Its repeated numeric values now use explicit enum aliases, preserving old constants and reverse mappings without repeating numeric initializers. Prefer the scoped maps for clean weapon-specific completion and lists.

The base-weapon endpoint has 67 definitions. Eight additional glove definitions come from each skin's `weapon.weapon_id`, including `BROKEN_FANG_GLOVES = 4725`. Grenades, C4 and Medi-Shot are also represented, although not every weapon definition has paint kits.

## Look up paints for a weapon

```ts
import { getPaintName, getPaintsByWeapon, WeaponType } from 'cs2-inspect-lib'

console.log(getPaintName(44, WeaponType.AK_47)) // AK_47_CASE_HARDENED
console.log(getPaintName(44, WeaponType.KARAMBIT)) // KARAMBIT_CASE_HARDENED

const paints = getPaintsByWeapon(WeaponType.KUKRI_KNIFE)
const samePaints = getPaintsByWeapon('Kukri Knife')
```

`getPaintsByWeapon` accepts a numeric defindex, an exact weapon display name or a `WeaponType` member name such as `'BOWIE'`. Names are case-insensitive. Partial names such as `'M4'` return no matches. Results include aliases, so several names can have the same index.

Without a weapon argument, `getPaintName(index)` keeps its previous behavior: it returns the first matching enum name. A paint index alone cannot identify its weapon.

## Doppler phases and naming

```ts
import { WeaponPaint, getPaintsByPattern } from 'cs2-inspect-lib'

console.log(WeaponPaint.BAYONET_DOPPLER_PHASE_1) // 418
console.log(WeaponPaint.BAYONET_DOPPLER_PHASE_2) // 419
console.log(WeaponPaint.BAYONET_DOPPLER_BLACK_PEARL) // 417
console.log(getPaintsByPattern('Jörmungandr'))
```

Existing constants such as `BAYONET_DOPPLER` and numeric-suffix variants remain available with their original values. New aliases use phase names and normalize accents, for example `AUG_FLAME_JORMUNGANDR`. When two normalized names refer to different paint kits, the index is appended to avoid collisions.

Vanilla items use `WeaponPaint.VANILLA = 0`. Null paint indices in the API mean no finish; they are not converted into additional paint kits. The old `BAYONET_ = 0` constant remains as a compatibility alias; use `VANILLA` in new code.

`getPaintIndex` accepts enum names, not numeric strings. `getAllPaintIndices()` still returns one index per enum name, including duplicates. Use `new Set(getAllPaintIndices())` if you need unique paint IDs.

## Corrected default glove definitions

The old team-glove constants were reversed. They now follow the base-weapon API:

| Constant | Correct defindex | Previous value |
| --- | --- | --- |
| `WeaponType.GLOVES_T` | `5028` | `5029` |
| `WeaponType.GLOVES_CT` | `5029` | `5028` |

Review any code that relied on the previous numeric assignments. Other existing weapon names retain their values.

## Refresh the catalog

```sh
# Fetch both datasets from one upstream commit and regenerate both enums
npm run generate:weapon-paints

# Regenerate from the checked-in snapshot, without network access
npm run generate:weapon-paints -- --offline

# Verify the checked-in enums match the snapshot, without writing files
npm run check:weapon-data
```

The snapshot is stored in `scripts/data/csgo-items.json` with its upstream commit. Both datasets are fetched from that commit to prevent mixing revisions. API errors or invalid identifiers stop generation before output files are written.

Tests check every weapon/paint pair, preserve the historical enum names, and verify repeatable generation. The API is a community-maintained dataset, so it can lag a game update. Numeric indices remain supported for new content.
