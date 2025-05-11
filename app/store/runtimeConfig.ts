import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core'; // Using @tauri-apps/api/core for v2

let currentGrpcPort: number | null = null;
let portInitialized = false;
let initializationPromise: Promise<number | null> | null = null;

async function initializeGrpcPort(): Promise<number | null> {
    if (portInitialized) {
        return currentGrpcPort;
    }
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            console.log('[RuntimeConfig] Initializing gRPC port...');
            // Try to get from command first as a quick check or if event is missed
            try {
                const portFromCommand = await invoke<number>('get_grpc_port_command');
                if (portFromCommand) {
                    console.log(`[RuntimeConfig] gRPC port from command: ${portFromCommand}`);
                    currentGrpcPort = portFromCommand;
                    portInitialized = true;
                    // Still listen for event in case it updates or arrives later
                } else {
                    console.warn('[RuntimeConfig] get_grpc_port_command returned null/undefined initially.');
                }
            } catch (cmdErr) {
                console.warn('[RuntimeConfig] Error invoking get_grpc_port_command initially:', cmdErr);
            }

            // Listen for the event from Tauri
            const unlisten = await listen<number>('grpc_port_discovered', (event) => {
                console.log(`[RuntimeConfig] Event 'grpc_port_discovered' received, port: ${event.payload}`);
                currentGrpcPort = event.payload;
                portInitialized = true;
                // Optionally, if you have subscribers, notify them here.
            });

            // In a real app, you might want to handle unlisten() on component unmount or app shutdown
            // For this module, it will listen for the lifetime of the app.
            console.log('[RuntimeConfig] Listening for grpc_port_discovered event.');

            // If after a short delay, port is still not set by event, rely on command or default
            if (!portInitialized) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for event
                if (!portInitialized && !currentGrpcPort) {
                    console.warn('[RuntimeConfig] gRPC port not discovered via event after 1s, relying on initial command fetch or fallback.');
                }
            }

        } catch (error) {
            console.error('[RuntimeConfig] Error initializing gRPC port listener or invoking command:', error);
        }
        initializationPromise = null; // Clear promise after resolution
        portInitialized = true; // Mark as initialized even if port is null to prevent re-runs
        return currentGrpcPort;
    })();
    return initializationPromise;
}

// Function to get the port, ensures initialization is attempted
export async function getRuntimeGrpcPort(): Promise<number | null> {
    if (!portInitialized) {
        return initializeGrpcPort();
    }
    return currentGrpcPort;
}

// Call initialize early, but don't block export
if (typeof window !== 'undefined') { // Ensure this only runs in a browser-like environment
    initializeGrpcPort();
} 