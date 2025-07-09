import type { Component } from 'solid-js';
import { createSignal, createEffect, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import Papa from 'papaparse';

interface CsvPreviewModalProps {
  isOpen: boolean;
  fileText: string;
  fileName: string;
  onConfirm: (separator: string, hasHeaders: boolean) => void;
  onClose: () => void;
}

export const CsvPreviewModal: Component<CsvPreviewModalProps> = (props) => {
  const [separator, setSeparator] = createSignal(',');
  const [hasHeaders, setHasHeaders] = createSignal(true);
  const [previewData, setPreviewData] = createStore<{ 
    header: string[], 
    rows: Record<string, any>[] 
  }>({ header: [], rows: [] });

  // This effect re-parses the data whenever the separator changes, creating real-time feedback
  createEffect(() => {
    if (props.fileText) {
      Papa.parse(props.fileText, {
        header: hasHeaders(),
        delimiter: separator(),
        preview: 5, // Only show the first 5 rows for performance
        skipEmptyLines: true,
        complete: (results) => {
          if (hasHeaders()) {
            setPreviewData({
              header: results.meta.fields || [],
              rows: results.data as Record<string, any>[],
            });
          } else {
            // When no headers, create column names and treat all rows as data
            const firstRow = results.data[0] as any[];
            const headers = firstRow ? firstRow.map((_, i) => `Column_${i + 1}`) : [];
            const rows = (results.data as any[][]).map(row => {
              const obj: Record<string, any> = {};
              headers.forEach((header, i) => {
                obj[header] = row[i] || '';
              });
              return obj;
            });
            setPreviewData({ header: headers, rows });
          }
        },
      });
    }
  });

  const separators = [
    { label: 'Comma (,)', value: ',' },
    { label: 'Semicolon (;)', value: ';' },
    { label: 'Tab (\\t)', value: '\t' },
    { label: 'Pipe (|)', value: '|' },
  ];

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          'background-color': 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 2000,
          'font-family': 'system-ui, sans-serif'
        }}>
          <div style={{
            'background-color': 'white',
            'border-radius': '12px',
            padding: '24px',
            'max-width': '90vw',
            'max-height': '90vh',
            'overflow-y': 'auto',
            'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '800px'
          }}>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              'font-size': '20px', 
              color: '#1f2937' 
            }}>
              Import CSV: {props.fileName}
            </h2>
            
            <div style={{ 
              'margin-bottom': '20px',
              display: 'flex',
              gap: '20px',
              'align-items': 'center'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '8px', 
                  'font-weight': '500' 
                }}>
                  Separator:
                </label>
                <For each={separators}>
                  {(s) => (
                    <label style={{ 
                      display: 'inline-flex', 
                      'align-items': 'center', 
                      'margin-right': '16px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="separator"
                        value={s.value}
                        checked={separator() === s.value}
                        onChange={(e) => setSeparator(e.currentTarget.value)}
                        style={{ 'margin-right': '6px' }}
                      />
                      {s.label}
                    </label>
                  )}
                </For>
              </div>

              <div>
                <label style={{ 
                  display: 'flex', 
                  'align-items': 'center', 
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={hasHeaders()}
                    onChange={(e) => setHasHeaders(e.currentTarget.checked)}
                  />
                  First row contains headers
                </label>
              </div>
            </div>

            <div style={{
              border: '1px solid #e5e7eb',
              'border-radius': '8px',
              'overflow': 'hidden',
              'margin-bottom': '20px'
            }}>
              <div style={{ 'overflow-x': 'auto', 'max-height': '300px' }}>
                <table style={{ 
                  width: '100%', 
                  'border-collapse': 'collapse',
                  'font-size': '14px'
                }}>
                  <thead>
                    <tr style={{ 'background-color': '#f9fafb' }}>
                      <For each={previewData.header}>
                        {(col) => (
                          <th style={{
                            padding: '12px',
                            'text-align': 'left',
                            'border-bottom': '1px solid #e5e7eb',
                            'font-weight': '600',
                            color: '#374151'
                          }}>
                            {col}
                          </th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={previewData.rows}>
                      {(row, index) => (
                        <tr style={{
                          'background-color': index() % 2 === 0 ? 'white' : '#f9fafb'
                        }}>
                          <For each={previewData.header}>
                             {(col) => (
                               <td style={{
                                 padding: '12px',
                                 'border-bottom': '1px solid #e5e7eb',
                                 color: '#6b7280',
                                 'max-width': '150px',
                                 overflow: 'hidden',
                                 'text-overflow': 'ellipsis',
                                 'white-space': 'nowrap'
                               }}>
                                 {row[col]}
                               </td>
                             )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{
              display: 'flex',
              'justify-content': 'flex-end',
              gap: '12px'
            }}>
              <button 
                onClick={props.onClose}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  'border-radius': '6px',
                  'background-color': 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => props.onConfirm(separator(), hasHeaders())}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  'border-radius': '6px',
                  'background-color': '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Confirm and Import
              </button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};