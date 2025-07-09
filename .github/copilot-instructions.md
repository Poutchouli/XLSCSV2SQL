# Copilot Instructions for Visual SQL Environment

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a SolidJS TypeScript project that builds a visual SQL environment with the following key features:

## Project Architecture
- **Frontend**: SolidJS with TypeScript and Vite
- **Database Engine**: DuckDB-WASM running in SharedWorker
- **UI Interactions**: Drag-and-drop CSV import, node-based visual interface
- **Data Persistence**: Origin Private File System (OPFS) for client-side persistence

## Key Technologies
- SolidJS for reactive UI components
- DuckDB-WASM for in-browser SQL analytics
- SharedWorker for database isolation and multi-tab support
- @thisbeyond/solid-dnd for drag-and-drop functionality
- TypeScript for type safety

## Code Style Guidelines
- Use SolidJS patterns and reactive primitives
- Implement proper error handling for database operations
- Follow TypeScript best practices with strict type checking
- Use CSS modules or styled components for styling
- Implement proper cleanup for workers and event listeners

## Architecture Patterns
- SharedWorker handles all database operations
- Message-based communication between UI and worker
- Store patterns for state management with SolidJS stores
- Component-based architecture with clear separation of concerns
