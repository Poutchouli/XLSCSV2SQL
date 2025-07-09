// src/components/Canvas.tsx

import type { Component } from 'solid-js';
import { For, createSignal, onMount } from 'solid-js';
import { DragDropProvider, DragDropSensors, DragOverlay } from '@thisbeyond/solid-dnd';
import type { TableNode } from '../types';
import { SimpleNode } from './SimpleNode';

interface CanvasProps {
    nodes: TableNode[];
    onNodePositionUpdate: (nodeId: string, position: { x: number; y: number }) => void;
    onNodeClick: (node: TableNode) => void;
    onFileDrop: (file: File, position: { x: number; y: number }) => void;
}

export const Canvas: Component<CanvasProps> = (props) => {
    const [draggedNode, setDraggedNode] = createSignal<TableNode | null>(null);
    const [isDragOverCanvas, setIsDragOverCanvas] = createSignal(false);
    let canvasRef: HTMLDivElement | undefined;

    onMount(() => {
        // Optimize for smooth animations
        if (canvasRef) {
            canvasRef.style.willChange = 'transform';
            canvasRef.style.transform = 'translateZ(0)';
            
            // Add throttled mouse movement debugging
            let lastLogTime = 0;
            const logInterval = 500; // Log every 500ms
            
            const handleMouseMove = (e: MouseEvent) => {
                const now = Date.now();
                if (now - lastLogTime > logInterval) {
                    const rect = canvasRef!.getBoundingClientRect();
                    const relativePosition = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    };
                    lastLogTime = now;
                }
            };
            
            // Add the event listener
            canvasRef.addEventListener('mousemove', handleMouseMove);
            
            // Cleanup function
            return () => {
                if (canvasRef) {
                    canvasRef.removeEventListener('mousemove', handleMouseMove);
                }
            };
        }
    });

    const handleDragStart = (node: TableNode) => {
        setDraggedNode(node);
    };

    const handleDragEnd = ({ draggable, droppable }: any) => {
        console.log('[DRAG DEBUG] Drag end event:', { draggable, droppable });
        
        if (draggable) {
            // Find the node that was dragged
            const node = props.nodes.find(n => n.id === draggable.id);
            if (node && draggable.transformed && canvasRef) {
                console.log('[DRAG DEBUG] Original node position:', node.position);
                console.log('[DRAG DEBUG] Drag transform distance:', draggable.transformed);
                console.log('[DRAG DEBUG] All draggable properties:', Object.keys(draggable));
                
                // The final position is where the ghost ended up
                // draggable.transformed gives us the distance moved from the original position
                const finalPosition = {
                    x: Math.round(node.position.x + draggable.transformed.x),
                    y: Math.round(node.position.y + draggable.transformed.y)
                };
                
                console.log('[DRAG DEBUG] Moving node to final position:', finalPosition);
                
                // Move the node to the exact location where the ghost was dropped
                props.onNodePositionUpdate(node.id, finalPosition);
            } else {
                console.warn('[DRAG DEBUG] Missing data:', { 
                    nodeFound: !!node, 
                    hasTransform: !!draggable.transformed,
                    hasCanvas: !!canvasRef,
                    draggableKeys: draggable ? Object.keys(draggable) : []
                });
            }
        }
        setDraggedNode(null);
    };

    const handleFileDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragOverCanvas(false);
        
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
                // Capture the mouse position relative to the canvas
                const rect = canvasRef?.getBoundingClientRect();
                const position = {
                    x: rect ? e.clientX - rect.left : e.clientX,
                    y: rect ? e.clientY - rect.top : e.clientY
                };
                
                console.log('[FILE DROP DEBUG] Drop event details:', {
                    client: { x: e.clientX, y: e.clientY },
                    calculated: position,
                    canvasRect: rect ? { 
                        left: rect.left, 
                        top: rect.top, 
                        width: rect.width, 
                        height: rect.height 
                    } : null,
                    fileName: file.name
                });
                
                props.onFileDrop(file, position);
            }
        }
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        // Only show drag over state for file drops, not node drags
        if (e.dataTransfer?.types.includes('Files')) {
            setIsDragOverCanvas(true);
        }
    };

    const handleDragLeave = (e: DragEvent) => {
        // Only reset if we're leaving the canvas entirely
        if (!canvasRef?.contains(e.relatedTarget as Node)) {
            setIsDragOverCanvas(false);
        }
    };

    return (
        <div 
            ref={canvasRef}
            style={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                background: isDragOverCanvas() 
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                overflow: 'hidden',
                // Performance optimizations
                'will-change': 'transform',
                'transform': 'translateZ(0)',
                'backface-visibility': 'hidden',
                transition: 'background 0.3s ease'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
        >
            {/* Drop zone indicator */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                padding: '16px 32px',
                background: isDragOverCanvas() 
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
                border: `3px dashed ${isDragOverCanvas() ? '#f59e0b' : '#9ca3af'}`,
                'border-radius': '12px',
                color: isDragOverCanvas() ? '#92400e' : '#f3f4f6',
                'font-family': 'system-ui, sans-serif',
                'pointer-events': 'none',
                'font-weight': isDragOverCanvas() ? '700' : '600',
                'font-size': '16px',
                transform: isDragOverCanvas() 
                    ? 'translateX(-50%) scale(1.1)' 
                    : 'translateX(-50%) scale(1)',
                transition: 'all 0.3s ease',
                'box-shadow': isDragOverCanvas() 
                    ? '0 20px 40px rgba(251, 191, 36, 0.3)'
                    : '0 8px 25px rgba(0, 0, 0, 0.2)'
            }}>
                {isDragOverCanvas() ? '📁 Release to import CSV' : 'Drop CSV files here to import'}
            </div>

            <DragDropProvider 
                onDragStart={({ draggable }) => {
                    console.log('Canvas drag start:', draggable);
                    const node = props.nodes.find(n => n.id === draggable.id);
                    if (node) handleDragStart(node);
                }}
                onDragEnd={handleDragEnd}
            >
                <DragDropSensors />
                
                <For each={props.nodes}>
                    {(node) => (
                        <SimpleNode 
                            node={node}
                            onNodeClick={props.onNodeClick}
                            onDragStart={() => handleDragStart(node)}
                        />
                    )}
                </For>

                <DragOverlay>
                    {draggedNode() && (
                        <div style={{
                            'min-width': '220px',
                            'max-width': '320px',
                            border: '3px solid #10b981',
                            'border-radius': '16px',
                            padding: '20px',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            'backdrop-filter': 'blur(12px)',
                            'box-shadow': '0 25px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.1)',
                            'font-family': 'system-ui, sans-serif',
                            'user-select': 'none',
                            'z-index': '10000',
                            opacity: '0.9', // Make it slightly transparent for better visibility
                            transform: 'rotate(1deg) scale(1.05)', // Slight rotation and scale for ghost effect
                            'pointer-events': 'none',
                            // Performance optimizations for drag overlay
                            'will-change': 'transform',
                            'backface-visibility': 'hidden'
                        }}>
                            {/* Header */}
                            <div style={{
                                'font-weight': '800',
                                'font-size': '16px',
                                color: '#047857',
                                'margin-bottom': '12px',
                                'display': 'flex',
                                'justify-content': 'space-between',
                                'align-items': 'center'
                            }}>
                                <span>📊 {draggedNode()!.id}</span>
                                <span style={{
                                    'font-size': '12px',
                                    'font-weight': '700',
                                    color: '#ffffff',
                                    'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    padding: '4px 10px',
                                    'border-radius': '8px',
                                    'box-shadow': '0 2px 8px rgba(16, 185, 129, 0.3)'
                                }}>
                                    {draggedNode()!.data.rowCount} rows
                                </span>
                            </div>

                            {/* Quick schema preview */}
                            <div style={{
                                'font-size': '13px',
                                color: '#374151',
                                'margin-bottom': '12px',
                                'font-weight': '500',
                                'background-color': '#f1f5f9',
                                padding: '8px 12px',
                                'border-radius': '8px',
                                'border-left': '4px solid #10b981'
                            }}>
                                {draggedNode()!.data.schema.slice(0, 3).map(col => col.name).join(', ')}
                                {draggedNode()!.data.schema.length > 3 && '...'}
                            </div>

                            {/* Status */}
                            <div style={{
                                'font-size': '12px',
                                color: '#10b981',
                                'text-transform': 'uppercase',
                                'letter-spacing': '1px',
                                'font-weight': '800',
                                'text-align': 'center',
                                'background-color': '#ecfdf5',
                                padding: '6px 12px',
                                'border-radius': '6px'
                            }}>
                                ↗ DRAGGING...
                            </div>
                        </div>
                    )}
                </DragOverlay>
            </DragDropProvider>
        </div>
    );
};
