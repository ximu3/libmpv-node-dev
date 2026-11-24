# Playback control

`getClientApiVersion()` reads the Client API major and minor version from the paired library. It can run before creating a player.

`createMpv({ options, input, signal })` creates an independent core. Pass initialization options as an ordered array of name/value pairs. The factory copies the input before asynchronous initialization. A failed option reports its zero-based index in `error.creation.optionIndex`.

```ts
import { createMpv } from '@ximu3/libmpv-node'

await using player = await createMpv({
  options: [
    ['pause', true],
    ['vo', 'null'],
    ['ao', 'null'],
  ],
})

await player.command(['loadfile', '/media/example.mkv', 'replace'])
```

A command completes when libmpv replies to that command. The reply to `loadfile` can arrive before the file has loaded. The client identity and monotonic nanosecond clock are available through `clientId`, `clientName`, and `getTimeNs()`.

Use `getProperty` and `setProperty` for structured values. A native integer maps to `bigint`. A native double maps to `number`. A value in a returned byte array remains usable after close. `getPropertyText` selects mpv's plain or OSD text format. `loadConfigFile` takes an absolute path. A configuration error can occur after earlier settings have taken effect.

`input: 'native'` accepts a discriminated `MpvNode`. `output: 'native'` preserves string bytes and ordered map entries. A conversion error exposes a fresh copy of its original result through `getNativeValue()`. An unavailable property retains libmpv's error code.

Calls accept an optional `AbortSignal`. A submitted command may have taken effect when its wait ends in cancellation. Errors expose `operation`, `submitted`, and a native or binding error code. Repeated calls to `close()` await the same shutdown. `unref()` lets an idle Node environment exit while the player is open.

Use `createClient({ name, signal })` for a separate control channel on the same player. It has its own client identity and directed messages. `dispose()` releases that channel. Closing the player also ends its channels.

`observeEvents`, `observeProperty` and `observePropertyText` return an independently disposable subscription. Await registration before sending a directed message. The first callback runs after the subscription is delivered. Property notifications distinguish available values and unavailable state. Native event output preserves message arguments as byte arrays. A subscription can be cancelled with its signal, including from a callback.

Use `observeLogs(observer, { level, output })` to receive diagnostics on an independent log channel. The default level is info. The `terminal-default` selection uses mpv's per-module settings. A gap precedes the next retained message after overflow. Its dropped count is exact for binding-only loss and null when mpv also reports an overflow.

Pass `initializationLogs: { observer, level, output }` to the factory to receive startup diagnostics. Completion ends the logging interval. The factory separately reports initialization errors after cleanup. Native output returns the original prefix and message bytes.
