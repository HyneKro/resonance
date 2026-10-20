# Installed updater compatibility baseline

`prepare-update-1.22.0.ps1` is an unchanged copy from the published Windows 1.22.0 portable ZIP. It intentionally stays independent of the current updater.

The 1.23.0 ZIP accidentally put a PowerShell helper directly under `resources/app/`, where existing updaters allow only JavaScript modules and JSON. A clean launch test did not catch that installation failure. The publishing gate now runs this installed validator against the entire release ZIP, extracts it and verifies all hashes before uploading anything.

Keep helpers inside the already-supported `electron/` directory. Do not change this fixture to accommodate new package layouts: installed copies cannot receive a changed validator until they can install the update.
