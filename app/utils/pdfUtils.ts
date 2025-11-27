import * as pdfjsLib from 'pdfjs-dist';

export async function renderPdfFile(file: File, renderScale = 2) {
  return new Promise<{ pages: string[]; dimensions: Array<{ width: number; height: number; dS: any; renderWidth?: number; renderHeight?: number }> }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result) return reject(new Error('Empty file'));
      try {
        const pdf = await pdfjsLib.getDocument(event.target.result as ArrayBuffer).promise;
        const pages: string[] = [];
        const dimensions: Array<{ width: number; height: number; dS: any; renderWidth?: number; renderHeight?: number }> = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const originalViewport = page.getViewport({ scale: 1 });
          const renderViewport = page.getViewport({ scale: renderScale });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          canvas.width = renderViewport.width;
          canvas.height = renderViewport.height;

          dimensions.push({
            width: originalViewport.width,
            height: originalViewport.height,
            dS: { xS: renderViewport.width / originalViewport.width, yS: renderViewport.height / originalViewport.height },
            renderWidth: renderViewport.width,
            renderHeight: renderViewport.height,
          });

          await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
          pages.push(canvas.toDataURL('image/png'));
        }

        resolve({ pages, dimensions });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

export default { renderPdfFile };
