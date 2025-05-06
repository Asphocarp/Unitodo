const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of objects to prevent garbage collection
let mainWindow;
let rustBackendProcess;

// Start the Rust backend process
function startRustBackend() {
  console.log('Starting Rust backend...');
  
  // Path to the compiled Rust executable
  // In development, we'll use cargo run, in production we need the packaged binary
  if (isDev) {
    rustBackendProcess = spawn('cargo', ['run', '--release'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });
  } else {
    // In production, use the packaged binary
    const execPath = process.platform === 'win32' ? 'unitodo.exe' : 'unitodo';
    const rustPath = path.join(
      process.resourcesPath, 
      'rust-backend', 
      execPath
    );
    
    rustBackendProcess = spawn(rustPath, [], { stdio: 'pipe' });
  }

  // Log output from the Rust process
  rustBackendProcess.stdout.on('data', (data) => {
    console.log(`Rust backend stdout: ${data}`);
  });

  rustBackendProcess.stderr.on('data', (data) => {
    console.error(`Rust backend stderr: ${data}`);
  });

  rustBackendProcess.on('close', (code) => {
    console.log(`Rust backend process exited with code ${code}`);
    if (code !== 0 && !app.isQuitting) {
      console.log('Attempting to restart Rust backend...');
      startRustBackend();
    }
  });

  // Wait a bit for the server to start
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

// Create the main Electron window
async function createWindow() {
  // Start the Rust backend first
  await startRustBackend();
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset', // For macOS style
    backgroundColor: '#f5f5f5'
  });

  // Load the Next.js app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  await mainWindow.loadURL(startUrl);
  
  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

    // Handle window control events from renderer
  ipcMain.on('window-control', (event, command) => {
    switch (command) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.close();
        break;
      default:
        console.log(`Unknown window command: ${command}`);
    }
  });

  // Set up application menu for macOS
  if (process.platform === 'darwin') {
    const template = [
      { role: 'appMenu' },
      { role: 'fileMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Unitodo',
            click: async () => {
              await shell.openExternal('https://github.com/Asphocarp/Unitodo');
            }
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    // For non-macOS, you might want to set up a different menu or use the default
    Menu.setApplicationMenu(null);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS re-create a window when the dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// Properly clean up the Rust backend when quitting
app.on('before-quit', () => {
  app.isQuitting = true;
  if (rustBackendProcess && !rustBackendProcess.killed) {
    console.log('Shutting down Rust backend...');
    rustBackendProcess.kill();
  }
});
