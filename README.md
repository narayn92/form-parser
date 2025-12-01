# PDF Form Parser

An intelligent PDF form parser that uses AI to automatically extract and recognize form fields from PDF documents. Upload a PDF, and the application identifies form fields, their positions, and allows interactive editing with visual feedback.

## Features

- **AI-Powered Form Detection**: Uses Google Gemini AI to analyze PDFs and extract form fields
- **Interactive Field Highlighting**: Click on form fields to see their location on the PDF
- **Real-time PDF Preview**: Visual representation of PDF pages with canvas-based field overlays
- **Drag & Drop Upload**: Easy file upload with drag-and-drop support
- **Type-Safe State Management**: Centralized Zustand store for predictable state updates
- **Form Submission**: Submit extracted forms with loading states and success notifications

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety and better developer experience
- **Zustand** - Lightweight state management
- **PDF.js** - Client-side PDF rendering
- **Google Gemini AI** - Form field extraction and analysis
- **Tailwind CSS** - Utility-first styling
- **Canvas API** - Interactive field highlighting

## Architecture & Approach

### State Management
The application uses **Zustand** for centralized state management with the following structure:

- `pdfFile` - Uploaded PDF file
- `pdfPages` - Array of base64-encoded page images
- `formFields` - Extracted form field data (name, type, value)
- `fieldPositions` - Coordinates for each field on the PDF
- `pdfDimensions` - Page dimensions for accurate rendering
- `highlightedField` - Currently focused field
- `loading` - PDF processing state
- `submitting` - Form submission state
- `submitted` - Success notification state

### Component Architecture

```
app/
├── page.tsx              # Root layout with toast notifications
├── components/
│   ├── PdfUpload.tsx     # File upload with drag & drop
│   ├── PdfPreview.tsx    # Canvas-based PDF viewer with highlights
│   ├── FormPanel.tsx     # Extracted form fields editor
│   └── Loader.tsx        # Reusable spinner component
├── store/
│   └── useAppStore.ts    # Zustand store with actions
├── utils/
│   ├── pdfUtils.ts       # PDF rendering logic
│   ├── geminiClient.ts   # AI analysis integration
│   └── dateUtils.ts      # Date format converters
└── api/
    └── gemini/route.ts   # API route for Gemini calls with caching
```

### Workflow

1. **Upload PDF**: User uploads a PDF via drag-and-drop or file picker
2. **Process PDF**: 
   - PDF is converted to images using PDF.js
   - Images are sent to Gemini API endpoint (checks cache first)
   - Cache hit returns instant results, cache miss triggers AI analysis
3. **Extract Fields**: AI identifies form fields with:
   - Field name and type (text, checkbox, date, etc.)
   - Bounding box coordinates
   - Default values
4. **Interactive Editing**:
   - Fields are rendered in the form panel
   - Clicking a field highlights its position on the PDF
   - Canvas overlays show field boundaries
5. **Submit Form**: User can edit values and submit with visual feedback

### Key Design Decisions

- **Centralized PDF Processing**: The `processPdf` action in the store handles the entire pipeline from file upload to field extraction
- **Canvas-Based Highlighting**: Uses HTML canvas for precise field position rendering without modifying the PDF
- **Separate Loading States**: Distinct `loading` (PDF processing) and `submitting` (form submission) states for better UX
- **Component Isolation**: Each component manages its own UI logic while reading from the shared store
- **Type Safety**: TypeScript interfaces ensure data consistency across components
- **Response Caching**: In-memory cache for Gemini API responses using SHA-256 hash of request payload (PDF images + dimensions) to avoid redundant AI calls for identical PDFs

## Setup

### Prerequisites

- Node.js 20+ 
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/narayn92/form-parser.git
cd form-parser
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Upload a PDF form using the upload area
2. Wait for AI analysis to extract form fields
3. Click on fields in the form panel to see their location on the PDF
4. Edit field values as needed
5. Click "Submit Form" to complete

## Build for Production

```bash
npm run build
npm start
```

## Performance Optimizations

### API Response Caching
The Gemini API route implements an in-memory cache to avoid redundant AI calls:

- **Cache Key**: SHA-256 hash of request payload (PDF images + dimensions + scale)
- **Storage**: Simple Map-based in-memory cache (resets on server restart)
- **Benefits**: 
  - Instant responses for re-uploaded identical PDFs
  - Reduced API costs and latency
  - Better user experience during development/testing

**Note**: For production with multiple server instances, consider using Redis or another distributed cache.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI analysis | Yes |

## License

MIT
