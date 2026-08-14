#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(node -p "require('$PROJECT_ROOT/package.json').version")}" 
BUILD_ROOT="$PROJECT_ROOT/build/macos"
APP="$BUILD_ROOT/Codexion.app"
EXECUTABLE="$APP/Contents/MacOS/Codexion"
IDENTITY="${CODE_SIGN_IDENTITY:--}"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"

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

rm -rf "$BUILD_ROOT"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

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
cp "$NODE_BINARY" "$EXECUTABLE"
codesign --remove-signature "$EXECUTABLE" 2>/dev/null || true
pnpm exec postject "$EXECUTABLE" NODE_SEA_BLOB "$BUILD_ROOT/sea-prep.blob" \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA
chmod 755 "$EXECUTABLE"

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
</dict>
</plist>
EOF

cp "$PROJECT_ROOT/assets/Codexion.icns" "$APP/Contents/Resources/Codexion.icns"

if [[ "$IDENTITY" == "-" ]]; then
  codesign --force --sign - --entitlements "$PROJECT_ROOT/packaging/entitlements.plist" "$APP"
else
  codesign --force --options runtime --timestamp --sign "$IDENTITY" \
    --entitlements "$PROJECT_ROOT/packaging/entitlements.plist" "$APP"
fi

codesign --verify --strict --verbose=2 "$APP"
echo "$APP"
