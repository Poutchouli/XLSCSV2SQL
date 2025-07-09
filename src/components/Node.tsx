// src/components/Node.tsx

import type { Component } from 'solid-js';
import { For } from 'solid-js';
import { createDraggable } from '@thisbeyond/solid-dnd';
import type { TableNode } from '../types';

interface NodeProps {
    node: TableNode;
    onPositionUpdate: (nodeId: string, position: { x: number; y: number }) => void;
    onNodeClick: (node: TableNode) => void;
}

export const Node: Component<NodeProps> = (props) => {
    // Note: This component is not currently used, keeping for reference
    createDraggable(props.node.id);

    const handleClick = () => {
        props.onNodeClick(props.node);
    };

    return (
        <div
            use:draggable
            onClick={handleClick}
            style={{
                position: 'absolute',
                top: `${props.node.position.y}px`,
                left: `${props.node.position.x}px`,
                'min-width': '200px',
                'max-width': '300px',
                border: '2px solid #3b82f6',
                'border-radius': '8px',
                padding: '12px',
                background: 'white',
                cursor: 'move',
                'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                'font-family': 'system-ui, sans-serif',
                'user-select': 'none'
            }}
        >
            {/* Header */}
            <div style={{
                'font-weight': 'bold',
                'font-size': '14px',
                color: '#1f2937',
                'margin-bottom': '8px',
                'display': 'flex',
                'justify-content': 'space-between',
                'align-items': 'center'
            }}>
                <span>{props.node.id}</span>
                <span style={{
                    'font-size': '12px',
                    'font-weight': 'normal',
                    color: '#6b7280',
                    'background-color': '#f3f4f6',
                    padding: '2px 6px',
                    'border-radius': '4px'
                }}>
                    {props.node.data.rowCount} rows
                </span>
            </div>

            {/* Schema */}
            <div style={{
                'font-size': '12px',
                'max-height': '200px',
                'overflow-y': 'auto'
            }}>
                <For each={props.node.data.schema.slice(0, 10)}>
                    {(column) => (
                        <div style={{
                            'display': 'flex',
                            'justify-content': 'space-between',
                            'margin-bottom': '4px',
                            'padding': '2px 0'
                        }}>
                            <span style={{ color: '#374151', 'font-weight': '500' }}>
                                {column.name}
                            </span>
                            <span style={{ 
                                color: '#6b7280',
                                'font-family': 'monospace',
                                'font-size': '11px'
                            }}>
                                {column.type}
                            </span>
                        </div>
                    )}
                </For>
                {props.node.data.schema.length > 10 && (
                    <div style={{
                        color: '#9ca3af',
                        'font-style': 'italic',
                        'margin-top': '4px'
                    }}>
                        +{props.node.data.schema.length - 10} more columns...
                    </div>
                )}
            </div>

            {/* Type indicator */}
            <div style={{
                'margin-top': '8px',
                'padding-top': '8px',
                'border-top': '1px solid #e5e7eb'
            }}>
                <span style={{
                    'font-size': '11px',
                    color: '#6b7280',
                    'text-transform': 'uppercase',
                    'letter-spacing': '0.5px'
                }}>
                    {props.node.type}
                </span>
            </div>
        </div>
    );
};
