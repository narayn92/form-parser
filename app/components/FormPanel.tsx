import React from 'react';
import { convertToddMMyyyy, convertToYyyyMmDd } from '../utils/dateUtils';
import useAppStore from '../store/useAppStore';
import Loader from './Loader';

interface FormField {
  name: string;
  value: string;
  type: string;
}

// Form panel component displaying extracted form fields and handling user input
export default function FormPanel() {
  const formFields = useAppStore((s) => s.formFields);
  const highlightedField = useAppStore((s) => s.highlightedField);
  const setHighlightedField = useAppStore((s) => s.setHighlightedField);
  const loading = useAppStore((s) => s.loading);
  const submitting = useAppStore((s) => s.submitting);
  const pdfFile = useAppStore((s) => s.pdfFile);
  const setFormFields = useAppStore((s) => s.setFormFields);
  const submitForm = useAppStore((s) => s.submitForm);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormFields(formFields.map((field: FormField) =>
      field.name === fieldName ? { ...field, value } : field
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  return (
    <div className="w-1/2 bg-green-100 p-8 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-2xl font-bold">Extracted Form</h2>

      {loading && (
        <div className="text-center py-4 flex flex-col items-center gap-2">
          <Loader />
          <p className="text-gray-600">Extracting form fields...</p>
        </div>
      )}

      {formFields.length > 0 && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded border border-gray-300 space-y-4">
          {formFields.map((field) => (
            <div
              key={field.name}
              className={`transition ${highlightedField === field.name ? 'bg-yellow-200 p-2 rounded border-2 border-yellow-400' : 'p-2'
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
                  onFocus={() => { setHighlightedField(field.name); }}
                  onBlur={() => { setHighlightedField(null); }}
                  className="w-4 h-4 cursor-pointer"
                />
              ) : field.type === 'radio' ? (
                <input
                  type="radio"
                  data-field-name={field.name}
                  name={field.name}
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  onFocus={() => { setHighlightedField(field.name); }}
                  onBlur={() => { setHighlightedField(null); }}
                  className="w-4 h-4 cursor-pointer"
                />
              ) : field.type === 'dropdown' ? (
                <select
                  data-field-name={field.name}
                  name={field.name}
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  onFocus={() => { setHighlightedField(field.name); }}
                  onBlur={() => { setHighlightedField(null); }}
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
                    onFocus={() => { setHighlightedField(field.name); }}
                    onBlur={() => { setHighlightedField(null); }}
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
                  onFocus={() => { setHighlightedField(field.name); }}
                  onBlur={() => { setHighlightedField(null); }}
                  className="w-full px-3 py-2 border rounded"
                  placeholder={`Enter ${field.name}`}
                />
              )}
            </div>
          ))}

          {formFields.length > 0 && (
            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading || submitting}
              >
                {submitting && <Loader className="h-4 w-4 text-white" />}
                {submitting ? 'Submitting...' : 'Submit Form'}
              </button>
            </div>
          )}
        </form>
      )}

      {formFields.length === 0 && !loading && pdfFile && (
        <p className="text-gray-600">No form fields extracted.</p>
      )}
    </div>
  );
}
