# Govee room lighting over local Wi-Fi

Windows **1.26.3-dev.1** and Android **0.26.3-dev.1** (versionCode **114**), isolated development channel.

Open **Settings → Room lighting**, enable **LAN Control** in Govee Home, then **Find lights**. Select the strips, choose a palette color and Full music/Bass/Midrange/High frequencies, and press **Start sync**. Maximum brightness, music response and quiet brightness are adjustable. Colors follow Resonance's live music palette, with separate smoothed frequency responses. Pause and song changes fade gradually. Music only can drive lighting without starting graphics; analysis remains disabled when both lighting and visuals are off.

This first bridge controls the overall RGB color and brightness of each strip. It does not claim independently animated segments. Govee's published LAN API documents whole-device color/brightness; its supported list includes H61D3, H61D5 and H61D6. No Govee account, API key, cloud service or music upload is used. Wi-Fi and multicast must be available on the same private IPv4 LAN. Another Govee controller may occupy UDP port 4002.

Sync is opt-in for each listening session. Lights must already be on: the bridge never sends power commands, requests fresh status before sending colors, respects a reported power-off and skips unresponsive lights. Stop leaves their last color and brightness. Hiding the app stops sync; an independent timeout also stops a stale publisher. Discovery alone does not change lighting. Device selections stay in the local database and are not part of exported preferences or distributables.

Govee's LAN Control warning means a light cannot simultaneously act as a distributed gateway for Govee sensors; sensors depending on that gateway may be affected, and standby power use increases.

Verification: all four owner's strips answer read-only discovery and status queries. Simulated-controller regressions cover bounded commands, selection, power state, address validation, deduplication, request limits and publisher timeout. An isolated actual Windows UI plays generated audio in Music only, observes reactive brightness, verifies a gradual pause fade, compact layout and Stop. The actual Android panel also passes a native-bridge simulation with four device rows, touch scrolling, brightness adjustment and Stop. No color-changing hardware test or physical Android test is claimed. Shared tests, Android JVM/build/lint, signing identity, extracted startup graphs, clean Windows startup, legacy updater compatibility and anonymous channel isolation are checked before publication.

Existing development installations can use **Settings → App updates**. The APK keeps the original signing identity and installs over the existing app; do not uninstall. Regular installations remain on the approved channel. Main and the public download buttons stay Windows 1.26.2 / Android 0.26.2-preview pending approval.

All **580 shared tests** and **155 Android JVM tests** pass. Both ABI builds and device-test compilation pass; lint reports 0 errors and 9 existing warnings. Physical light discovery is verified for all four strips; color response is verified using simulated controllers and generated audio.
