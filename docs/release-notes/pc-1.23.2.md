# Resonance PC 1.23.2 — Updates that move past a stuck package

- Downloaded updates no longer stop automatic discovery. If a newer release appears, the app replaces the queued package according to your download preferences.
- **Restart & update** checks for a newer version before staging. A replacement becomes ready for your confirmation; it does not silently restart the app.
- A failed installation immediately checks once for a replacement. The failed version is remembered across launches and is not automatically retried in a loop.
- Manual checks remain available. Offline checks preserve a verified download, cancellation stops the installation attempt, and stale release listings cannot downgrade a queued version.
- Normal checks run every six hours, queued-update checks every 30 minutes, and failure recovery checks every five minutes. Automatic-check/download preferences are respected.

Includes the portable packaging correction from 1.23.1. Versions already stuck on 1.22.0 still need a one-time recovery to receive this new updater; publishing a new release cannot change code inside an older running app.

Validation: 436 JavaScript tests; complete archive staging through the original 1.22.0 updater; packaged frontend dependency checks; clean Windows welcome; updater UI checks. Regression tests cover queued replacements, install-time discovery, failure recovery across relaunch, cancellation, duplicate clicks, offline checks and retained download preferences.
