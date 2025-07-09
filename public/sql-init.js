// public/sql-init.js
// This script loads sql.js from CDN and makes it globally available

// Load sql.js using importScripts (classic worker approach)
importScripts('https://sql.js.org/dist/sql-wasm.js');

// After loading, initSqlJs will be available globally
self.sqlJsLoaded = true;

console.log('[SQL-INIT] sql.js script loaded');
