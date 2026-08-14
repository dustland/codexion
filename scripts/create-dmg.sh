#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(node -p "require('$PROJECT_ROOT/package.json').version")}" 
BUILD_ROOT="$PROJECT_ROOT/build/macos"
APP="$BUILD_ROOT/Codexion.app"
DMG="$BUILD_ROOT/Codexion-v$VERSION-arm64.dmg"
STAGING="$BUILD_ROOT/dmg-root"
IDENTITY="${CODE_SIGN_IDENTITY:-}"

if [[ ! -d "$APP" ]]; then
  echo "Build Codexion.app before creating the DMG." >&2
  exit 1
fi

rm -rf "$STAGING" "$DMG"
mkdir -p "$STAGING"
cp -R "$APP" "$STAGING/Codexion.app"
ln -s /Applications "$STAGING/Applications"

hdiutil create -volname "Codexion" -srcfolder "$STAGING" -ov -format UDZO "$DMG"

if [[ -n "$IDENTITY" ]]; then
  codesign --force --timestamp --sign "$IDENTITY" "$DMG"
fi

(cd "$BUILD_ROOT" && shasum -a 256 "$(basename "$DMG")" > "$(basename "$DMG").sha256")
echo "$DMG"
