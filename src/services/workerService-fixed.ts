// src/services/workerService.ts

export type WorkerMessage = {
    event: string;
    payload: any;
};

export type WorkerCommand = {
    command: string;
    payload: any;
};

class WorkerService {
    private worker: SharedWorker;
    private port: MessagePort;
    private messageHandlers: Map<string, (payload: any) => void> = new Map();
    private isInitialized = false;

    constructor() {
        console.log('[WORKER SERVICE] Initializing SharedWorker...');
        // Create the SharedWorker
        this.worker = new SharedWorker(
            new URL('../workers/database.worker.ts', import.meta.url), 
            {
                name: 'sql-tool-database-worker',
                type: 'module'
            }
        );

        this.port = this.worker.port;
        this.setupEventHandlers();
        this.port.start();
        console.log('[WORKER SERVICE] SharedWorker started');
    }

    private setupEventHandlers() {
        this.port.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const { event: eventName, payload } = event.data;
            console.log(`[WORKER SERVICE] Received event from worker: ${eventName}`, payload);
            
            // Handle initialization
            if (eventName === 'DB_INITIALIZED') {
                this.isInitialized = true;
                console.log('[WORKER SERVICE] Database marked as initialized');
            }
            
            // Call registered handlers
            const handler = this.messageHandlers.get(eventName);
            if (handler) {
                console.log(`[WORKER SERVICE] Calling handler for event: ${eventName}`);
                handler(payload);
            } else {
                console.warn(`[WORKER SERVICE] No handler registered for event: ${eventName}`);
            }
        };

        this.worker.onerror = (error) => {
            console.error('[WORKER SERVICE] SharedWorker error:', error);
        };
    }

    private sendCommand(command: string, payload: any): string {
        const requestId = crypto.randomUUID();
        const message: WorkerCommand = {
            command,
            payload: {
                requestId,
                ...payload
            }
        };
        
        console.log(`[WORKER SERVICE] Sending command to worker: ${command}`, message);
        
        // Check if payload contains ArrayBuffer and use transferable objects
        const transferableObjects: Transferable[] = [];
        if (payload.fileBuffer && payload.fileBuffer instanceof ArrayBuffer) {
            transferableObjects.push(payload.fileBuffer);
        }
        
        if (transferableObjects.length > 0) {
            this.port.postMessage(message, transferableObjects);
        } else {
            this.port.postMessage(message);
        }
        
        return requestId;
    }

    // Register an event handler
    on(event: string, handler: (payload: any) => void) {
        console.log(`[WORKER SERVICE] Registering handler for event: ${event}`);
        this.messageHandlers.set(event, handler);
    }

    // Unregister an event handler
    off(event: string) {
        console.log(`[WORKER SERVICE] Unregistering handler for event: ${event}`);
        this.messageHandlers.delete(event);
    }

    // Import a CSV file
    importFile(fileBuffer: ArrayBuffer, tableName: string, separator: string = ',', hasHeaders: boolean = true, position?: { x: number; y: number }): string {
        return this.sendCommand('IMPORT_FILE', {
            fileBuffer,
            desiredTableName: tableName,
            separator,
            hasHeaders,
            position
        });
    }

    // Execute a SQL query
    executeQuery(query: string): string {
        return this.sendCommand('EXECUTE_QUERY', {
            query
        });
    }

    // Get table information
    getTableInfo(tableName: string): string {
        return this.sendCommand('GET_TABLE_INFO', {
            tableName
        });
    }

    // Check if the worker is initialized
    get initialized(): boolean {
        return this.isInitialized;
    }
}

// Export a singleton instance
export const workerService = new WorkerService();
