# Third-party licences

Pulse Streak ships one third-party dependency inside the app binary.

## Phaser 3

`phaser.min.js` is vendored into this repository and bundled into the Android
app. Phaser is released under the MIT licence and its copyright notice must
travel with any distribution, including a store binary.

```
The MIT License (MIT)

Copyright (c) 2013-2025 Phaser Studio Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

Confirm the copyright line and year against the header of the vendored
`phaser.min.js` you actually ship, and update it here if your copy differs.

## Build-time only (not shipped in the app)

- **Capacitor** (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) — MIT.
  Capacitor's Android runtime *is* compiled into the app; its MIT notice applies
  the same way and is reproduced in the licences Gradle collects from the
  dependency.

## Assets

There are none. Every graphic and sound in Pulse Streak is generated
procedurally at runtime from code in `index.html` — no fonts, images, or audio
files are included or downloaded. Store listing graphics in `store-assets/` are
rendered from that same code by `npm run assets`.
