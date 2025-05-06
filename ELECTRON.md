# Unitodo Electron App

This document explains how to build and run the Unitodo Electron app for macOS.

## Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)
- Rust and Cargo

## Development

To run the app in development mode:

```bash
npm install
npm run electron:dev
```

This will start both the Next.js dev server and Electron in development mode.

## Building for Production

To build the app for production:

1. Build the Rust backend first:

```bash
cargo build --release
```

2. Build the Next.js frontend and package with Electron:

```bash
npm run electron:build
```

The packaged app will be in the `dist` directory.

## App Structure

- `electron/main.js`: Main Electron process
- `electron/preload.js`: Preload script for the renderer process
- `out/`: Contains the built Next.js app
- `target/release/`: Contains the built Rust backend

## Notes

- The app embeds the Rust backend inside the Electron app package
- Communication between the frontend and Rust backend happens through HTTP (localhost:8080)
- All Unitodo functionality is preserved in the Electron wrapper
