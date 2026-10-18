# Resonance 1.15.4 · Windows notification icon

Resonance now keeps its app icon in the Windows notification area while running, including when minimized or hidden. Click or double-click it to restore and focus the player. Right-click for Open Resonance, Hide window and Quit Resonance. The tooltip indicates when the window is running in the background.

Hide window keeps playback going. Quit uses the existing save-before-close path so playback position is retained; repeated close requests no longer start duplicate saves. Closing the main window still exits as before. The icon is removed on exit and before restarting for an update. A deliberate hide during startup is respected by the update-window visibility fallback.

Validation: all 334 JavaScript tests pass. An isolated native Windows check confirms icon registration, the actual menu, restoring a minimized window, hiding without exiting, waiting for save-before-close and removing the icon. Both extracted distribution module graphs and clean empty-library Windows startup pass. No personal library or running music app was used for verification.
