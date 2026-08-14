#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPARKLE_VERSION="${SPARKLE_VERSION:-2.9.2}"
SPARKLE_SHA256="${SPARKLE_SHA256:-1cb340cbbef04c6c0d162078610c25e2221031d794a3449d89f2f56f4df77c95}"
DEPENDENCY_ROOT="${SPARKLE_DEPENDENCY_ROOT:-$PROJECT_ROOT/build/dependencies/sparkle-$SPARKLE_VERSION}"
ARCHIVE="$DEPENDENCY_ROOT/Sparkle-$SPARKLE_VERSION.tar.xz"
FRAMEWORK="$DEPENDENCY_ROOT/Sparkle.framework"

if [[ -d "$FRAMEWORK" && -x "$DEPENDENCY_ROOT/bin/generate_appcast" ]]; then
  echo "$DEPENDENCY_ROOT"
  exit 0
fi

mkdir -p "$DEPENDENCY_ROOT"
curl --fail --location --silent --show-error \
  "https://github.com/sparkle-project/Sparkle/releases/download/$SPARKLE_VERSION/Sparkle-$SPARKLE_VERSION.tar.xz" \
  --output "$ARCHIVE"

ACTUAL_SHA256="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
if [[ "$ACTUAL_SHA256" != "$SPARKLE_SHA256" ]]; then
  echo "Sparkle archive checksum mismatch: expected $SPARKLE_SHA256, got $ACTUAL_SHA256" >&2
  exit 1
fi

tar -xJf "$ARCHIVE" -C "$DEPENDENCY_ROOT"
test -d "$FRAMEWORK"
test -x "$DEPENDENCY_ROOT/bin/generate_appcast"
echo "$DEPENDENCY_ROOT"
