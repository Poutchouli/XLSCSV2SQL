// src/workers/database.worker.ts

// Import only papaparse, which works reliably in workers
import Papa from 'papaparse';

console.log('[WORKER] Script loaded. Initializing SQLite...');

const connectedPorts: MessagePort[] = [];
let db: any; // The database object from sql.js
let isDbReady = false;

// This function broadcasts a message to all connected UI tabs
function broadcast(message: any) {
    console.log('[WORKER] Broadcasting to all UIs:', message);
    connectedPorts.forEach(port => {
        try {
            port.postMessage(message);
        } catch (error) {
            console.warn('[WORKER] Failed to send message to port:', error);
        }
    });
}

// Load sql.js dynamically using fetch + eval approach
async function loadSqlJs() {
    try {
        // Load sql.js from CDN using fetch
        const response = await fetch('https://sql.js.org/dist/sql-wasm.js');
        const sqlJsCode = await response.text();
        
        // Create a safe evaluation context
        const initSqlJs = new Function('self', 'importScripts', sqlJsCode + '; return initSqlJs;')(
            self, 
            function(url: string) {
                // Mock importScripts for sql.js compatibility
                console.log('[WORKER] Mock importScripts called with:', url);
            }
        );
        
        if (!initSqlJs) {
            throw new Error('Failed to load initSqlJs function');
        }
        
        // Initialize sql.js with CDN WASM
        const SQL = await initSqlJs({
            locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        });
        
        return SQL;
    } catch (error) {
        console.error('[WORKER] Failed to load sql.js:', error);
        throw error;
    }
}

// Initialize SQLite when the worker starts
async function initializeSQLite() {
    try {
        console.log('[WORKER] SQLite initialization started.');
        
        // Load sql.js dynamically
        const SQL = await loadSqlJs();
        
        // Create a new, empty database
        db = new SQL.Database();
        isDbReady = true;
        
        console.info('[WORKER] ✔️ SQLite Database Initialized Successfully.');
        broadcast({
            event: 'DB_INITIALIZED',
            payload: { tables: [] }
        });

    } catch (error) {
        console.error("[WORKER] ❌ SQLite initialization failed:", error);
        broadcast({
            event: 'DB_INIT_ERROR',
            payload: { error: (error as Error).toString() }
        });
    }
}

// Handle new connections from tabs
(self as any).onconnect = (event: MessageEvent) => {
    const port = event.ports[0];
    connectedPorts.push(port);
    console.info('[WORKER] ✔️ UI tab connected. Total connections:', connectedPorts.length);

    // If the DB is already initialized, immediately send the ready signal to the new tab
    if (isDbReady && db) {
        console.log('[WORKER] DB is ready, informing new tab.');
        port.postMessage({
            event: 'DB_INITIALIZED',
            payload: { tables: [] }
        });
    }

    port.onmessage = async (e: MessageEvent) => {
        const { command, payload } = e.data;
        console.log(`[WORKER] Received command '${command}' with payload:`, payload);
        
        // Only process commands if database is ready
        if (!isDbReady) {
            console.warn('[WORKER] Command received but DB not ready yet');
            port.postMessage({
                event: 'ERROR',
                payload: { 
                    error: 'Database not ready yet. Please wait for initialization to complete.',
                    requestId: payload?.requestId 
                }
            });
            return;
        }
        
        try {
            switch (command) {
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
                    console.warn(`[WORKER] Unknown command: ${command}`);
                    port.postMessage({
                        event: 'ERROR',
                        payload: { error: `Unknown command: ${command}` }
                    });
            }
        } catch (error) {
            console.error(`[WORKER] Error processing command '${command}':`, error);
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

// Handle file import operations
async function handleImportFile(payload: { 
    requestId: string, 
    fileBuffer: ArrayBuffer, 
    desiredTableName: string,
    separator?: string,
    hasHeaders?: boolean,
    position?: { x: number; y: number }
}) {
    const { requestId, fileBuffer, desiredTableName, separator = ',', hasHeaders = true, position = { x: 100, y: 100 } } = payload;
    console.log(`[WORKER] Starting file import for table: ${desiredTableName} at position:`, position);
    
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    try {
        // Step A: Parse the CSV using Papa Parse
        const fileText = new TextDecoder().decode(fileBuffer);
        console.log(`[WORKER] CSV text length: ${fileText.length} characters`);
        
        const parseResult = Papa.parse(fileText, {
            header: hasHeaders,
            delimiter: separator,
            skipEmptyLines: true,
        });

        if (parseResult.errors.length > 0) {
            console.warn('[WORKER] CSV parsing warnings:', parseResult.errors);
        }

        if (!parseResult.data.length || !parseResult.meta.fields) {
            throw new Error("CSV is empty or could not be parsed.");
        }
        
        const headers = parseResult.meta.fields;
        const data = parseResult.data as Record<string, any>[];
        console.log(`[WORKER] Papa Parse result: ${data.length} rows, ${headers.length} columns`);

        // Step B: Create the table schema from the CSV headers
        // We'll treat all columns as TEXT for simplicity
        const createTableSql = `CREATE TABLE IF NOT EXISTS "${desiredTableName}" (${headers.map(h => `"${h}" TEXT`).join(', ')});`;
        console.log(`[WORKER] Creating table with SQL: ${createTableSql}`);
        db.run(createTableSql);

        // Step C: Insert data using efficient prepared statements
        const placeholders = headers.map(() => '?').join(', ');
        const insertSql = `INSERT INTO "${desiredTableName}" VALUES (${placeholders});`;
        const stmt = db.prepare(insertSql);
        console.log(`[WORKER] Inserting ${data.length} rows...`);

        // Bind and execute for each row
        data.forEach((row, index) => {
            const values = headers.map(h => row[h] || null);
            stmt.run(values);
            if (index % 100 === 0) {
                console.log(`[WORKER] Inserted ${index + 1}/${data.length} rows`);
            }
        });
        stmt.free(); // free the memory

        // Step D: Get schema and count for the UI
        const schemaRes = db.exec(`PRAGMA table_info("${desiredTableName}");`);
        const schema = schemaRes[0]?.values.map((v: any) => ({ 
            name: v[1], 
            type: v[2] 
        })) || [];
        
        const countRes = db.exec(`SELECT COUNT(*) FROM "${desiredTableName}";`);
        const rowCount = countRes[0]?.values[0]?.[0] as number || 0;

        // Get a sample of the data
        const sampleRes = db.exec(`SELECT * FROM "${desiredTableName}" LIMIT 5;`);
        const sample = sampleRes[0]?.values.map((row: any) => {
            const obj: Record<string, any> = {};
            headers.forEach((header, index) => {
                obj[header] = row[index];
            });
            return obj;
        }) || [];

        console.info(`[WORKER] ✔️ Successfully created table '${desiredTableName}' with ${rowCount} rows`);
        broadcast({
            event: 'NODE_CREATED',
            payload: {
                requestId,
                node: {
                    id: desiredTableName,
                    type: 'table',
                    position: position,
                    data: {
                        schema,
                        rowCount,
                        sample
                    }
                }
            }
        });
    } catch (error) {
        console.error(`[WORKER] ❌ Error importing file for table '${desiredTableName}':`, error);
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
        console.log(`[WORKER] Executing query: ${query}`);
        const result = db.exec(query);
        
        // Convert result to a more convenient format
        const data = result[0]?.values.map((row: any) => {
            const obj: Record<string, any> = {};
            result[0].columns.forEach((col: any, index: any) => {
                obj[col] = row[index];
            });
            return obj;
        }) || [];

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
        // Get schema
        const schemaRes = db.exec(`PRAGMA table_info("${tableName}");`);
        const schema = schemaRes[0]?.values.map((v: any) => ({ 
            name: v[1], 
            type: v[2] 
        })) || [];
        
        // Get row count
        const countRes = db.exec(`SELECT COUNT(*) FROM "${tableName}";`);
        const rowCount = countRes[0]?.values[0]?.[0] as number || 0;

        broadcast({
            event: 'TABLE_INFO',
            payload: {
                requestId,
                tableName,
                schema,
                rowCount
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

// Initialize SQLite when the worker starts
initializeSQLite();
