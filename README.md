# Visual SQL Environment

A powerful, browser-based visual SQL environment built with SolidJS, TypeScript, and DuckDB-WASM. This application allows you to import CSV files through drag-and-drop, visualize data as interactive nodes, and work with SQL queries entirely in your browser.

## 🚀 Features

### Phase 1 (Current Implementation)
- **Drag & Drop CSV Import**: Simply drag CSV files onto the canvas to import them as database tables
- **Visual Node Interface**: Each imported table appears as a draggable node showing schema and row count
- **In-Browser Database**: Powered by DuckDB-WASM running in a SharedWorker for optimal performance
- **Real-time Data Processing**: Full SQL capabilities with no server required
- **Modern UI**: Clean, responsive interface built with SolidJS

### Upcoming Features (Phase 2+)
- Data viewer modal with filtering and sorting
- Visual query builder with drag-and-drop connections
- Data persistence using Origin Private File System (OPFS)
- Export capabilities (CSV, JSON, SQL)
- Advanced analytics and visualization

## 🛠 Technology Stack

- **Frontend**: SolidJS with TypeScript
- **Build Tool**: Vite
- **Database**: DuckDB-WASM (in-browser SQL analytics)
- **Worker Architecture**: SharedWorker for database isolation
- **Drag & Drop**: @thisbeyond/solid-dnd
- **Type Safety**: Full TypeScript support

## 📦 Installation

### Prerequisites
- **Option 1 (Recommended)**: Docker Desktop installed and running
- **Option 2**: Node.js v20.19.0 or higher (v22.12.0+ recommended)
- Modern web browser with SharedWorker support

### Setup Option 1: Docker Development (Recommended)

This approach ensures consistent Node.js version and dependencies across all environments:

```bash
# Start the development environment
docker-compose up

# Or use the npm script
npm run docker:dev
```

The application will be available at `http://localhost:8080`

**Docker Benefits:**
- ✅ Consistent Node.js v24 environment
- ✅ No local Node.js version conflicts
- ✅ Hot reload and file watching work perfectly
- ✅ Easy to share with team members
- ✅ Clean, isolated development environment

**Docker Commands:**
```bash
# Start development server
npm run docker:dev

# Rebuild the container (after dependency changes)
npm run docker:build

# Stop the container
npm run docker:down

# Clean up everything (containers, volumes, images)
npm run docker:clean
```

### Setup Option 2: Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🎯 Usage

### Using Docker (Recommended)
1. **Start the Application**: Run `docker-compose up` and open `http://localhost:8080`

### Using Local Development
1. **Start the Application**: Run `npm run dev` and open `http://localhost:5173`

### Common Usage Steps
2. **Import Data**: 
   - Drag and drop any CSV file onto the canvas
   - The file will be automatically imported as a database table
   - A visual node will appear showing the table schema and row count

3. **Interact with Nodes**:
   - Drag nodes around the canvas to organize your workspace
   - Click on nodes to select them and view details
   - Each node shows column names, types, and row counts

## Available Scripts

### Local Development
- `npm run dev` - Start development server (localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Docker Development (Recommended)
- `npm run docker:dev` - Start Docker development environment (localhost:8080)
- `npm run docker:build` - Rebuild Docker container
- `npm run docker:down` - Stop Docker container
- `npm run docker:clean` - Clean up all Docker resources

## 📄 License

This project is licensed under the MIT License.
