#!/bin/bash
set -e

echo "🚀 Building Unitodo Electron App for macOS"

# Step 1: Build the Rust backend
echo "📦 Building Rust backend..."
cargo build --release

# Step 2: Build the Next.js frontend
echo "📦 Building Next.js frontend..."
npm run build

# Step 3: Package with Electron Builder
echo "📦 Packaging with Electron Builder..."
npm run build:electron

echo "✅ Build complete! Check the 'dist' directory for your macOS app."
echo "   You can run the app with 'open dist/mac/Unitodo.app'"
