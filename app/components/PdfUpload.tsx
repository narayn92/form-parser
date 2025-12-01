import React, { useRef } from 'react';
import useAppStore from '../store/useAppStore';

// PDF upload component with drag-and-drop and file picker
export default function PdfUpload() {
  const pdfFile = useAppStore((s) => s.pdfFile);
  const pdfPagesLength = useAppStore((s) => s.pdfPages.length);
  const processPdf = useAppStore((s) => s.processPdf);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        await processPdf(file);
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        await processPdf(file);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold">PDF Upload</h2>
      <div
        onClick={openFilePicker}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-blue-400 rounded-lg p-8 flex items-center justify-center bg-white cursor-pointer hover:bg-blue-50 transition"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        {pdfFile ? (
          <div className="text-center">
            <p className="font-semibold text-green-600">{pdfFile.name}</p>
            <p className="text-sm text-gray-600">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</p>
            <p className="text-sm text-gray-600">Pages: {pdfPagesLength}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">Drag and drop your PDF here</p>
            <p className="text-sm text-gray-400">or click to select</p>
          </div>
        )}
      </div>
    </div>
  );
}
