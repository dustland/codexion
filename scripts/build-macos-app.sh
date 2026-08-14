#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(node -p "require('$PROJECT_ROOT/package.json').version")}" 
BUILD_ROOT="$PROJECT_ROOT/build/macos"
APP="$BUILD_ROOT/Codexion.app"
LAUNCHER="$APP/Contents/MacOS/Codexion"
CORE_EXECUTABLE="$APP/Contents/MacOS/CodexionCore"
IDENTITY="${CODE_SIGN_IDENTITY:--}"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"
SPARKLE_PUBLIC_KEY="${SPARKLE_PUBLIC_KEY:-p10pCSapFVmN7KnFBRuh8icNc0HZ4/o4G0PhKnuTrZ8=}"
SPARKLE_FEED_URL="${SPARKLE_FEED_URL:-https://github.com/lyuai/codexion/releases/latest/download/appcast.xml}"

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
  echo "Codexion's current macOS package target requires an Apple Silicon Mac." >&2
  exit 1
fi

if ! "$NODE_BINARY" --help | grep -q -- "--experimental-sea-config"; then
  echo "The selected Node.js binary does not support SEA: $NODE_BINARY" >&2
  exit 1
fi

if ! grep -a -q "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2" "$NODE_BINARY"; then
  echo "The selected Node.js binary cannot host a SEA payload: $NODE_BINARY" >&2
  echo "Use an official Node.js distribution and set NODE_BINARY to its executable." >&2
  exit 1
fi

SPARKLE_ROOT="$(bash "$PROJECT_ROOT/scripts/fetch-sparkle.sh")"

rm -rf "$BUILD_ROOT"
mkdir -p "$APP/Contents/Frameworks" "$APP/Contents/MacOS" "$APP/Contents/Resources"

pnpm exec esbuild "$PROJECT_ROOT/src/index.ts" \
  --bundle \
  --format=cjs \
  --platform=node \
  --target=node22 \
  --define:import.meta.url='""' \
  --outfile="$BUILD_ROOT/codexion-bundle.cjs"

cat > "$BUILD_ROOT/sea-config.json" <<EOF
{
  "main": "$BUILD_ROOT/codexion-bundle.cjs",
  "output": "$BUILD_ROOT/sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "useCodeCache": false,
  "useSnapshot": false
}
EOF

"$NODE_BINARY" --experimental-sea-config "$BUILD_ROOT/sea-config.json"
cp "$NODE_BINARY" "$CORE_EXECUTABLE"
codesign --remove-signature "$CORE_EXECUTABLE" 2>/dev/null || true
pnpm exec postject "$CORE_EXECUTABLE" NODE_SEA_BLOB "$BUILD_ROOT/sea-prep.blob" \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA
chmod 755 "$CORE_EXECUTABLE"

ditto "$SPARKLE_ROOT/Sparkle.framework" "$APP/Contents/Frameworks/Sparkle.framework"
xcrun swiftc "$PROJECT_ROOT/packaging/CodexionLauncher.swift" \
  -parse-as-library \
  -target arm64-apple-macos13.0 \
  -F "$APP/Contents/Frameworks" \
  -framework AppKit \
  -framework Sparkle \
  -Xlinker -rpath \
  -Xlinker @executable_path/../Frameworks \
  -o "$LAUNCHER"
chmod 755 "$LAUNCHER"

cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key><string>Codexion</string>
  <key>CFBundleExecutable</key><string>Codexion</string>
  <key>CFBundleIconFile</key><string>Codexion</string>
  <key>CFBundleIdentifier</key><string>ai.lyu.codexion</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Codexion</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSMultipleInstancesProhibited</key><true/>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
  <key>SUFeedURL</key><string>$SPARKLE_FEED_URL</string>
  <key>SUPublicEDKey</key><string>$SPARKLE_PUBLIC_KEY</string>
</dict>
</plist>
EOF

cp "$PROJECT_ROOT/assets/Codexion.icns" "$APP/Contents/Resources/Codexion.icns"
cp "$SPARKLE_ROOT/LICENSE" "$APP/Contents/Resources/Sparkle-LICENSE.txt"

SPARKLE_FRAMEWORK="$APP/Contents/Frameworks/Sparkle.framework"
SPARKLE_VERSION_ROOT="$SPARKLE_FRAMEWORK/Versions/B"

sign_component() {
  local target="$1"
  shift
  local attempt
  for attempt in 1 2 3; do
    if [[ "$IDENTITY" == "-" ]]; then
      codesign --force --sign - "$@" "$target" && return
    else
      codesign --force --options runtime --timestamp --sign "$IDENTITY" "$@" "$target" && return
    fi
    if [[ "$attempt" -lt 3 ]]; then
      echo "Code signing failed for $target; retrying ($attempt/3)..." >&2
      sleep 2
    fi
  done
  return 1
}

sign_component "$SPARKLE_VERSION_ROOT/XPCServices/Installer.xpc"
sign_component "$SPARKLE_VERSION_ROOT/XPCServices/Downloader.xpc" --preserve-metadata=entitlements
sign_component "$SPARKLE_VERSION_ROOT/Autoupdate"
sign_component "$SPARKLE_VERSION_ROOT/Updater.app"
sign_component "$SPARKLE_FRAMEWORK"
sign_component "$CORE_EXECUTABLE" --entitlements "$PROJECT_ROOT/packaging/entitlements.plist"
sign_component "$LAUNCHER"
sign_component "$APP"

codesign --verify --deep --strict --verbose=2 "$APP"
echo "$APP"
