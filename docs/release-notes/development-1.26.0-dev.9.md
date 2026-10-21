# Noctiluca: open water and silver schools

Windows **1.26.0-dev.9** · Android **0.26.0-dev.9** (versionCode 75). Development channel only.

Open **Visuals → Style → Art direction → Noctiluca**. The view sits beneath a dense school of silver fish in deep open water, with a moving sunlit surface, shafts of light and suspended marine snow. There is no ground. Fish have three-dimensional bodies, forked tails and fins, with dark backs and metallic highlights that catch the light as they turn.

Bass changes swimming speed, spacing and size; melody bends currents and illuminates the water; percussion pushes temporary escape pockets through the school. Frequency lights affect scale glints and colour. Movement, Beat motion, Turbulence, Particle size and Living detail remain available. Two new saved controls appear in Style: **School opening** moves between a compact formation and a wider opening, and **Sun shafts** sets the strength of surface illumination.

Local separation, alignment and cohesion guide 384 leaders on Windows and 160 on Android. Bounded GPU followers extend the population to at most 4,608 and 1,280 fish respectively. The school stops when playback is paused or reduced motion is enabled, discards long inactive gaps and resets for a new song. Held loud notes do not continuously trigger escape impulses. Phone framing remains upright; mobile uses fewer fish, mesh segments and light samples.

Development installations receive this build through **Settings → App updates**. An ordinary installation needs a one-time development ZIP/APK installation to enter this channel. Keep the Windows test portable in a separate folder. Android installs over the existing signed app and preserves data; confirm through the system installer and do not uninstall. The main branch, ordinary releases and public download buttons remain unchanged.

Verification: 504 shared tests and 134 native Android tests pass. Android lint has zero errors and nine existing warnings. All eight art directions pass actual GPU checks, including independent musical responses, frequency lighting, stable paused frames and graphics-context recovery. New checks cover attack gating, flock stability at extreme settings, opening changes, reduced motion, track resets, sun-shaft control, camera depth and upright phone framing. The settings save correctly on desktop and Android layouts. Startup, navigation, rapid skipping and both extracted startup module graphs pass. A clean Windows package reaches the empty-library welcome screen in 10.7 seconds. The APK retains its package ID and signing certificate and contains the ARM64 runtime.

The preview uses generated test impulses and no personal music or library data. Fish anatomy, water scattering and surface illumination are procedural artistic approximations; fish do not cast volumetric shadows into the shafts. Physical Android performance, heat and battery use still need device testing.
