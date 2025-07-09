// src/components/Canvas.tsx

import type { Component } from 'solid-js';
import { For, createSignal } from 'solid-js';
import { DragDropProvider, DragDropSensors, DragOverlay } from '@thisbeyond/solid-dnd';
import type { TableNode } from '../types';
import { SimpleNode } from './SimpleNode';

interface CanvasProps {
    nodes: TableNode[];
    onNodePositionUpdate: (nodeId: string, position: { x: number; y: number }) => void;
    onNodeClick: (node: TableNode) => void;
    onFileDrop: (file: File) => void;
}

export const Canvas: Component<CanvasProps> = (props) => {
    const [draggedNode, setDraggedNode] = createSignal<TableNode | null>(null);

    const handleDragStart = (node: TableNode) => {
        setDraggedNode(node);
    };

    const handleDragEnd = ({ draggable, droppable }: any) => {
        if (draggable && !droppable) {
            // Update node position
            const node = props.nodes.find(n => n.id === draggable.id);
            if (node) {
                const newPosition = {
                    x: node.position.x + draggable.transform.x,
                    y: node.position.y + draggable.transform.y
                };
                props.onNodePositionUpdate(node.id, newPosition);
            }
        }
        setDraggedNode(null);
    };

    const handleFileDrop = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'text/csv') {
                props.onFileDrop(file);
            }
        }
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    return (
        <div 
            style={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                background: 'linear-gradient(to right, #f8fafc 0%, #e2e8f0 100%)',
                overflow: 'hidden'
            }}
            onDragOver={handleDragOver}
            onDrop={handleFileDrop}
        >
            {/* Drop zone indicator */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '12px 24px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '2px dashed #3b82f6',
                'border-radius': '8px',
                color: '#3b82f6',
                'font-family': 'system-ui, sans-serif',
                'pointer-events': 'none'
            }}>
                Drop CSV files here to import
            </div>

            <DragDropProvider onDragEnd={handleDragEnd}>
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
                            background: 'rgba(59, 130, 246, 0.8)',
                            color: 'white',
                            padding: '10px',
                            'border-radius': '6px',
                            'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}>
                            Moving {draggedNode()!.id}
                        </div>
                    )}
                </DragOverlay>
            </DragDropProvider>
        </div>
    );
};
