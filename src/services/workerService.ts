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
        
        // Initialize the worker
        this.sendCommand('INIT', {});
    }

    private setupEventHandlers() {
        this.port.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const { event: eventName, payload } = event.data;
            console.log(`Received event from worker: ${eventName}`, payload);
            
            // Handle initialization
            if (eventName === 'DB_INITIALIZED') {
                this.isInitialized = true;
            }
            
            // Call registered handlers
            const handler = this.messageHandlers.get(eventName);
            if (handler) {
                handler(payload);
            }
            
            // Also call wildcard handlers
            const wildcardHandler = this.messageHandlers.get('*');
            if (wildcardHandler) {
                wildcardHandler({ event: eventName, payload });
            }
        };

        this.worker.onerror = (error: ErrorEvent) => {
            console.error('SharedWorker error:', error);
        };
    }

    // Send a command to the worker
    sendCommand(command: string, payload: any = {}): string {
        const requestId = crypto.randomUUID();
        const message: WorkerCommand = {
            command,
            payload: {
                requestId,
                ...payload
            }
        };
        
        console.log(`Sending command to worker: ${command}`, message);
        this.port.postMessage(message);
        return requestId;
    }

    // Register an event handler
    on(event: string, handler: (payload: any) => void) {
        this.messageHandlers.set(event, handler);
    }

    // Remove an event handler
    off(event: string) {
        this.messageHandlers.delete(event);
    }

    // Import a CSV file
    importFile(fileBuffer: ArrayBuffer, tableName: string): string {
        return this.sendCommand('IMPORT_FILE', {
            fileBuffer,
            desiredTableName: tableName
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
    getInitializationStatus(): boolean {
        return this.isInitialized;
    }
}

// Create and export a singleton instance
export const workerService = new WorkerService();

// Convenience function to access the port directly if needed
export const getWorkerPort = () => workerService;
