import React, { useEffect } from 'react';
import useAppStore from '../store/useAppStore';

type Pos = Map<string, { page: number; x: number; y: number; width: number; height: number }>;

// PDF preview component displaying pages and overlaying field boxes
export default function PdfPreview() {
  const pages = useAppStore((s) => s.pdfPages);
  const fieldPositions = useAppStore((s) => s.fieldPositions);
  const pdfDimensions = useAppStore((s) => s.pdfDimensions);
  const highlightedField = useAppStore((s) => s.highlightedField);
  const setHighlightedField = useAppStore((s) => s.setHighlightedField);

  // Draw/redraw boxes on canvases when pages, positions, or highlight changes
  useEffect(() => {
    const canvases = document.querySelectorAll('canvas[id^="pdf-canvas-"]');
    canvases.forEach((canvasElement) => {
      const canvas = canvasElement as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw orange boxes for all fields on this page
      Array.from(fieldPositions.entries()).forEach(([name, pos]) => {
        const pageIndex = parseInt(canvas.id.split('-')[2]);
        if (pos.page === pageIndex) {
          ctx.strokeStyle = '#FFA500';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
          ctx.setLineDash([]);
        }
      });

      // If highlighted field on this page, draw red thicker stroke
      if (highlightedField) {
        const pos = fieldPositions.get(highlightedField);
        if (pos && pos.page === parseInt(canvas.id.split('-')[2])) {
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 6;
          ctx.setLineDash([10, 5]);
          ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
          ctx.setLineDash([]);
        }
      }
    });
  }, [pages, fieldPositions, highlightedField]);

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
          // Try to focus corresponding input in form
          const el = document.querySelector(`[data-field-name="${name}"]`) as HTMLElement | null;
          if (el) {
            try {
              (el as HTMLInputElement).focus?.();
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (err) {
                console.error('Error focusing form field:', err);
            }
          }
          return;
        }
      }
    }

    // If no field hit, clear highlight
    setHighlightedField(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-2 overflow-hidden">
      <h3 className="font-semibold">Preview</h3>
      {pdfDimensions && pdfDimensions.length > 0 && (
        <div className="bg-white p-3 rounded border border-gray-300 text-sm">
          <div className="font-semibold mb-2">PDF Info:</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>Pages: {pages.length}</div>
            {pdfDimensions.map((dim, i) => (
              <div key={i}>Page {i + 1}: {Math.round(dim.width)} × {Math.round(dim.height)}px</div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto border rounded bg-white p-2">
        {pages.map((page, index) => {
          const canvasId = `pdf-canvas-${index}`;
          return (
            <div key={index} className="mb-4 relative inline-block w-full">
              <div className="relative w-full inline-block">
                <img
                  src={page}
                  alt={`Page ${index + 1}`}
                  className="w-full border rounded transition block"
                  onLoad={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
                    if (canvas && img.parentElement) {
                      canvas.style.width = img.offsetWidth + 'px';
                      canvas.style.height = img.offsetHeight + 'px';
                      canvas.width = img.naturalWidth;
                      canvas.height = img.naturalHeight;
                      // redraw after sizing
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        Array.from(fieldPositions.entries()).forEach(([name, pos]) => {
                          if (pos.page === index) {
                            ctx.strokeStyle = '#FFA500';
                            ctx.lineWidth = 3;
                            ctx.setLineDash([5, 5]);
                            ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
                            ctx.setLineDash([]);
                          }
                        });
                        // highlight if needed
                        if (highlightedField) {
                          const pos = fieldPositions.get(highlightedField);
                          if (pos && pos.page === index) {
                            ctx.strokeStyle = '#FF0000';
                            ctx.lineWidth = 6;
                            ctx.setLineDash([10, 5]);
                            ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
                            ctx.setLineDash([]);
                          }
                        }
                      }
                    }
                  }}
                />
                <canvas
                  id={canvasId}
                  className="absolute top-0 left-0 border rounded"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleCanvasClick(e as any, index)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
