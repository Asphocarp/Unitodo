interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  appVersion: string;
  
  sendMessage: (channel: string, data: any) => void;
  on: (channel: string, func: (...args: any[]) => void) => void;
  removeListener: (channel: string, func: (...args: any[]) => void) => void;
  
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

interface Window {
  electron: ElectronAPI;
  electronApi: {
    getTodos: () => Promise<any>;
    editTodo: (payload: any) => Promise<any>;
    addTodo: (payload: any) => Promise<any>;
    markDone: (payload: any) => Promise<any>;
    getConfig: () => Promise<any>;
    updateConfig: (config: any) => Promise<any>;
  };
} 