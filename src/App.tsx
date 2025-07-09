import type { Component } from 'solid-js';
import { createSignal, onMount, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { workerService } from './services/workerService';
import { Canvas } from './components/Canvas';
import { CsvPreviewModal } from './components/CsvPreviewModal';
import type { TableNode } from './types';

const App: Component = () => {
  const [nodes, setNodes] = createStore<TableNode[]>([]);
  const [isDbInitialized, setIsDbInitialized] = createSignal(false);
  const [selectedNode, setSelectedNode] = createSignal<TableNode | null>(null);
  const [isModalOpen, setModalOpen] = createSignal(false);
  const [activeFile, setActiveFile] = createStore<{ 
    text: string, 
    buffer: ArrayBuffer | null, 
    name: string 
  }>({
    text: '',
    buffer: null,
    name: ''
  });

  onMount(() => {
    // Set up event handlers for worker messages
    workerService.on('DB_INITIALIZED', () => {
      console.log('Database initialized successfully');
      setIsDbInitialized(true);
    });

    workerService.on('NODE_CREATED', (payload) => {
      console.log('Node created:', payload);
      setNodes([...nodes, payload.node]);
    });

    workerService.on('IMPORT_ERROR', (payload) => {
      console.error('Import error:', payload.error);
      alert(`Failed to import file: ${payload.error}`);
    });

    workerService.on('QUERY_RESULT', (payload) => {
      console.log('Query result:', payload);
    });

    workerService.on('QUERY_ERROR', (payload) => {
      console.error('Query error:', payload.error);
    });
  });

  onCleanup(() => {
    // Clean up event handlers
    workerService.off('DB_INITIALIZED');
    workerService.off('NODE_CREATED');
    workerService.off('IMPORT_ERROR');
    workerService.off('QUERY_RESULT');
    workerService.off('QUERY_ERROR');
  });

  const handleFileDrop = async (file: File) => {
    if (!isDbInitialized()) {
      alert('Database is still initializing. Please wait...');
      return;
    }

    if (file && (file.type === "text/csv" || file.name.endsWith('.csv'))) {
      try {
        const text = await file.text();
        const buffer = await file.arrayBuffer();
        setActiveFile({
          text: text,
          buffer: buffer,
          name: file.name.replace(/\.[^/.]+$/, "") // Remove file extension
        });
        setModalOpen(true);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Failed to read the file');
      }
    } else {
      alert("Please drop a CSV file.");
    }
  };

  const handleModalConfirm = (separator: string, hasHeaders: boolean) => {
    if (activeFile.buffer) {
      console.log(`Importing file: ${activeFile.name} with separator: ${separator}, headers: ${hasHeaders}`);
      workerService.importFile(activeFile.buffer, activeFile.name, separator, hasHeaders);
    }
    setModalOpen(false);
    setActiveFile({ text: '', buffer: null, name: '' });
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setActiveFile({ text: '', buffer: null, name: '' });
  };

  const handleNodePositionUpdate = (nodeId: string, position: { x: number; y: number }) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex >= 0) {
      setNodes(nodeIndex, 'position', position);
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
            'background-color': isDbInitialized() ? '#dcfce7' : '#fef3c7',
            color: isDbInitialized() ? '#15803d' : '#92400e'
          }}>
            {isDbInitialized() ? '● Database Ready' : '● Initializing...'}
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
