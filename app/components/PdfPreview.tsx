import React from 'react';

type Pos = Map<string, { page: number; x: number; y: number; width: number; height: number }>;

interface Props {
  pages: string[];
  fieldPositions: Pos;
  pdfDimensions?: Array<{ width: number; height: number; dS?: any; renderWidth?: number; renderHeight?: number }>;
  onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>, pageIndex: number) => void;
}

export default function PdfPreview({ pages, fieldPositions, pdfDimensions, onCanvasClick }: Props) {
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
                      // Match rendered image dimensions
                      canvas.style.width = img.offsetWidth + 'px';
                      canvas.style.height = img.offsetHeight + 'px';

                      // Set internal resolution to match natural image size
                      canvas.width = img.naturalWidth;
                      canvas.height = img.naturalHeight;

                      const ctx = canvas.getContext('2d');
                      if (ctx) {
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
                  onClick={(e) => onCanvasClick(e, index)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
