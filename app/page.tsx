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

import { renderPdfFile } from './utils/pdfUtils';
import { analyzeWithGemini } from './utils/geminiClient';
import { convertToddMMyyyy, convertToYyyyMmDd } from './utils/dateUtils';
import PdfPreview from './components/PdfPreview';
import FormPanel from './components/FormPanel';
import PdfUpload from './components/PdfUpload';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        renderPdf(file);
      }
    }
    // reset input so same file can be selected again if needed
    e.currentTarget.value = '';
  };

  const renderPdf = async (file: File) => {
    setLoading(true);
    try {
      const RENDER_SCALE = 2;
      const { pages, dimensions } = await renderPdfFile(file, RENDER_SCALE);
      setPdfPages(pages);
      setPdfDimensions(dimensions);

      // Call server (which returns parsed JSON) and map fields to positions
      const parsedData = await analyzeWithGemini(pages, dimensions, RENDER_SCALE);
      if (!parsedData) {
        throw new Error('No parsed data from server');
      }

      const positions = new Map<string, { page: number; x: number; y: number; width: number; height: number }>();
      const fields: FormField[] = (parsedData.fields || []).map((field: any) => {
        let value = field.value || '';
        if (field.type === 'date' && value) {
          value = convertToddMMyyyy(value);
        }

        const pageNum = field.pageNumber || 0;
        const pageDim = dimensions[pageNum];
        if (pageDim) {
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
          value,
          type: field.type || 'text',
        };
      });

      setFormFields(fields);
      setFieldPositions(positions);
    } catch (err) {
      console.error('Error rendering/extracting PDF:', err);
      alert('Error processing PDF: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
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

  // Handle clicks on the canvas to select fields
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, pageIndex: number) => {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const [name, pos] of fieldPositions.entries()) {
      if (pos.page === pageIndex) {
        if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
          setHighlightedField(name);
          drawHighlightOnPdf(name);
          // Try to focus the corresponding input in the form
          const el = document.querySelector(`[data-field-name="${name}"]`) as HTMLElement | null;
          if (el) {
            try {
              (el as HTMLInputElement).focus?.();
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (err) {
              // ignore
            }
          }
          return;
        }
      }
    }

    // If click didn't hit any field, clear highlight
    setHighlightedField(null);
    drawHighlightOnPdf(null);
  };

  

  return <div className="flex min-h-screen">
    <div className="w-1/2 bg-blue-100 p-8 flex flex-col gap-4">
      <PdfUpload
        pdfFile={pdfFile}
        pdfPagesLength={pdfPages.length}
        fileInputRef={fileInputRef}
        openFilePicker={openFilePicker}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        handleFileInputChange={handleFileInputChange}
      />

      {pdfPages.length > 0 && (
        <PdfPreview pages={pdfPages} fieldPositions={fieldPositions} pdfDimensions={pdfDimensions} onCanvasClick={handleCanvasClick} />
      )}
    </div>

    <FormPanel
      formFields={formFields}
      highlightedField={highlightedField}
      setHighlightedField={setHighlightedField}
      handleFieldChange={handleFieldChange}
      drawHighlightOnPdf={drawHighlightOnPdf}
      fieldPositions={fieldPositions}
      loading={loading}
      pdfFile={pdfFile}
    />
  </div>
}
