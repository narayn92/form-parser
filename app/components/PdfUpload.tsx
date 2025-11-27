import React from 'react';

interface Props {
  pdfFile: File | null;
  pdfPagesLength: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  openFilePicker: () => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PdfUpload({ pdfFile, pdfPagesLength, fileInputRef, openFilePicker, handleDrop, handleDragOver, handleFileInputChange }: Props) {
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
