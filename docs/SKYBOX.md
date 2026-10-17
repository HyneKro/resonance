# Constellation sky assets

The official Windows and Android builds incorporate a reduced, tone-mapped
panorama from **Space Skybox Collection 4 by Makemake**, licensed by the owner
through [Fab](https://www.fab.com/listings/a3cb43ba-e415-4a09-9cde-062e3909fd27).
The panorama remains subject to its Fab licence, not the application's source
licence. It is provided for use within Resonance, not as a standalone asset.

Purchased Unreal projects, original textures and intermediate exports are kept
outside version control. The public source runs independently with a procedural
sky. It does not require Unreal Engine or a Fab account.

For authorized local release builds, place an optimized 2:1 WebP rendition in
`.private/skybox/desktop.webp` (4096 × 2048) and `mobile.webp` (2048 × 1024).
The Windows packaging/sharing scripts and Android `prepareSkyboxAsset` task
embed the appropriate rendition in `constellation-sky-texture.js` in the build
output only. Missing private assets restore the procedural fallback, including
after a previous licensed build. Never commit generated copies of that module
or upload the purchased asset pack as a source or standalone release asset.

Both skies share the same camera projection, background depth stars and dust.
Texture decoding is asynchronous; pixel preparation yields between row batches.
The sky's graphics context is released when leaving Constellation.
