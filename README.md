# samudra-sky-post

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/0xtaaaa/samudra-sky-post/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/0xtaaaa/samudra-sky-post/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Samudra Sky Post is a 3D flight game that runs offline in a desktop browser. You are the mail pilot of **Nuri-7**, a twin-prop workhorse, flying the dawn post across the fictional Kepulauan Samudra: thread the glowing mail rings, drop the post, and set her down gently on the island strips — from a calm first light to a full storm post.

The game has five mail runs with progression (First Light, Crosswind Run, Twin Isles, Dusk Delivery, Storm Post), a procedural island archipelago with ocean, beaches, palms, villages, a volcano and a lighthouse, a forgiving arcade flight model (throttle, pitch, bank, flaps, gear, stall), crosswind and turbulence, a lit instrument HUD (airspeed, altitude, climb, compass tape, artificial horizon, throttle, wind), chase / cockpit / orbit cameras, and sound synthesised live with WebAudio — engine drone, wind rush, ring chimes — with no audio files. Everything runs from static files with no network request; the only library is Three.js, vendored under `game/vendor/`.

## Run it

Serve `game/` with any static server, then open it in desktop Chrome. For example, from the repository root:

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080. (Any static server works — the game is plain files and makes no network request of its own.)

**Controls:** W / S throttle · ↑ / ↓ pitch · ← / → bank & turn · F flaps · G landing gear · C camera · drag mouse to look around · P pause · M mute · R restart run.

**The run:** take off from Samudra Field, fly each glowing mail ring in order (+100), then land on the named strip — gear down, gentle descent (+250, +300 for a greased landing). Finish under the par time for a time bonus. Two-leg runs land twice. Crash, and the post flies again tomorrow.

---

<sub>Entered on [make.fun](https://make.fun/?ref=s3k5038j&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
