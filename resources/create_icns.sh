#!/bin/bash
# Script to create .icns file from an image for macOS app icon

# Check if input file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_source_image>"
  exit 1
fi

SOURCE_IMAGE="$1"
ICONSET_DIR="./resources/icon.iconset"

# Create the iconset directory if it doesn't exist
mkdir -p "$ICONSET_DIR"

# Generate all required icon sizes for macOS
echo "Generating icon sizes..."
sips -z 16 16 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_16x16.png"
sips -z 32 32 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_16x16@2x.png"
sips -z 32 32 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_32x32.png"
sips -z 64 64 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_32x32@2x.png"
sips -z 128 128 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_128x128.png"
sips -z 256 256 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_128x128@2x.png"
sips -z 256 256 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_256x256.png"
sips -z 512 512 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_256x256@2x.png"
sips -z 512 512 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_512x512.png"
sips -z 1024 1024 "$SOURCE_IMAGE" --out "${ICONSET_DIR}/icon_512x512@2x.png"

# Convert the iconset to .icns
echo "Converting to .icns file..."
iconutil -c icns "./resources/icon.iconset" -o "./resources/icon.icns"

# Check if conversion was successful
if [ -f "./resources/icon.icns" ]; then
  echo "✅ Successfully created icon.icns"
  echo "   Location: ./resources/icon.icns"
  
  # Clean up the iconset directory
  echo "Cleaning up temporary files..."
  rm -rf "./resources/icon.iconset"
else
  echo "❌ Failed to create icon.icns"
fi

# test with `npm run electron:package:mac`