 'use client';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker - use the local package worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

import PdfPreview from './components/PdfPreview';
import FormPanel from './components/FormPanel';
import PdfUpload from './components/PdfUpload';
import useAppStore from './store/useAppStore';

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

// Main application component
export default function Home() {
  const pdfPages = useAppStore((s) => s.pdfPages);
  const submitted = useAppStore((s) => s.submitted);
  
  return <div className="flex min-h-screen relative">
    <div className="w-1/2 bg-blue-100 p-8 flex flex-col gap-4">
      <PdfUpload />

      {pdfPages.length > 0 && (
        <PdfPreview />
      )}
    </div>

    <FormPanel />

    {submitted && (
      <div className="fixed top-4 right-4 z-50 text-white bg-green-600 px-6 py-3 rounded-lg shadow-lg">
        Form submitted successfully.
      </div>
    )}
  </div>
}
