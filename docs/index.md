---
layout: home
hero:
  name: CS2 Inspect
  text: From inspect link to item data.
  tagline: A TypeScript toolkit for reading skins, building inspect URLs and working with Steam. Start offline. Connect when you need to.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Explore the API
      link: /api
features:
  - title: Decode locally
    details: Read embedded item data without a Steam account or a network request.
    link: /guide/inspect-links
    linkText: Understand inspect links
  - title: Build your own links
    details: Set paint, wear, seed, stickers and charms. Encode an item into a shareable inspect URL.
    link: /guide/creating-items
    linkText: Create an item
  - title: Connect to Steam
    details: Resolve legacy inventory and market links through a managed Game Coordinator queue.
    link: /guide/steam
    linkText: Set up Steam
---

## One small round trip

```ts
import { createInspectUrl, decodeMaskedUrl } from 'cs2-inspect-lib'

const url = createInspectUrl({
  defindex: 7,       // AK-47
  paintindex: 44,   // Case Hardened
  paintseed: 661,
  paintwear: 0.15
})

const item = decodeMaskedUrl(url)
console.log(item.paintseed) // 661
```

[Install the package →](./guide/getting-started.md)

## Current protocol, familiar API

The September 2026 update adds multiple custom names, pet food expiration and opaque item data. Existing `customname` callers continue to work. [See the compatibility notes →](./guide/protocol.md)
