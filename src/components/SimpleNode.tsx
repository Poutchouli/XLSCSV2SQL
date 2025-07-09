// src/components/SimpleNode.tsx

import type { Component } from 'solid-js';
import { For, createSignal, createMemo } from 'solid-js';
import { createDraggable } from '@thisbeyond/solid-dnd';
import type { TableNode } from '../types';

interface SimpleNodeProps {
    node: TableNode;
    onNodeClick: (node: TableNode) => void;
    onDragStart: () => void;
}

export const SimpleNode: Component<SimpleNodeProps> = (props) => {
    const [isDragging, setIsDragging] = createSignal(false);
    const [isHovered, setIsHovered] = createSignal(false);
    
    const draggable = createDraggable(props.node.id, { 
        onDragStart: () => {
            console.log('Drag start for node:', props.node.id);
            setIsDragging(true);
            props.onDragStart();
        },
        onDragEnd: () => {
            console.log('Drag end for node:', props.node.id);
            setIsDragging(false);
        }
    });

    const handleClick = (e: MouseEvent) => {
        e.stopPropagation();
        if (!isDragging()) {
            props.onNodeClick(props.node);
        }
    };

    // Memoize styles for better performance
    const nodeStyles = createMemo(() => ({
        position: 'absolute' as const,
        top: `${props.node.position.y}px`,
        left: `${props.node.position.x}px`,
        'min-width': '220px',
        'max-width': '320px',
        border: isDragging() ? '3px solid #f59e0b' : '3px solid #3b82f6',
        'border-radius': '16px',
        padding: '20px',
        background: isDragging() 
            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        cursor: isDragging() ? 'grabbing' : 'grab',
        'box-shadow': isDragging() ? 'none' :
                     isHovered() ? '0 20px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.1)' :
                     '0 8px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(148, 163, 184, 0.1)',
        'font-family': 'system-ui, sans-serif',
        'user-select': 'none' as const,
        'z-index': isDragging() ? '1' : isHovered() ? '200' : '100',
        transform: isDragging() ? 'scale(0.95)' :
                  isHovered() ? 'translateY(-4px) scale(1.02)' : 'translateY(0)',
        transition: isDragging() ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'will-change': 'transform, box-shadow',
        'transform-origin': 'center center',
        // Performance optimizations
        'backface-visibility': 'hidden' as const,
        'perspective': '1000px',
        // Hide the original node when dragging so only the overlay is visible
        opacity: isDragging() ? '0.4' : '1',
        'pointer-events': isDragging() ? ('none' as const) : ('auto' as const)
    }));

    return (
        <div
            ref={draggable}
            onClick={handleClick}
            style={nodeStyles()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div style={{
                'font-weight': '800',
                'font-size': '16px',
                color: '#1f2937',
                'margin-bottom': '12px',
                'display': 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'pointer-events': 'none' // Prevent interference with drag
            }}>
                <span>📊 {props.node.id}</span>
                <span style={{
                    'font-size': '12px',
                    'font-weight': '700',
                    color: '#ffffff',
                    'background': 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                    padding: '4px 10px',
                    'border-radius': '8px',
                    'box-shadow': '0 2px 8px rgba(59, 130, 246, 0.3)'
                }}>
                    {props.node.data.rowCount} rows
                </span>
            </div>

            {/* Schema */}
            <div style={{
                'font-size': '13px',
                'max-height': '240px',
                'overflow-y': 'auto',
                'pointer-events': 'none', // Prevent interference with drag
                'background-color': '#f8fafc',
                padding: '12px',
                'border-radius': '8px',
                'border-left': '4px solid #3b82f6'
            }}>
                <For each={props.node.data.schema.slice(0, 10)}>
                    {(column) => (
                        <div style={{
                            'display': 'flex',
                            'justify-content': 'space-between',
                            'margin-bottom': '6px',
                            'padding': '4px 0'
                        }}>
                            <span style={{ 
                                color: '#1f2937', 
                                'font-weight': '600' 
                            }}>
                                {column.name}
                            </span>
                            <span style={{ 
                                color: '#3b82f6',
                                'font-family': 'monospace',
                                'font-size': '12px',
                                'font-weight': '500'
                            }}>
                                {column.type}
                            </span>
                        </div>
                    )}
                </For>
                {props.node.data.schema.length > 10 && (
                    <div style={{
                        color: '#6b7280',
                        'font-style': 'italic',
                        'margin-top': '8px',
                        'font-weight': '500'
                    }}>
                        +{props.node.data.schema.length - 10} more columns...
                    </div>
                )}
            </div>

            {/* Type indicator */}
            <div style={{
                'margin-top': '12px',
                'padding-top': '12px',
                'border-top': '2px solid #e5e7eb',
                'pointer-events': 'none' // Prevent interference with drag
            }}>
                <span style={{
                    'font-size': '12px',
                    color: '#3b82f6',
                    'text-transform': 'uppercase',
                    'letter-spacing': '1px',
                    'font-weight': '700'
                }}>
                    {props.node.type}
                </span>
            </div>
        </div>
    );
};
