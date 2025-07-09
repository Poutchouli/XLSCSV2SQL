// src/types/index.ts

import type { ParseResult, ParseConfig } from 'papaparse';

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

// Papa Parse related types
export interface CSVParseResult extends ParseResult<any> {
    // Extended with our custom properties
    fileName?: string;
    estimatedRows?: number;
}

export interface CSVImportConfig extends ParseConfig {
    // Our custom configuration options
    maxPreviewRows?: number;
    detectTypes?: boolean;
    tableName?: string;
}

export interface CSVPreview {
    headers: string[];
    sample: any[][];
    totalRows: number;
    fileName: string;
    estimatedSize: number;
}
