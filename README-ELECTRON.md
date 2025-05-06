# Unitodo Electron App for macOS

This is the Electron version of Unitodo, packaging the Next.js frontend and Rust backend into a single desktop application for macOS.

## Development

To set up the development environment:

```bash
# Install dependencies
npm install

# Run in development mode (starts both Next.js and Electron)
npm run electron:dev
```

## Building

To build the Electron app for macOS:

```bash
# Option 1: Use the build script
./build-electron.sh

# Option 2: Manual build
# Build Rust backend
cargo build --release

# Build Next.js frontend 
npm run build

# Package with Electron Builder
npm run build:electron
```

The packaged app will be available in the `dist` directory.

## Architecture

The Electron app consists of:

1. **Main Process** (`electron/main.js`): Controls app lifecycle and spawns the Rust backend
2. **Preload Script** (`electron/preload.js`): Provides a bridge between Electron and renderer
3. **Rust Backend**: Packaged within the app, starts automatically
4. **Next.js Frontend**: Renders the UI and communicates with the Rust backend

## Notes

- The app detects when it's running in Electron and adjusts API endpoints appropriately
- Custom title bar for macOS provides a native look and feel
- All Unitodo functionality is fully preserved
