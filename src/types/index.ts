// src/types/index.ts

export interface TableSchema {
    cid: number;
    name: string;
    type: string;
    notnull: boolean;
    dflt_value: any;
    pk: boolean;
}

export interface TableData {
    schema: TableSchema[];
    rowCount: number;
    sample?: Record<string, any>[];
}

export interface NodePosition {
    x: number;
    y: number;
}

export interface TableNode {
    id: string;
    type: 'table' | 'view' | 'query';
    position: NodePosition;
    data: TableData;
}

export interface QueryResult {
    requestId: string;
    data: Record<string, any>[];
    query: string;
}

export interface ImportResult {
    requestId: string;
    node: TableNode;
}

export interface WorkerEvent {
    event: string;
    payload: any;
}

export interface DragDropContext {
    draggedNode?: TableNode;
    dropZone?: string;
}
