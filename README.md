# Gridly - AI-Powered Spreadsheet Analysis Platform

**Gridly** is a modern web application that transforms how you analyze spreadsheet data using artificial intelligence. Upload your Excel or CSV files and get instant, comprehensive insights with natural language summaries, interactive visualizations, and AI-powered forecasting.

## 🌟 Key Features

### 📊 **Intelligent Data Analysis**
- **AI-Powered Summaries**: Get key insights, column-by-column analysis, and data quality checks
- **Natural Language Q&A**: Ask questions about your data in plain English
- **Smart Forecasting**: AI predictions with confidence levels and detailed assumptions
- **Data Quality Validation**: Automatic detection of issues with actionable recommendations

### 🎨 **Modern User Experience**
- **Drag & Drop Upload**: Support for CSV, XLSX, and XLS files
- **Interactive Dashboard**: Tabbed interface with AI Analysis and Data Explorer views
- **Real-time Chat**: Conversational AI interface for data exploration
- **Recent Files History**: Quick access to previously analyzed spreadsheets
- **PDF Export**: Generate professional analysis reports

### 📈 **Advanced Visualization**
- **Dynamic Charts**: Line and bar charts for numeric data columns
- **Raw Data Viewer**: Browse your spreadsheet data with pagination
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 🔒 **Privacy & Security**
- **Client-Side Processing**: Your data is processed locally and never stored on our servers
- **Secure Upload**: File type validation and secure handling
- **Local Storage**: Analysis history stored locally on your device

## 🏗️ Application Architecture

### **Frontend Structure**
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout with metadata
│   ├── actions.ts         # Server actions for AI integration
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Shadcn/ui component library
│   ├── analysis-dashboard.tsx  # Main dashboard component
│   ├── file-uploader.tsx      # File upload interface
│   └── icons.tsx              # Custom icon components
├── ai/                    # AI integration layer
│   ├── flows/            # AI workflow definitions
│   │   ├── ai-spreadsheet-summary.ts  # Data summarization
│   │   ├── ai-question-answering.ts   # Q&A functionality
│   │   └── ai-forecasting.ts          # Prediction engine
│   ├── genkit.ts         # AI model configuration
│   └── dev.ts            # Development AI server
├── lib/                   # Utilities and types
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Helper functions
└── hooks/                 # Custom React hooks
    ├── use-mobile.tsx    # Mobile detection
    └── use-toast.ts      # Toast notifications
```

### **Technology Stack**

#### **Core Framework**
- **Next.js 15.3.3**: React framework with App Router and server-side rendering
- **TypeScript**: Type-safe development with strict type checking
- **React 18**: Modern React with concurrent features

#### **AI & Data Processing**
- **Google Genkit**: AI workflow framework
- **Google Gemini 2.5 Flash**: Large language model for analysis
- **XLSX**: Spreadsheet parsing and processing
- **Zod**: Schema validation for AI inputs/outputs

#### **UI & Styling**
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: High-quality component library
- **Radix UI**: Accessible component primitives
- **Lucide React**: Beautiful icon library
- **React Markdown**: Markdown rendering for AI responses

#### **Data Visualization**
- **Recharts**: Composable charting library
- **jsPDF**: PDF generation for reports

#### **State Management & Forms**
- **React Hook Form**: Performant form management
- **Local Storage**: Client-side data persistence

### **AI Workflow Architecture**

The application uses a sophisticated AI pipeline built on Google's Genkit framework:

1. **Data Ingestion**: Spreadsheet files are parsed client-side using XLSX
2. **AI Processing**: Three specialized AI flows handle different analysis types:
   - **Summarization Flow**: Generates comprehensive data insights
   - **Q&A Flow**: Answers specific questions about the data
   - **Forecasting Flow**: Provides predictions with confidence metrics
3. **Schema Validation**: All AI inputs/outputs are validated using Zod schemas
4. **Response Formatting**: AI responses are formatted for optimal user experience

### **Component Architecture**

#### **Main Application (`page.tsx`)**
- File upload handling and validation
- AI analysis orchestration
- State management for analysis results
- Welcome flow for new users
- Recent files management

#### **Analysis Dashboard (`analysis-dashboard.tsx`)**
- Tabbed interface for different views
- AI chat integration
- Data visualization controls
- Raw data table display

#### **File Uploader (`file-uploader.tsx`)**
- Drag & drop functionality
- File type validation
- Progress indication
- Error handling

### **Data Flow**

1. **File Upload**: User uploads CSV/Excel file via drag-and-drop or file picker
2. **Client Parsing**: File is parsed using XLSX library to extract structured data
3. **AI Analysis**: Structured data is sent to AI flows for analysis
4. **Result Display**: Analysis results are displayed in interactive dashboard
5. **Chat Interface**: Users can ask follow-up questions via AI chat
6. **Local Storage**: Analysis results are stored locally for future access

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Google AI API key for Gemini access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gridly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   GOOGLE_GENAI_API_KEY=your_google_ai_api_key_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Start AI development server** (in separate terminal)
   ```bash
   npm run genkit:dev
   ```

6. **Open application**
   Navigate to `http://localhost:9002`

### Available Scripts

- `npm run dev`: Start Next.js development server on port 9002
- `npm run genkit:dev`: Start Genkit AI development server
- `npm run genkit:watch`: Start Genkit in watch mode
- `npm run build`: Build application for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript type checking

## 📝 Usage Guide

### **Basic Workflow**
1. **Upload File**: Drag and drop or click to upload CSV/Excel file
2. **AI Analysis**: Wait for automatic AI analysis to complete
3. **Review Insights**: Examine key insights, column analysis, and data quality issues
4. **Explore Data**: Use the Data Explorer tab for visualizations and raw data
5. **Ask Questions**: Use the chat interface for specific queries
6. **Export Report**: Generate PDF reports of your analysis

### **Advanced Features**
- **Forecasting**: Ask questions like "predict sales for next quarter"
- **Data Quality**: Get automatic recommendations for data improvements
- **Multiple Files**: Switch between recently analyzed files
- **Custom Charts**: Visualize different numeric columns with line/bar charts

## 🛠️ Development

### **Contributing**
1. Read the `CHANGELOG.md` before starting any new task
2. Create feature branches from main
3. Update changelog with your changes
4. Ensure TypeScript compilation passes
5. Test AI functionality with sample data

### **Project Structure Conventions**
- Use TypeScript for all new files
- Follow existing naming conventions
- Add proper type definitions
- Document AI flow changes
- Update changelog for significant changes

### **AI Flow Development**
When creating new AI flows:
1. Define input/output schemas using Zod
2. Create descriptive prompts
3. Add proper error handling
4. Test with various data types
5. Document in changelog

## 📄 License

[Add your license information here]

## 🤝 Support

For questions or issues, please refer to the documentation or create an issue in the repository.

---

**Built with ❤️ using Next.js, TypeScript, and Google AI**
