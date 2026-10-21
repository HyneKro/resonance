# Synapse: a luminous web

Windows **1.26.0-dev.7** · Android **0.26.0-dev.7** (versionCode 73). Development channel only.

Open **Visuals → Style → Art direction → Synapse**. This adds an eighth direction; Resonance remains the default.

Fine blue filaments form an irregular, branching web with open pockets, warm luminous junctions and softer foreground and background layers. Bass flexes the larger structure, melody bends individual strands, and percussion sends warm impulses through the connections. Small motes travel along the filaments. Artwork colours tint the materials, while frequency lights illuminate the network.

Junctions and connections remain persistent, keeping the web coherent through musical changes. Attack pulses follow connection lengths and fade after passing. Held loud notes and silence cannot continuously launch new pulses. Paused or frozen playback clocks hold the scene; reduced motion holds signals and suppresses deformation. Changing songs clears the previous impulses. The phone version uses 680 junctions instead of 1,700 and omits the desktop's secondary fine-thread layer. Soft focus is an artistic approximation rather than a physical lens simulation.

Development installations receive the update through **Settings → App updates**. Ordinary installations need a one-time development ZIP/APK installation to enter the test channel. Keep the Windows trial in a separate portable folder. The Android APK updates the existing signed app and preserves its data; confirm installation through Android and do not uninstall. The ordinary releases, main branch and public download buttons remain unchanged.

Verification: 496 shared tests and 134 native Android tests passed. Android lint reports zero errors and nine existing warnings. Actual GPU checks pass for all eight directions, including frequency lights, independent musical responses, stable paused frames and graphics-context recovery. Synapse-specific checks cover connected topology, graph-distance consistency, bounded attack storage, travelling impulses, the Musical flashes control, frozen/reduced-motion signals, camera depth and clearing signals on a new track. Windows and compact-phone interface checks pass, as do startup, queue and rapid-skip checks. Both extracted startup module graphs pass, and a clean Windows package reaches the empty-library welcome screen. Android retains its package ID and previous signing certificate.

The visual checks and silent motion preview use generated test impulses, with no personal music or library data. Physical Android performance, heat and battery use still require device testing. Compare quiet music, vocals and percussion-heavy tracks, and try the camera and frequency-light controls.
