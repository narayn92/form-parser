import React from 'react';
import { convertToddMMyyyy, convertToYyyyMmDd } from '../utils/dateUtils';

interface FormField {
  name: string;
  value: string;
  type: string;
}

interface Props {
  formFields: FormField[];
  highlightedField: string | null;
  setHighlightedField: (n: string | null) => void;
  handleFieldChange: (name: string, value: string) => void;
  drawHighlightOnPdf: (name: string | null) => void;
  fieldPositions: Map<string, { page: number; x: number; y: number; width: number; height: number }>;
  loading: boolean;
  pdfFile: File | null;
}

export default function FormPanel({ formFields, highlightedField, setHighlightedField, handleFieldChange, drawHighlightOnPdf, fieldPositions, loading, pdfFile }: Props) {
  return (
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
                highlightedField === field.name ? 'bg-yellow-200 p-2 rounded border-2 border-yellow-400' : 'p-2'
              }`}
            >
              <label className="block text-sm font-semibold mb-1">{field.name}</label>

              {field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  data-field-name={field.name}
                  name={field.name}
                  checked={field.value === 'true' || field.value === 'checked'}
                  onChange={(e) => handleFieldChange(field.name, e.target.checked ? 'true' : 'false')}
                  onFocus={() => {
                    setHighlightedField(field.name);
                    drawHighlightOnPdf(field.name);
                  }}
                  onBlur={() => {
                    setHighlightedField(null);
                    drawHighlightOnPdf(null);
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
              ) : field.type === 'radio' ? (
                <input
                  type="radio"
                  data-field-name={field.name}
                  name={field.name}
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  onFocus={() => {
                    setHighlightedField(field.name);
                    drawHighlightOnPdf(field.name);
                  }}
                  onBlur={() => {
                    setHighlightedField(null);
                    drawHighlightOnPdf(null);
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
              ) : field.type === 'dropdown' ? (
                <select
                  data-field-name={field.name}
                  name={field.name}
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  onFocus={() => {
                    setHighlightedField(field.name);
                    drawHighlightOnPdf(field.name);
                  }}
                  onBlur={() => {
                    setHighlightedField(null);
                    drawHighlightOnPdf(null);
                  }}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select an option</option>
                  <option value={field.value}>{field.value}</option>
                </select>
              ) : field.type === 'date' ? (
                <div className="flex gap-2">
                  <input
                    type="date"
                    data-field-name={field.name}
                    name={field.name}
                    value={convertToYyyyMmDd(field.value)}
                    onChange={(e) => {
                      const ddMmYyyy = convertToddMMyyyy(e.target.value);
                      handleFieldChange(field.name, ddMmYyyy);
                    }}
                    onFocus={() => {
                      setHighlightedField(field.name);
                      drawHighlightOnPdf(field.name);
                    }}
                    onBlur={() => {
                      setHighlightedField(null);
                      drawHighlightOnPdf(null);
                    }}
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <span className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-700">{field.value || 'DD/MM/YYYY'}</span>
                </div>
              ) : (
                <input
                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                  data-field-name={field.name}
                  name={field.name}
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  onFocus={() => {
                    setHighlightedField(field.name);
                    drawHighlightOnPdf(field.name);
                  }}
                  onBlur={() => {
                    setHighlightedField(null);
                    drawHighlightOnPdf(null);
                  }}
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
  );
}
