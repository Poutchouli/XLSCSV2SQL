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
        }
    });

    const handleDragStart = (node: TableNode) => {
        setDraggedNode(node);
    };

    const handleDragEnd = ({ draggable, droppable }: any) => {
        console.log('Drag end event:', { draggable, droppable });
        
        if (draggable && !droppable) {
            // Use RAF for smooth position updates and batch DOM updates
            requestAnimationFrame(() => {
                const node = props.nodes.find(n => n.id === draggable.id);
                if (node && canvasRef) {
                    console.log('Draggable properties:', Object.keys(draggable));
                    console.log('Draggable transform:', draggable.transform);
                    
                    // The key insight: solid-dnd handles positioning internally
                    // We just need to read the final transformed position
                    const transformedLayout = draggable.transformed;
                    
                    if (transformedLayout) {
                        // Use the transformed layout position directly
                        const newPosition = {
                            x: Math.round(transformedLayout.x),
                            y: Math.round(transformedLayout.y)
                        };
                        
                        console.log('Using transformed layout position:', newPosition);
                        
                        // Apply bounds checking
                        const canvasRect = canvasRef.getBoundingClientRect();
                        const padding = 20;
                        const nodeWidth = 300;
                        const nodeHeight = 250;
                        
                        newPosition.x = Math.max(padding, Math.min(newPosition.x, canvasRect.width - nodeWidth - padding));
                        newPosition.y = Math.max(padding, Math.min(newPosition.y, canvasRect.height - nodeHeight - padding));
                        
                        console.log('Final position after bounds check:', newPosition);
                        props.onNodePositionUpdate(node.id, newPosition);
                    } else {
                        console.warn('No transformed layout available:', draggable);
                    }
                }
            });
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
                            opacity: '0.98',
                            transform: 'rotate(2deg) scale(1.08)',
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
                                ↗ MOVING...
                            </div>
                        </div>
                    )}
                </DragOverlay>
            </DragDropProvider>
        </div>
    );
};
