import { create } from 'zustand';
import { renderPdfFile } from '../utils/pdfUtils';
import { analyzeWithGemini } from '../utils/geminiClient';
import { convertToddMMyyyy } from '../utils/dateUtils';

export interface FieldPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FormField {
  name: string;
  value: string;
  type: string;
  pageNumber?: number;
}

interface AppState {
  pdfFile: File | null;
  pdfPages: string[];
  formFields: FormField[];
  loading: boolean;
  submitting: boolean;
  submitted: boolean;
  highlightedField: string | null;
  fieldPositions: Map<string, FieldPosition>;
  pdfDimensions: Array<{ width: number; height: number; dS?: any; renderWidth?: number; renderHeight?: number }>;

  setPdfFile: (f: File | null) => void;
  setPdfPages: (p: string[]) => void;
  setFormFields: (f: FormField[]) => void;
  setLoading: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setSubmitted: (v: boolean) => void;
  setHighlightedField: (n: string | null) => void;
  setFieldPositions: (m: Map<string, FieldPosition>) => void;
  setPdfDimensions: (d: Array<{ width: number; height: number; dS?: any; renderWidth?: number; renderHeight?: number }>) => void;
  processPdf: (file: File) => Promise<void>;
  submitForm: () => Promise<void>;
}

// Zustand store for managing application state
export const useAppStore = create<AppState>((set) => ({
  pdfFile: null,
  pdfPages: [],
  formFields: [],
  loading: false,
  submitting: false,
  submitted: false,
  highlightedField: null,
  fieldPositions: new Map<string, FieldPosition>(),
  pdfDimensions: [],

  setPdfFile: (f: File | null) => set({ pdfFile: f }),
  setPdfPages: (p: string[]) => set({ pdfPages: p }),
  setFormFields: (f) => set({ formFields: f }),
  setLoading: (v: boolean) => set({ loading: v }),
  setSubmitting: (v: boolean) => set({ submitting: v }),
  setSubmitted: (v: boolean) => set({ submitted: v }),
  setHighlightedField: (n) => set({ highlightedField: n }),
  setFieldPositions: (m: Map<string, FieldPosition>) => set({ fieldPositions: m }),
  setPdfDimensions: (d: Array<{ width: number; height: number; dS?: any; renderWidth?: number; renderHeight?: number }>) => set({ pdfDimensions: d }),
  processPdf: async (file: File) => {
    set({ loading: true });
    try {
      const RENDER_SCALE = 2;
      const { pages, dimensions } = await renderPdfFile(file, RENDER_SCALE);
      set({ pdfPages: pages, pdfDimensions: dimensions, pdfFile: file });

      const parsedData = await analyzeWithGemini(pages, dimensions, RENDER_SCALE);
      if (!parsedData) {
        throw new Error('No parsed data from server');
      }

      const positions = new Map<string, FieldPosition>();
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

      set({ formFields: fields, fieldPositions: positions });
    } catch (err) {
      console.error('Error processing PDF in store:', err);
    } finally {
      set({ loading: false });
    }
  },
  submitForm: async () => {
    console.log('submitForm')
    set({ submitting: true });
    try {
      // Simulate server request (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear application state
      set({
        pdfFile: null,
        pdfPages: [],
        formFields: [],
        fieldPositions: new Map(),
        pdfDimensions: [],
        highlightedField: null,
        submitted: true,
        submitting: false,
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => set({ submitted: false }), 5000);
    } catch (err) {
      console.error('Error submitting form:', err);
      set({ submitting: false });
    }
  },
}));

export default useAppStore;
