const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

// gRPC imports
const grpc = require('@grpc/grpc-js');
const { TodoServiceClient } = require('../app/grpc-generated/unitodo_grpc_pb'); // Adjusted path
const { ConfigServiceClient } = require('../app/grpc-generated/unitodo_grpc_pb'); // Adjusted path
const {
    GetTodosRequest,
    // GetTodosResponse, // Response types used in callbacks, not directly in ipcMain handler return for now
    EditTodoRequest,
    // EditTodoResponse,
    AddTodoRequest,
    // AddTodoResponse,
    MarkDoneRequest,
    // MarkDoneResponse,
    GetConfigRequest,
    // GetConfigResponse,
    UpdateConfigRequest,
    // UpdateConfigResponse,
    ConfigMessage: PbConfigMessage, // Aliasing for clarity if used by helpers
    RgConfigMessage: PbRgConfigMessage,
    ProjectConfigMessage: PbProjectConfigMessage,
    TodoDonePair: PbTodoDonePair,
    // TodoItem as PbTodoItem, // Not directly used in main for now, but good to list if needed
    // TodoCategory as PbTodoCategory // Not directly used in main for now
} = require('../app/grpc-generated/unitodo_pb'); // Adjusted path for messages

// Keep a global reference of objects to prevent garbage collection
let mainWindow;
let rustBackendProcess;

const GRPC_BACKEND_ADDRESS = 'localhost:50051';
let todoClient;
let configClient;

function initializeGrpcClients() {
    if (!todoClient) {
        todoClient = new TodoServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
    }
    if (!configClient) {
        configClient = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
    }
    // It's good practice to manage client lifecycle, e.g., close them on app quit,
    // but for simplicity, we'll keep them open while the app runs.
    // Clients are somewhat lightweight and can be recreated if necessary.
    // Alternatively, check for connectivity before each call if keeping them long-lived.
}

// --- Data Transformation Helpers (adapted from services/configService.ts) ---
// These are needed if the main process is constructing messages for the gRPC client
// or interpreting responses in detail. For now, main just passes payloads.
// If complex transformations are needed, these would be filled out.
// For this IPC bridge, the renderer will likely send already structured JSON payloads
// that match the *expected* structure of gRPC request messages, and main will map them.

// AppConfig (frontend) to PbConfigMessage (gRPC)
function appConfigToGrpcConfigMessage(appConfig) { // appConfig will be plain JS object from IPC
    const configMessage = new PbConfigMessage();
    
    const rgMessage = new PbRgConfigMessage();
    rgMessage.setPathsList(appConfig.rg?.paths || []);
    rgMessage.setIgnoreList(appConfig.rg?.ignore || []); 
    rgMessage.setFileTypesList(appConfig.rg?.file_types || []);
    configMessage.setRg(rgMessage);

    const projectsMap = configMessage.getProjectsMap();
    if (appConfig.projects) {
        for (const [key, value] of Object.entries(appConfig.projects)) {
            const projectMessage = new PbProjectConfigMessage();
            projectMessage.setPatternsList(value.patterns || []);
            if (value.append_file_path) {
                projectMessage.setAppendFilePath(value.append_file_path);
            }
            projectsMap.set(key, projectMessage);
        }
    }

    configMessage.setRefreshInterval(appConfig.refresh_interval);
    configMessage.setEditorUriScheme(appConfig.editor_uri_scheme);
    
    const todoDonePairs = (appConfig.todo_done_pairs || []).map(pairArray => {
        const pairMessage = new PbTodoDonePair();
        pairMessage.setTodoMarker(pairArray[0] || "");
        pairMessage.setDoneMarker(pairArray[1] || "");
        return pairMessage;
    });
    configMessage.setTodoDonePairsList(todoDonePairs);
    configMessage.setDefaultAppendBasename(appConfig.default_append_basename);
    
    return configMessage;
}

// PbConfigMessage (gRPC) to AppConfig (frontend) - if main process needs to interpret
function grpcConfigMessageToAppConfig(configMessage) { // configMessage is gRPC response object
    const projects = {};
    configMessage.getProjectsMap().forEach((value, key) => { // Direct access to map methods
        projects[key] = {
            patterns: value.getPatternsList(),
            append_file_path: value.hasAppendFilePath() ? value.getAppendFilePath() : undefined,
        };
    });
    const rgConfig = configMessage.getRg();
    return {
        rg: {
            paths: rgConfig?.getPathsList() || [],
            ignore: rgConfig?.getIgnoreList() || [],
            file_types: rgConfig?.getFileTypesList() || [],
        },
        projects: projects,
        refresh_interval: configMessage.getRefreshInterval(),
        editor_uri_scheme: configMessage.getEditorUriScheme(),
        todo_done_pairs: configMessage.getTodoDonePairsList().map(pair => [pair.getTodoMarker(), pair.getDoneMarker()]),
        default_append_basename: configMessage.getDefaultAppendBasename(),
    };
}

// Start the Rust backend process
function startRustBackend() {
  if (rustBackendProcess && !rustBackendProcess.killed) {
    if (rustBackendProcess.pid) {
      console.log(`[Electron Main] Rust backend process (pid: ${rustBackendProcess.pid}) already exists. Skipping new spawn.`);
      initializeGrpcClients(); // Ensure clients are ready if backend is already up
      return Promise.resolve();
    } else {
      console.log('[Electron Main] Rust backend process object exists but without PID. Proceeding with start attempt cautiously.');
    }
  }

  console.log('[Electron Main] Starting Rust backend...');
  
  let backendExecutablePath;

  if (app.isPackaged) {
    const execName = process.platform === 'win32' ? 'unitodo.exe' : 'unitodo';
    backendExecutablePath = path.join(process.resourcesPath, 'rust-backend', execName);
    console.log(`[Electron Main - Packaged Mode] Attempting to spawn Rust backend from: ${backendExecutablePath}`);
  } else {
    const projectRoot = path.join(__dirname, '..'); 
    const execName = process.platform === 'win32' ? 'unitodo.exe' : 'unitodo';
    backendExecutablePath = path.join(projectRoot, 'target', 'release', execName);
    console.log(`[Electron Main - Unpackaged Mode] Attempting to spawn Rust backend from: ${backendExecutablePath}`);
  }

  try {
    rustBackendProcess = spawn(backendExecutablePath, [], { stdio: 'pipe' });

    rustBackendProcess.on('error', (err) => {
      console.error(`[Electron Main] Spawned Rust backend process emitted an error: ${err}`);
      // Consider setting rustBackendProcess = null or attempting a specific recovery
    });

  } catch (err) {
     console.error(`[Electron Main] Failed to spawn Rust backend directly at ${backendExecutablePath}:`, err);
     if (isDev) { 
        console.log('[Electron Main] Falling back to cargo run --release for Rust backend (isDev is true)...');
        rustBackendProcess = spawn('cargo', ['run', '--release'], {
            cwd: path.join(__dirname, '..'), 
            stdio: 'pipe', 
        });
        rustBackendProcess.on('error', (cargoErr) => { // Also handle error for cargo spawn
            console.error('[Electron Main] Cargo run fallback also failed:', cargoErr);
            // No process means the promise below might reject or resolve too soon.
            // We should ensure rustBackendProcess is null if cargo run fails to start.
            rustBackendProcess = null; 
        });
     } else {
        console.error('[Electron Main] Rust backend direct spawn failed in non-dev (NODE_ENV=production) unpackaged mode. Ensure target/release/unitodo exists.');
        return Promise.reject(err); 
     }
  }

  if (rustBackendProcess) { // Only set up listeners if spawn attempt was made / successful
    rustBackendProcess.stdout.on('data', (data) => {
      console.log(`Rust backend stdout: ${data}`);
    });
    rustBackendProcess.stderr.on('data', (data) => {
      console.error(`Rust backend stderr: ${data}`);
    });
    rustBackendProcess.on('close', (code) => {
      console.log(`[Electron Main] Rust backend process exited with code ${code}`);
      if (code !== 0 && !app.isQuitting) { 
        console.error('[Electron Main] Rust backend closed unexpectedly. Not attempting auto-restart.');
      }
    });
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const resolveOnce = () => {
        if (!resolved) {
            resolved = true;
            initializeGrpcClients(); // Initialize clients once backend is presumed started
            resolve();
        }
    };
    const rejectOnce = (err) => {
        if (!resolved) {
            resolved = true; // Prevent calling resolve after reject
            reject(err);
        }
    };

    if (rustBackendProcess && rustBackendProcess.pid) {
        console.log('[Electron Main] Rust backend process spawned, waiting for it to initialize...');
        // Wait for a specific message from stdout or a timeout
        const readyTimeout = setTimeout(() => {
            console.warn('[Electron Main] Timeout waiting for Rust backend ready message. Assuming started.');
            resolveOnce();
        }, 5000); // Increased timeout

        rustBackendProcess.stdout.on('data', function listener(data) {
            if (data.toString().includes('Unitodo gRPC server listening')) {
                console.log('[Electron Main] Rust backend reported gRPC server listening.');
                clearTimeout(readyTimeout);
                if (rustBackendProcess) { // check again in case it closed quickly
                    rustBackendProcess.stdout.removeListener('data', listener);
                }
                resolveOnce();
            }
        });
        rustBackendProcess.on('error', (err) => { // Catch spawn errors propagated to the process object
            clearTimeout(readyTimeout);
            console.error('[Electron Main] Rust backend process object emitted error during startup:', err);
            rejectOnce(err);
        });
        rustBackendProcess.on('close', (code) => { // Handle if backend closes before ready
            if (!resolved) { // Only act if we haven't already resolved/rejected
                clearTimeout(readyTimeout);
                console.error(`[Electron Main] Rust backend closed with code ${code} before gRPC was ready.`);
                rejectOnce(new Error(`Rust backend closed prematurely with code ${code}`));
            }
        });

    } else if (rustBackendProcess && isDev) {
        console.log('[Electron Main] Rust backend (cargo run) process object created, waiting...');
        setTimeout(resolveOnce, 7000); // Longer for cargo
    } else {
        console.error('[Electron Main] Rust backend process not found or failed to start. Cannot initialize gRPC clients.');
        rejectOnce(new Error('Rust backend process failed to start.'));
    }
  });
}

// Create the main Electron window
async function createWindow() {
  try {
    await startRustBackend();
  } catch (error) {
    console.error("[Electron Main] Critical error starting backend. Aborting window creation.", error);
    app.quit(); // Quit if backend fails to start and is critical
    return;
  }
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Kept for testing asset loading, review for production
    },
    titleBarStyle: 'hidden', // Completely hide native title bar
    frame: false, // Remove the frame completely
    transparent: true, // Allow for rounded corners and custom appearance
    backgroundColor: '#f5f5f5'
  });

  // Load the Next.js app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  console.log(`[Electron Main] Attempting to load URL: ${startUrl}`);
  try {
    await mainWindow.loadURL(startUrl);
    console.log(`[Electron Main] Successfully loaded URL: ${startUrl}`);
  } catch (error) {
    console.error(`[Electron Main] Failed to load URL: ${startUrl}`, error);
  }
  
  if (isDev) {
    mainWindow.webContents.openDevTools(); // Only open if isDev is true
  }

    // Handle window control events from renderer
  ipcMain.on('window-control', (event, command) => {
    if (!mainWindow) return;
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
app.whenReady().then(() => {
  ipcMain.handle('get-todos', handleGetTodos);
  ipcMain.handle('edit-todo', handleEditTodo);
  ipcMain.handle('add-todo', handleAddTodo);
  ipcMain.handle('mark-done', handleMarkDone);
  ipcMain.handle('get-config', handleGetConfig);
  ipcMain.handle('update-config', handleUpdateConfig);
  
  // Create window after IPC handlers are set up, and after backend start attempt
  createWindow(); 
});

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
  if (todoClient) {
      console.log('[Electron Main] Closing TodoServiceClient.');
      todoClient.close();
  }
  if (configClient) {
      console.log('[Electron Main] Closing ConfigServiceClient.');
      configClient.close();
  }
  if (rustBackendProcess && !rustBackendProcess.killed) {
    console.log('[Electron Main] Shutting down Rust backend process...');
    rustBackendProcess.kill();
  }
});

// IPC Handlers
async function handleGetTodos() {
    if (!todoClient) throw new Error('TodoService client not initialized');
    const request = new GetTodosRequest();
    return new Promise((resolve, reject) => {
        todoClient.getTodos(request, (error, response) => {
            if (error) return reject(error);
            // Transform response if necessary, for now, pass as is (renderer will handle)
            // Assuming renderer expects the direct gRPC response structure for now
            // Or transform to plain JS object:
            const categories = response.getCategoriesList().map(cat => {
                const todos = cat.getTodosList().map(item => item.toObject());
                return { ...cat.toObject(), todosList: todos }; // todosList to match protobuf-js, or map to 'todos'
            });
            resolve({ categoriesList: categories }); // Match GetTodosResponse structure loosely
        });
    });
}

async function handleEditTodo(event, payload) {
    if (!todoClient) throw new Error('TodoService client not initialized');
    const request = new EditTodoRequest();
    request.setLocation(payload.location);
    request.setNewContent(payload.new_content);
    request.setOriginalContent(payload.original_content);
    request.setCompleted(payload.completed);
    return new Promise((resolve, reject) => {
        todoClient.editTodo(request, (error, response) => {
            if (error) return reject(error);
            resolve(response.toObject());
        });
    });
}

async function handleAddTodo(event, payload) {
    if (!todoClient) throw new Error('TodoService client not initialized');
    const request = new AddTodoRequest();
    request.setCategoryType(payload.category_type);
    request.setCategoryName(payload.category_name);
    request.setContent(payload.content);
    if (payload.example_item_location) {
        request.setExampleItemLocation(payload.example_item_location);
    }
    return new Promise((resolve, reject) => {
        todoClient.addTodo(request, (error, response) => {
            if (error) return reject(error);
            resolve(response.toObject());
        });
    });
}

async function handleMarkDone(event, payload) {
    if (!todoClient) throw new Error('TodoService client not initialized');
    const request = new MarkDoneRequest();
    request.setLocation(payload.location);
    request.setOriginalContent(payload.original_content);
    return new Promise((resolve, reject) => {
        todoClient.markDone(request, (error, response) => {
            if (error) return reject(error);
            resolve(response.toObject());
        });
    });
}

async function handleGetConfig() {
    if (!configClient) throw new Error('ConfigService client not initialized');
    const request = new GetConfigRequest();
    return new Promise((resolve, reject) => {
        configClient.getConfig(request, (error, response) => {
            if (error) return reject(error);
            if (response && response.hasConfig()) {
                // Use the helper to convert to a plain JS object structure renderer expects
                resolve(grpcConfigMessageToAppConfig(response.getConfig()));
            } else {
                reject(new Error('No config in response from gRPC backend'));
            }
        });
    });
}

async function handleUpdateConfig(event, appConfigPayload) {
    if (!configClient) throw new Error('ConfigService client not initialized');
    const request = new UpdateConfigRequest();
    // Use helper to convert plain JS object from renderer to gRPC message
    request.setConfig(appConfigToGrpcConfigMessage(appConfigPayload));
    return new Promise((resolve, reject) => {
        configClient.updateConfig(request, (error, response) => {
            if (error) return reject(error);
            resolve(response.toObject());
        });
    });
}
