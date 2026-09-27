# Steam integration

Only legacy S/M links need Steam. Embedded links decode offline even when no Steam client is configured.

## Connect, inspect, disconnect

Provide credentials through your application's environment. Set `INSPECT_URL` to an actual inventory or market inspect link.

```ts
import { CS2Inspect } from 'cs2-inspect-lib'

async function main() {
  const url = process.env.INSPECT_URL
  if (!url) throw new Error('Set INSPECT_URL to a real inspect link')

  const cs2 = new CS2Inspect({
    steamClient: {
      enabled: true,
      username: process.env.STEAM_USERNAME,
      password: process.env.STEAM_PASSWORD,
      requestTimeout: 30_000
    }
  })

  try {
    await cs2.initializeSteamClient()
    const item = await cs2.inspectItem(url)
    console.log(item)
  } finally {
    await cs2.disconnectSteamClient()
  }
}

main().catch(console.error)
```

Initialization must complete before a legacy link can be inspected. Steam authentication and Game Coordinator availability can fail independently of URL validity. The wrapper does not expose an interactive Steam Guard prompt; accounts requiring an additional authentication challenge may need integration work.

## Reuse the top-level helper

After initializing an instance, pass its manager explicitly:

```ts
import { inspectItem } from 'cs2-inspect-lib'

const item = await inspectItem(url, {
  steamClient: cs2.getSteamClientManager()
})
```

Calling `inspectItem(legacyUrl)` without a manager throws `SteamNotReadyError`. It does not silently sign in.

## Queue and timeouts

| Setting | Default | Purpose |
| --- | --- | --- |
| `rateLimitDelay` | `1500` ms | Delay between queued requests |
| `maxQueueSize` | `100` | Maximum queued requests |
| `requestTimeout` | `10000` ms | Wait for an inspection response |
| `queueTimeout` | `30000` ms | Expire old queued requests |

Inspection responses are matched to the requested asset through `node-cs2`'s Promise API. A late response for a different asset cannot resolve the current request. Disconnecting rejects active and queued requests; it also cancels this library's request timer and queue delay. The upstream request may finish or time out afterward, and its result/rejection is safely ignored.

The GC response identifies the asset, not a unique request attempt. A late response for the same asset cannot be distinguished from a retry solely by this identifier.

Use `cs2.getSteamClientStats()` to inspect connection status and queue length. Steam results include `inspectUrl`, `queueStatus` and optional `steamMetadata` in addition to item fields.

## Troubleshooting

- `SteamNotReadyError`: check that Steam support is enabled and initialization completed.
- `SteamAuthenticationError`: check the credentials and any account authentication requirements.
- `SteamTimeoutError`: check that the link references a real item and the Game Coordinator is available.
- `SteamQueueFullError`: reduce concurrent submissions or adjust the queue limit.

Live Steam authentication is not part of the offline test suite. A successful local build does not verify account access or GC availability.
