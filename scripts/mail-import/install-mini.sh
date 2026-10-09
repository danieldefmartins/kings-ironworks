#!/bin/bash
# Copy the mail importer to the Mac mini and (re)load its launchd job.
# Run from the repo root on the laptop:  bash scripts/mail-import/install-mini.sh
# The plist is loaded on the MINI only — never on the laptop.
set -euo pipefail
MINI="${MINI:-100.71.2.36}"
DEST="Agents-Operation/kiw-mail-import"
ssh -o BatchMode=yes "$MINI" "mkdir -p ~/$DEST/scripts/mail-import ~/$DEST/src/lib/shop ~/$DEST/logs"
scp -q scripts/mail-import/emlx.mjs scripts/mail-import/import-mail.mjs "$MINI:$DEST/scripts/mail-import/"
scp -q src/lib/shop/customer-files.ts "$MINI:$DEST/src/lib/shop/"
# ES modules, so Node loads the shared .ts rules without a reparse warning.
ssh -o BatchMode=yes "$MINI" "echo '{\"type\":\"module\",\"private\":true}' > ~/$DEST/package.json"
scp -q scripts/mail-import/com.kiw.mail-import.plist "$MINI:Library/LaunchAgents/"
ssh -o BatchMode=yes "$MINI" 'launchctl bootout gui/$(id -u)/com.kiw.mail-import 2>/dev/null || true; launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.kiw.mail-import.plist && echo loaded'
