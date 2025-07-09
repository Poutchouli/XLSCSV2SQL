// src/services/csvParser.ts

import Papa from 'papaparse';
import type { CSVParseResult, CSVImportConfig, CSVPreview } from '../types';

export class CSVParser {
    /**
     * Parse a CSV file and return the results
     */
    static async parseFile(
        file: File, 
        config: CSVImportConfig = {}
    ): Promise<CSVParseResult> {
        const defaultConfig: CSVImportConfig = {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            maxPreviewRows: 1000,
            detectTypes: true,
            ...config
        };

        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                ...defaultConfig,
                complete: (results) => {
                    const enhanced: CSVParseResult = {
                        ...results,
                        fileName: file.name,
                        estimatedRows: results.data.length
                    };
                    resolve(enhanced);
                },
                error: (error) => {
                    reject(new Error(`CSV parsing failed: ${error.message}`));
                }
            });
        });
    }

    /**
     * Generate a preview of the CSV file for the user to review
     */
    static async generatePreview(file: File): Promise<CSVPreview> {
        const parseResult = await this.parseFile(file, {
            preview: 10, // Only parse first 10 rows for preview
            header: true
        });

        const headers = parseResult.meta.fields || [];
        const sample = parseResult.data.slice(0, 5); // Show first 5 rows

        return {
            headers,
            sample: sample.map(row => headers.map(header => row[header])),
            totalRows: parseResult.estimatedRows || 0,
            fileName: file.name,
            estimatedSize: file.size
        };
    }

    /**
     * Validate CSV structure and detect potential issues
     */
    static validateCSV(parseResult: CSVParseResult): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for parsing errors
        if (parseResult.errors && parseResult.errors.length > 0) {
            parseResult.errors.forEach(error => {
                if (error.type === 'Quotes' || error.type === 'Delimiter') {
                    errors.push(`${error.type} error at row ${error.row}: ${error.message}`);
                } else {
                    warnings.push(`${error.type} warning at row ${error.row}: ${error.message}`);
                }
            });
        }

        // Check for empty data
        if (!parseResult.data || parseResult.data.length === 0) {
            errors.push('No data found in CSV file');
        }

        // Check for headers
        if (!parseResult.meta.fields || parseResult.meta.fields.length === 0) {
            errors.push('No column headers detected');
        }

        // Check for duplicate headers
        const headers = parseResult.meta.fields || [];
        const duplicateHeaders = headers.filter((header, index) => 
            headers.indexOf(header) !== index
        );
        if (duplicateHeaders.length > 0) {
            warnings.push(`Duplicate column headers found: ${duplicateHeaders.join(', ')}`);
        }

        // Check for very large files
        if (parseResult.data.length > 100000) {
            warnings.push(`Large dataset detected (${parseResult.data.length} rows). Processing may take some time.`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Convert parsed CSV data to SQL-compatible format
     */
    static prepareSQLData(parseResult: CSVParseResult): {
        headers: string[];
        rows: any[][];
        types: Record<string, string>;
    } {
        const headers = parseResult.meta.fields || [];
        const rows = parseResult.data.map(row => headers.map(header => row[header]));
        
        // Detect column types
        const types: Record<string, string> = {};
        headers.forEach(header => {
            const sampleValues = parseResult.data
                .slice(0, 100) // Check first 100 rows
                .map(row => row[header])
                .filter(val => val !== null && val !== undefined && val !== '');

            if (sampleValues.length === 0) {
                types[header] = 'TEXT';
                return;
            }

            const allNumbers = sampleValues.every(val => 
                typeof val === 'number' || !isNaN(Number(val))
            );
            const allIntegers = allNumbers && sampleValues.every(val => 
                Number.isInteger(Number(val))
            );
            const allDates = sampleValues.every(val => {
                const date = new Date(val);
                return !isNaN(date.getTime());
            });

            if (allIntegers) {
                types[header] = 'INTEGER';
            } else if (allNumbers) {
                types[header] = 'REAL';
            } else if (allDates) {
                types[header] = 'DATE';
            } else {
                types[header] = 'TEXT';
            }
        });

        return { headers, rows, types };
    }

    /**
     * Create a sanitized table name from filename
     */
    static createTableName(fileName: string): string {
        return fileName
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[^a-zA-Z0-9_]/g, '_') // Replace special chars with underscore
            .replace(/^[^a-zA-Z]/, 'table_') // Ensure starts with letter
            .toLowerCase();
    }
}
