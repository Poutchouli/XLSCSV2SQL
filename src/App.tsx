import type { Component } from 'solid-js';
import { createSignal, onMount, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { workerService } from './services/workerService';
import { Canvas } from './components/Canvas';
import { CsvPreviewModal } from './components/CsvPreviewModal';
import type { TableNode } from './types';

const App: Component = () => {
  const [nodes, setNodes] = createStore<TableNode[]>([]);
  const [dbStatus, setDbStatus] = createSignal<'initializing' | 'ready' | 'error'>('initializing');
  const [selectedNode, setSelectedNode] = createSignal<TableNode | null>(null);
  const [isModalOpen, setModalOpen] = createSignal(false);
  const [activeFile, setActiveFile] = createStore<{ 
    text: string, 
    buffer: ArrayBuffer | null, 
    name: string,
    dropPosition: { x: number, y: number }
  }>({
    text: '',
    buffer: null,
    name: '',
    dropPosition: { x: 0, y: 0 }
  });

  onMount(() => {
    console.log('[UI] App mounted, setting up worker event handlers'); // Initial UI log
    
    // Set up event handlers for worker messages
    workerService.on('DB_INITIALIZED', (payload) => {
      console.info('[UI] ✔️ DB is ready. Unlocking UI.', payload); // 1. Log DB ready
      setDbStatus('ready');
    });

    workerService.on('DB_INIT_ERROR', (payload) => {
      console.error('[UI] ❌ Received DB initialization error:', payload.error); // 2. Log DB error
      setDbStatus('error');
    });

    workerService.on('NODE_CREATED', (payload) => {
      console.info('[UI] ✔️ Node created event received. Adding to canvas:', payload); // 3. Log node creation
      setNodes([...nodes, payload.node]);
    });

    workerService.on('IMPORT_ERROR', (payload) => {
      console.error('[UI] ❌ Import error:', payload.error); // 4. Log import errors
      alert(`Failed to import file: ${payload.error}`);
    });

    workerService.on('QUERY_RESULT', (payload) => {
      console.log('[UI] Query result received:', payload); // 5. Log query results
    });

    workerService.on('QUERY_ERROR', (payload) => {
      console.error('[UI] ❌ Query error:', payload.error); // 6. Log query errors
    });

    workerService.on('ERROR', (payload) => {
      console.error('[UI] ❌ General error from worker:', payload.error); // 7. Log general errors
    });
  });

  onCleanup(() => {
    console.log('[UI] Cleaning up worker event handlers');
    // Clean up event handlers
    workerService.off('DB_INITIALIZED');
    workerService.off('DB_INIT_ERROR');
    workerService.off('NODE_CREATED');
    workerService.off('IMPORT_ERROR');
    workerService.off('QUERY_RESULT');
    workerService.off('QUERY_ERROR');
    workerService.off('ERROR');
  });

  const handleFileDrop = async (file: File, position: { x: number; y: number }) => {
    console.log('[UI] File drop event triggered with file:', file.name, 'at position:', position); // 8. Log file drop
    
    if (dbStatus() !== 'ready') {
      console.warn('[UI] File dropped, but DB not ready. Current status:', dbStatus());
      alert('Database is still initializing. Please wait...');
      return;
    }

    if (file && (file.type === "text/csv" || file.name.endsWith('.csv'))) {
      console.log(`[UI] Processing dropped CSV file: ${file.name}, size: ${file.size} bytes`); // 9. Log file processing
      try {
        const text = await file.text();
        const buffer = await file.arrayBuffer();
        console.log(`[UI] File read successfully. Text length: ${text.length}, Buffer size: ${buffer.byteLength}`);
        
        setActiveFile({
          text: text,
          buffer: buffer,
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          dropPosition: position
        });
        setModalOpen(true);
        console.log('[UI] CSV preview modal opened');
      } catch (error) {
        console.error('[UI] ❌ Error reading file:', error);
        alert('Failed to read the file');
      }
    } else {
      console.warn('[UI] Invalid file type dropped:', file.type, file.name);
      alert("Please drop a CSV file.");
    }
  };




  const handleModalConfirm = (separator: string, hasHeaders: boolean) => {
    if (activeFile.buffer) {
      console.log(`[UI] Sending IMPORT_FILE command to worker. Table: ${activeFile.name}, separator: ${separator}, headers: ${hasHeaders}, position:`, activeFile.dropPosition);
      
      // THIS IS THE FIX: Extract plain values from the reactive store
      // Do not pass the activeFile proxy object properties directly
      const plainBuffer = activeFile.buffer;
      const plainName = activeFile.name;
      const plainPosition = { ...activeFile.dropPosition }; // Create a clean copy
      
      // Send using plain JavaScript values, not reactive store properties
      const requestId = workerService.importFile(plainBuffer, plainName, separator, hasHeaders, plainPosition);
      console.log(`[UI] Import request sent with ID: ${requestId}`);
    } else {
      console.error('[UI] ❌ No file buffer available for import');
    }
    setModalOpen(false);
    setActiveFile({ text: '', buffer: null, name: '', dropPosition: { x: 0, y: 0 } });
  };




  const handleModalClose = () => {
    setModalOpen(false);
    setActiveFile({ text: '', buffer: null, name: '', dropPosition: { x: 0, y: 0 } });
  };

  const handleNodePositionUpdate = (nodeId: string, position: { x: number; y: number }) => {
    // Use batch updates for better performance
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex >= 0) {
      // Only update if position actually changed to avoid unnecessary re-renders
      const currentNode = nodes[nodeIndex];
      if (currentNode.position.x !== position.x || currentNode.position.y !== position.y) {
        setNodes(nodeIndex, 'position', position);
      }
    }
  };

  const handleNodeClick = (node: TableNode) => {
    setSelectedNode(node);
    console.log('Node clicked:', node);
    // In Phase 2, we'll open a data viewer modal here
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        'background-color': 'white',
        'border-bottom': '1px solid #e5e7eb',
        'z-index': 1000,
        display: 'flex',
        'align-items': 'center',
        padding: '0 20px',
        'font-family': 'system-ui, sans-serif'
      }}>
        <h1 style={{
          margin: 0,
          'font-size': '20px',
          'font-weight': 'bold',
          color: '#1f2937'
        }}>
          Visual SQL Environment
        </h1>
        
        <div style={{ 'margin-left': 'auto', display: 'flex', 'align-items': 'center', gap: '12px' }}>
          <div style={{
            padding: '4px 8px',
            'border-radius': '4px',
            'font-size': '12px',
            'background-color': dbStatus() === 'ready' ? '#dcfce7' : dbStatus() === 'error' ? '#fed7d7' : '#fef3c7',
            color: dbStatus() === 'ready' ? '#15803d' : dbStatus() === 'error' ? '#c53030' : '#92400e'
          }}>
            {dbStatus() === 'ready' ? '● Database Ready' : dbStatus() === 'error' ? '● Database Error' : '● Initializing...'}
          </div>
          
          <div style={{
            'font-size': '14px',
            color: '#6b7280'
          }}>
            {nodes.length} {nodes.length === 1 ? 'table' : 'tables'}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div style={{ 'margin-top': '60px' }}>
        <Canvas
          nodes={nodes}
          onNodePositionUpdate={handleNodePositionUpdate}
          onNodeClick={handleNodeClick}
          onFileDrop={handleFileDrop}
        />
      </div>

      {/* Selected Node Info (simple debug info for now) */}
      {selectedNode() && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          'background-color': 'white',
          border: '1px solid #e5e7eb',
          'border-radius': '8px',
          padding: '12px',
          'max-width': '300px',
          'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',
          'z-index': 1000
        }}>
          <h3 style={{ margin: '0 0 8px 0', 'font-size': '14px' }}>
            Selected: {selectedNode()!.id}
          </h3>
          <p style={{ margin: '0', 'font-size': '12px', color: '#6b7280' }}>
            {selectedNode()!.data.rowCount} rows, {selectedNode()!.data.schema.length} columns
          </p>
          <button 
            onClick={() => setSelectedNode(null)}
            style={{
              'margin-top': '8px',
              padding: '4px 8px',
              'font-size': '12px',
              border: '1px solid #d1d5db',
              'border-radius': '4px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* CSV Preview Modal */}
      <CsvPreviewModal
        isOpen={isModalOpen()}
        fileText={activeFile.text}
        fileName={activeFile.name}
        onConfirm={handleModalConfirm}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default App;
