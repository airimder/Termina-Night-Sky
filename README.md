# Termina Night Sky

In *The Legend of Zelda: Majora's Mask*, the stars over Termina are generated from the player's file name, so every save file has its own night sky. This page lets anyone type a name (up to 8 characters) and see, or download, the exact sky the game would draw for it. It can show the sky as a map, or let you look around it the way it appears in the game.

## How it works

The game's star code is `Environment_DrawSkyboxStarsImpl` in `src/code/z_kankyo.c` of the [Majora's Mask decompilation](https://github.com/zeldaret/mm). `sky.js` is a line-for-line port of it:

1. **Seed.** The 8 name characters are converted to the game's file-select codes (`0`–`9` → `0x00`–`0x09`, `A`–`Z` → `0x0A`–`0x23`, `a`–`z` → `0x24`–`0x3D`, space `0x3E`, `-` `0x3F`, `.` `0x40`). Unused characters are spaces. The game shifts each code by a different amount and combines them with XOR into a 32-bit seed.
2. **The 16 shared stars.** The first 16 stars have fixed positions and colours, the same on every file. They form a small blue constellation with one orange star.
3. **Your stars.** Every star after that comes from the game's random number generator (`r = r × 1664525 + 1013904223`), starting from the seed. Each star takes four values: two averaged for height above the horizon, one for direction (looked up in libultra's `sins` table), and one for size. Colour steps through a 16-entry pale violet/pink list every 64 stars.
4. **Star count.** Each area sets how many stars it draws, through an actor in its scene data. Every area draws the first *N* of the same list, so the 300 stars over Clock Town are the first 300 of the 1,500 at the Great Bay Temple entrance. The counts in `PRESETS` were read from the US ROM's scene files.

Nothing is stored. The game recalculates the whole sky from the name every frame.

The port matches the decompiled code exactly, and its output has been compared with the real game.

## Files

| File | |
|---|---|
| `index.html`, `style.css` | The page |
| `app.js` | Name input, star-count presets, download, shareable links (`?name=Airimder&stars=1500`) |
| `sky.js` | The star generator (no DOM, also runs in Node) |
| `render.js` | Draws the star map as a fisheye looking straight up |
| `look.js` | The **In game** view: a 320 × 240 frame with a 60° field of view, stars drawn as the game draws them |

## Notes

- Downloads up to 8192 × 8192 work in Chrome, Edge and Firefox. Safari limits canvas size, so it may only manage 4096.
- The **In game** view reproduces the game's own steps. Each star is projected with the default 60° field of view, its screen position is cut to quarter pixels, and it is drawn as a rectangle `width` quarter-pixels wide and 1 pixel tall. The star render mode (`G_RM_AA_XLU_LINE`) uses pixel coverage as transparency, so stars narrower than a pixel shimmer as the camera moves. That coverage is modelled as overlap area rounded down to eighths, which approximates the N64's 8 coverage samples per pixel rather than reproducing them bit for bit. The sky colour and the ground are stand-ins for the scenery.
- The star map's rendering (soft glowing points, the dome projection) is an interpretation. In the game, each star is a flat rectangle ½–2½ pixels wide and 1 pixel tall, and you only ever see a 320 × 240 slice of the sky. The positions, sizes, colours and counts are exact.

## Credits

A fan project. It is not affiliated with or endorsed by Nintendo. *The Legend of Zelda: Majora's Mask* is a trademark of Nintendo. Thanks to the [zeldaret](https://github.com/zeldaret) team for the decompilation that made this possible.
