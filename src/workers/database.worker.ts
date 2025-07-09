// src/workers/database.worker.ts

import * as duckdb from '@duckdb/duckdb-wasm';
import Papa from 'papaparse';

const connectedPorts: MessagePort[] = [];
let db: duckdb.AsyncDuckDB;

// Initialize DuckDB when the worker starts
async function initializeDuckDB() {
    try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker!}");`], {
                type: 'application/javascript',
            }),
        );

        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger();
        db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);
        console.log('DuckDB Initialized in SharedWorker');
        
        // Broadcast initialization complete to all connected tabs
        broadcast({
            event: 'DB_INITIALIZED',
            payload: { message: 'DuckDB database ready' }
        });
    } catch (error) {
        console.error('Failed to initialize DuckDB:', error);
        broadcast({
            event: 'DB_ERROR',
            payload: { error: (error as Error).toString() }
        });
    }
}

// Handle new connections from tabs
(self as any).onconnect = (event: MessageEvent) => {
    const port = event.ports[0];
    connectedPorts.push(port);

    port.onmessage = async (e: MessageEvent) => {
        const { command, payload } = e.data;
        console.log(`Worker received command: ${command}`, payload);
        
        try {
            switch (command) {
                case 'INIT':
                    // Send initialization status
                    port.postMessage({
                        event: 'INIT_RESPONSE',
                        payload: { initialized: !!db }
                    });
                    break;
                    
                case 'IMPORT_FILE':
                    await handleImportFile(payload);
                    break;
                    
                case 'EXECUTE_QUERY':
                    await handleExecuteQuery(payload);
                    break;
                    
                case 'GET_TABLE_INFO':
                    await handleGetTableInfo(payload);
                    break;
                    
                default:
                    port.postMessage({
                        event: 'ERROR',
                        payload: { error: `Unknown command: ${command}` }
                    });
            }
        } catch (error) {
            port.postMessage({
                event: 'ERROR',
                payload: {
                    requestId: payload?.requestId,
                    error: (error as Error).toString()
                }
            });
        }
    };

    port.start();
    
    // Clean up when port disconnects
    port.addEventListener('close', () => {
        const index = connectedPorts.indexOf(port);
        if (index > -1) {
            connectedPorts.splice(index, 1);
        }
    });
};

// Function to broadcast events to all connected tabs
function broadcast(message: any) {
    connectedPorts.forEach(port => {
        try {
            port.postMessage(message);
        } catch (error) {
            console.warn('Failed to send message to port:', error);
        }
    });
}

// Handle file import operations
async function handleImportFile(payload: { 
    requestId: string, 
    fileBuffer: ArrayBuffer, 
    desiredTableName: string,
    separator?: string,
    hasHeaders?: boolean
}) {
    const { requestId, fileBuffer, desiredTableName, separator = ',', hasHeaders = true } = payload;
    
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    try {
        // Convert ArrayBuffer to text for Papa Parse
        const csvText = new TextDecoder().decode(fileBuffer);
        
        // Parse CSV with Papa Parse
        const parseResult = Papa.parse(csvText, {
            delimiter: separator,
            header: hasHeaders,
            skipEmptyLines: true,
            dynamicTyping: true, // Automatically detect types
        });

        if (parseResult.errors.length > 0) {
            console.warn('CSV parsing warnings:', parseResult.errors);
        }

        // Create CSV content for DuckDB
        let processedCsv: string;
        if (hasHeaders) {
            // Papa Parse already handled headers
            processedCsv = Papa.unparse(parseResult.data, {
                header: true,
                delimiter: ','  // Use comma for DuckDB
            });
        } else {
            // Create headers for data without headers
            const firstRow = parseResult.data[0] as any[];
            const headers = firstRow ? firstRow.map((_, i) => `Column_${i + 1}`) : [];
            processedCsv = Papa.unparse(parseResult.data, {
                header: false,
                delimiter: ','
            });
            // Prepend headers
            processedCsv = headers.join(',') + '\n' + processedCsv;
        }

        // Register the processed CSV with DuckDB
        const csvBuffer = new TextEncoder().encode(processedCsv);
        await db.registerFileBuffer(`${desiredTableName}.csv`, csvBuffer);
        
        // Create a connection and import the CSV
        const c = await db.connect();
        await c.query(`CREATE OR REPLACE TABLE "${desiredTableName}" AS SELECT * FROM read_csv_auto('${desiredTableName}.csv');`);

        // Get schema information
        const schemaResult = await c.query(`PRAGMA table_info("${desiredTableName}");`);
        const schema = (await schemaResult.toArray()).map(row => row.toJSON());

        // Get row count
        const countResult = await c.query(`SELECT COUNT(*) as count FROM "${desiredTableName}";`);
        const count = (await countResult.toArray())[0].toJSON().count;

        // Get a sample of the data
        const sampleResult = await c.query(`SELECT * FROM "${desiredTableName}" LIMIT 5;`);
        const sample = (await sampleResult.toArray()).map(row => row.toJSON());

        c.close();

        broadcast({
            event: 'NODE_CREATED',
            payload: {
                requestId,
                node: {
                    id: desiredTableName,
                    type: 'table',
                    position: { x: 100, y: 100 }, // Initial position
                    data: {
                        schema,
                        rowCount: count,
                        sample
                    }
                }
            }
        });
    } catch (error) {
        broadcast({
            event: 'IMPORT_ERROR',
            payload: {
                requestId,
                error: (error as Error).toString()
            }
        });
    }
}

// Handle SQL query execution
async function handleExecuteQuery(payload: {
    requestId: string,
    query: string
}) {
    const { requestId, query } = payload;
    
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    try {
        const c = await db.connect();
        const result = await c.query(query);
        const data = (await result.toArray()).map(row => row.toJSON());
        c.close();

        broadcast({
            event: 'QUERY_RESULT',
            payload: {
                requestId,
                data,
                query
            }
        });
    } catch (error) {
        broadcast({
            event: 'QUERY_ERROR',
            payload: {
                requestId,
                error: (error as Error).toString(),
                query
            }
        });
    }
}

// Handle getting table information
async function handleGetTableInfo(payload: {
    requestId: string,
    tableName: string
}) {
    const { requestId, tableName } = payload;
    
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    try {
        const c = await db.connect();
        
        // Get schema
        const schemaResult = await c.query(`PRAGMA table_info("${tableName}");`);
        const schema = (await schemaResult.toArray()).map(row => row.toJSON());
        
        // Get row count
        const countResult = await c.query(`SELECT COUNT(*) as count FROM "${tableName}";`);
        const count = (await countResult.toArray())[0].toJSON().count;
        
        c.close();

        broadcast({
            event: 'TABLE_INFO',
            payload: {
                requestId,
                tableName,
                schema,
                rowCount: count
            }
        });
    } catch (error) {
        broadcast({
            event: 'TABLE_INFO_ERROR',
            payload: {
                requestId,
                tableName,
                error: (error as Error).toString()
            }
        });
    }
}

// Initialize DuckDB when the worker starts
initializeDuckDB();
