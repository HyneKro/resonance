# Aerial: spheres with light and weight

Windows **1.26.0-dev.4** · Android **0.26.0-dev.4** (versionCode 70). Development channel only.

Choose **Visuals → Style → Art direction → Aerial**. Resonance remains the default, and all six existing directions remain available.

Aerial brings a calm studio sculpture into the visualizer: a large porcelain sphere surrounded by smaller pastel, pearl, polished-metal and frosted-glass spheres. Soft lighting, depth, shadows and reflections give them volume. Cover colors tint the surfaces gently; frequency lights add restrained highlights.

Bass changes buoyancy, percussion nudges the spheres, and melody changes their drift and lighting. Slow weight changes create floating and settling phases. Spheres collide and exchange motion according to their size; the large forms feel heavier. The phone uses 16 spheres instead of 24, with its existing adaptive rendering quality.

The physical world uses fixed steps and interpolation, stops when frozen, and does no catch-up after leaving the scene or a long hidden gap. Reduced motion holds the positions still. No textures, models or additional audio analysis are downloaded. Frosted glass uses a stylized lighting approximation rather than full scene refraction.

Automated checks cover physical stability, collisions, independent musical inputs, frame-rate consistency, frozen motion, graphics recovery, saving the new style and compact phone layouts. Sustained battery, heat and performance testing on a physical Android device remains to be done. The approved release channel and website remain unchanged.

Verification: 489 shared tests and 134 Android unit tests passed. Android lint reports zero errors and nine existing warnings. Hidden desktop and phone-layout tests pass for all seven directions; graphics tests cover independent audio roles, frozen physics and context recovery.
