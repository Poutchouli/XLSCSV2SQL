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
            console.log(`[WORKER SERVICE] Received event from worker: ${eventName}`, payload); // Log all messages
            
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
            
            // Also call wildcard handlers
            const wildcardHandler = this.messageHandlers.get('*');
            if (wildcardHandler) {
                wildcardHandler({ event: eventName, payload });
            }
        };

        this.worker.onerror = (error: ErrorEvent) => {
            console.error('[WORKER SERVICE] SharedWorker error:', error);
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
        
        console.log(`[WORKER SERVICE] Sending command to worker: ${command}`, message); // Log outgoing commands
        this.port.postMessage(message);
        return requestId;
    }

    // Register an event handler
    on(event: string, handler: (payload: any) => void) {
        console.log(`[WORKER SERVICE] Registering handler for event: ${event}`);
        this.messageHandlers.set(event, handler);
    }

    // Remove an event handler
    off(event: string) {
        console.log(`[WORKER SERVICE] Removing handler for event: ${event}`);
        this.messageHandlers.delete(event);
    }

    // Import a CSV file
    importFile(fileBuffer: ArrayBuffer, tableName: string, separator: string = ',', hasHeaders: boolean = true): string {
        return this.sendCommand('IMPORT_FILE', {
            fileBuffer,
            desiredTableName: tableName,
            separator,
            hasHeaders
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
