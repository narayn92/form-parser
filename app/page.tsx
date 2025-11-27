'use client';

import { useState, useEffect, useRef } from "react";
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker - use the local package worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

interface FormField {
  name: string;
  value: string;
  type: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [fieldPositions, setFieldPositions] = useState<Map<string, { page: number; x: number; y: number; width: number; height: number }>>(new Map());
  const [pdfDimensions, setPdfDimensions] = useState<Array<{ width: number; height: number; dS?: any; renderWidth?: number; renderHeight?: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  
  // Extract form fields using Gemini API with PDF images and dimensions
  const extractFormFieldsWithGemini = async (
    pdfImages: string[],
    dimensions: Array<{ width: number; height: number; dS?: any; renderWidth?: number; renderHeight?: number }>,
    scale: number
  ) => {
    setLoading(true);
    try {
      // Call server-side proxy which holds the Gemini API key
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfImages: pdfImages.slice(0, 3), dimensions, scale }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error('Server Gemini proxy error: ' + errText);
      }

      const data = await response.json();
      // Expect server to return parsed JSON under `parsed` key
      const parsedData = data.parsed ?? data;
      if (!parsedData) {
        throw new Error('No parsed data returned from server');
      }

      // Convert API response to FormField array with actual coordinates
      const positions = new Map<string, { page: number; x: number; y: number; width: number; height: number }>();
      const fields: FormField[] = parsedData.fields.map((field: any) => {
        let value = field.value || '';

        // Normalize date fields to DD-MM-YYYY format
        if (field.type === 'date' && value) {
          value = convertToddMMyyyy(value);
        }

        // Store actual coordinates from Gemini, prefer normalized coordinates if present
        const pageNum = field.pageNumber || 0;
        const pageDim = dimensions[pageNum];
        if (pageDim) {
          // Use normalized coordinates when available (recommended)
          let x = 0;
          let y = 0;
          let width = 0;
          let height = 0;

          if (field.coordinates_norm) {
            const renderW = pageDim.renderWidth ?? Math.round(pageDim.width * (pageDim.dS?.xS ?? 1));
            const renderH = pageDim.renderHeight ?? Math.round(pageDim.height * (pageDim.dS?.yS ?? 1));
            x = (field.coordinates_norm.x || 0) * renderW;
            y = (field.coordinates_norm.y || 0) * renderH;
            width = (field.coordinates_norm.width || 0) * renderW;
            height = (field.coordinates_norm.height || 0) * renderH;
          } else if (field.coordinates) {
            const sx = pageDim.dS?.xS ?? 1;
            const sy = pageDim.dS?.yS ?? 1;
            x = (field.coordinates.x || 0) * sx;
            y = (field.coordinates.y || 0) * sy;
            width = (field.coordinates.width || 100) * sx;
            height = (field.coordinates.height || 30) * sy;
          }

          positions.set(field.name, {
            page: pageNum,
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
          });

          
        }

        return {
          name: field.name,
          value: value,
          type: field.type || 'text',
        };
      });

      setFormFields(fields);
      setFieldPositions(positions);
    } catch (error) {
      console.error('Error extracting form fields:', error);
      alert('Error extracting form fields: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        renderPdf(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const renderPdf = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const pdf = await pdfjsLib.getDocument(event.target.result as ArrayBuffer).promise;

          // Render all pages and capture dimensions
          const pages: string[] = [];
          const dimensions: Array<{ width: number; height: number; dS: any; renderWidth?: number; renderHeight?: number }> = [];
          const RENDER_SCALE = 2;
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            // Get original dimensions for Gemini
            const originalViewport = page.getViewport({ scale: 1 });
            // Get scaled viewport for rendering
            const renderViewport = page.getViewport({ scale: RENDER_SCALE });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (context) {
              canvas.width = renderViewport.width;
              canvas.height = renderViewport.height;

              // Store original page dimensions (unscaled) for Gemini and render sizes
              dimensions.push({
                width: originalViewport.width,
                height: originalViewport.height,
                dS: {xS: renderViewport.width / originalViewport.width, yS: renderViewport.height / originalViewport.height},
                renderWidth: renderViewport.width,
                renderHeight: renderViewport.height,
              });
              
              await page.render({
                canvasContext: context,
                viewport: renderViewport,
              }).promise;
              
              pages.push(canvas.toDataURL('image/png'));
            }
          }
          setPdfPages(pages);
          setPdfDimensions(dimensions);

          // Extract form fields using PDF images and dimensions
          await extractFormFieldsWithGemini(pages, dimensions, RENDER_SCALE);
        } catch (error) {
          console.error('Error rendering PDF:', error);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormFields(formFields.map(field =>
      field.name === fieldName ? { ...field, value } : field
    ));
  };

  // Draw highlight box on PDF when field is focused
  const drawHighlightOnPdf = (fieldName: string | null) => {
    // Clear all canvases first
    const canvases = document.querySelectorAll('canvas[id^="pdf-canvas-"]');
    canvases.forEach((canvasElement) => {
      const canvas = canvasElement as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw orange strokes for all fields
        Array.from(fieldPositions.entries()).forEach(([name, pos]) => {
          const pageIndex = parseInt(canvas.id.split('-')[2]);
          if (pos.page === pageIndex) {
            ctx.strokeStyle = '#FFA500'; // Orange
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
            ctx.setLineDash([]);
          }
        });
      }
    });

    if (!fieldName) {
      return;
    }

    const positions = fieldPositions.get(fieldName);
    if (!positions) {
      return;
    }

    // Draw red stroke on the highlighted field
    const canvasId = `pdf-canvas-${positions.page}`;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#FF0000'; // Red
        ctx.lineWidth = 6;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(positions.x, positions.y, positions.width, positions.height);
        ctx.setLineDash([]);
      }
    }
  };

  // Convert various date formats to DD-MM-YYYY
  const convertToddMMyyyy = (dateString: string): string => {
    if (!dateString) return '';
    
    // If already in DD-MM-YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString) || /^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      return dateString.replace(/-/g, '/');
    }
    
    // If in YYYY-MM-DD format (HTML date input)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Try to parse various formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return dateString;
  };

  // Convert DD-MM-YYYY to YYYY-MM-DD for HTML date input
  const convertToYyyyMmDd = (dateString: string): string => {
    if (!dateString) return '';
    
    // If in DD/MM/YYYY or DD-MM-YYYY format
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateString)) {
      const parts = dateString.split(/[/-]/);
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    return dateString;
  };

  return <div className="flex min-h-screen">
    <div className="w-1/2 bg-blue-100 p-8 flex flex-col gap-4">
      <h2 className="text-2xl font-bold">PDF Upload</h2>
      
      <div className="text-sm text-gray-600">Gemini API key is read from the server environment (no client-side key required).</div>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-blue-400 rounded-lg p-8 flex items-center justify-center bg-white cursor-pointer hover:bg-blue-50 transition"
      >
        {pdfFile ? (
          <div className="text-center">
            <p className="font-semibold text-green-600">{pdfFile.name}</p>
            <p className="text-sm text-gray-600">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</p>
            <p className="text-sm text-gray-600">Pages: {pdfPages.length}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">Drag and drop your PDF here</p>
            <p className="text-sm text-gray-400">or click to select</p>
          </div>
        )}
      </div>

      {pdfPages.length > 0 && (
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <h3 className="font-semibold">Preview</h3>
          {pdfDimensions.length > 0 && (
            <div className="bg-white p-3 rounded border border-gray-300 text-sm">
              <div className="font-semibold mb-2">PDF Info:</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Pages: {pdfPages.length}</div>
                {pdfDimensions.map((dim, i) => (
                  <div key={i}>Page {i + 1}: {Math.round(dim.width)} × {Math.round(dim.height)}px</div>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto border rounded bg-white p-2">
            {pdfPages.map((page, index) => {
              const canvasId = `pdf-canvas-${index}`;
              return (
                <div key={index} className="mb-4 relative inline-block w-full">
                  <div className="relative w-full inline-block">
                    <img 
                      src={page} 
                      alt={`Page ${index + 1}`} 
                      className="w-full border rounded transition block"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
                        if (canvas && img.parentElement) {
                          // Set canvas size to match the displayed image size
                          const rect = img.getBoundingClientRect();
                          const containerRect = img.parentElement.getBoundingClientRect();
                          
                          // Match rendered image dimensions
                          canvas.style.width = img.offsetWidth + 'px';
                          canvas.style.height = img.offsetHeight + 'px';
                          
                          // Set internal resolution to match natural image size
                          canvas.width = img.naturalWidth;
                          canvas.height = img.naturalHeight;
                          
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            // Draw field boxes with orange stroke
                            Array.from(fieldPositions.entries()).forEach(([name, pos]) => {
                              if (pos.page === index) {
                                ctx.strokeStyle = '#FFA500'; // Orange
                                ctx.lineWidth = 3;
                                ctx.setLineDash([5, 5]);
                                ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
                                ctx.setLineDash([]);
                              }
                            });
                          }
                        }
                      }}
                    />
                    <canvas
                      id={canvasId}
                      className="absolute top-0 left-0 border rounded"
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

    <div className="w-1/2 bg-green-100 p-8 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-2xl font-bold">Extracted Form</h2>
      
      {loading && (
        <div className="text-center py-4">
          <p className="text-gray-600">Extracting form fields...</p>
        </div>
      )}

      {formFields.length > 0 && (
        <form className="bg-white p-6 rounded border border-gray-300 space-y-4">
          {formFields.map((field) => (
            <div
              key={field.name}
              className={`transition ${
                highlightedField === field.name
                  ? 'bg-yellow-200 p-2 rounded border-2 border-yellow-400'
                  : 'p-2'
              }`}
              onMouseEnter={() => {
                setHighlightedField(field.name);
                drawHighlightOnPdf(field.name);
              }}
              onMouseLeave={() => {
                setHighlightedField(null);
                drawHighlightOnPdf(null);
              }}
            >
              <label className="block text-sm font-semibold mb-1">
                {field.name}
              </label>
              
              {field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={field.value === 'true' || field.value === 'checked'}
                  onChange={(e) =>
                    handleFieldChange(field.name, e.target.checked ? 'true' : 'false')
                  }
                  className="w-4 h-4 cursor-pointer"
                />
              ) : field.type === 'radio' ? (
                <input
                  type="radio"
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-4 h-4 cursor-pointer"
                />
              ) : field.type === 'dropdown' ? (
                <select
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select an option</option>
                  <option value={field.value}>{field.value}</option>
                </select>
              ) : field.type === 'date' ? (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={convertToYyyyMmDd(field.value)}
                    onChange={(e) => {
                      const ddMmYyyy = convertToddMMyyyy(e.target.value);
                      handleFieldChange(field.name, ddMmYyyy);
                    }}
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <span className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-700">
                    {field.value || 'DD/MM/YYYY'}
                  </span>
                </div>
              ) : field.type === 'email' ? (
                <input
                  type="email"
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Enter email"
                />
              ) : field.type === 'phone' ? (
                <input
                  type="tel"
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Enter phone number"
                />
              ) : (
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder={`Enter ${field.name}`}
                />
              )}
            </div>
          ))}
        </form>
      )}

      {formFields.length === 0 && !loading && pdfFile && (
        <p className="text-gray-600">No form fields extracted. Please ensure you have set your Gemini API key.</p>
      )}

      {fieldPositions.size > 0 && (
        <div className="bg-white p-4 rounded border border-gray-300 mt-4">
          <h3 className="font-semibold mb-3 text-lg">Field Positions</h3>
          <div className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-200">
                <tr>
                  <th className="text-left px-2 py-1 border">Field Name</th>
                  <th className="text-left px-2 py-1 border">Page</th>
                  <th className="text-left px-2 py-1 border">X</th>
                  <th className="text-left px-2 py-1 border">Y</th>
                  <th className="text-left px-2 py-1 border">Width</th>
                  <th className="text-left px-2 py-1 border">Height</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(fieldPositions.entries()).map(([name, pos]) => (
                  <tr key={name} className="hover:bg-yellow-100">
                    <td className="px-2 py-1 border text-left">{name}</td>
                    <td className="px-2 py-1 border text-right">{pos.page}</td>
                    <td className="px-2 py-1 border text-right">{pos.x}</td>
                    <td className="px-2 py-1 border text-right">{pos.y}</td>
                    <td className="px-2 py-1 border text-right">{pos.width}</td>
                    <td className="px-2 py-1 border text-right">{pos.height}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>
}
