# Changelog

All notable changes to **Gridly** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Fixed AI chat interface layout to use full viewport height, eliminating need to scroll to see input field
- Improved dashboard layout responsiveness with proper height constraints
- Updated logo component to use gridly-logo.png instead of SVG logo
- Created public directory and moved logo asset for proper Next.js static serving
- Increased logo size in header from h-8 to h-12 for better visibility

### Added
- Initial application setup with comprehensive AI-powered spreadsheet analysis
- Welcome dialog for first-time users with step-by-step onboarding
- File upload functionality supporting CSV, XLSX, and XLS formats
- Drag-and-drop file upload interface
- Real-time AI analysis with loading states and progress messages
- Interactive dashboard with tabbed interface (AI Analysis & Data Explorer)
- AI-powered chat interface for follow-up questions about data
- Recent files history with local storage persistence
- PDF export functionality for analysis reports
- Data visualization with line and bar charts for numeric columns
- Raw data table viewer with first 100 rows display
- Responsive design with mobile-friendly layout

### AI Features
- **Spreadsheet Summary**: Comprehensive analysis including key insights, column-by-column analysis, row-level findings, and data quality issues
- **Question Answering**: Natural language Q&A interface for data exploration
- **Forecasting**: AI-powered predictions with confidence levels and assumptions
- Integration with Google's Gemini 2.5 Flash model via Genkit

### Technical Implementation
- Next.js 15.3.3 with TypeScript and App Router
- Tailwind CSS for styling with custom design system
- Shadcn/ui component library for consistent UI elements
- XLSX library for spreadsheet parsing
- Recharts for data visualization
- React Hook Form for form management
- Local storage for data persistence
- Firebase integration ready (apphosting.yaml configured)

### Security & Privacy
- Client-side file processing (data not stored on servers)
- Secure file upload with type validation
- Local storage for analysis history

---

## Instructions for Future Updates

When making changes to this application, please:

1. **Read this changelog** before starting any new task to understand the current state
2. **Document all changes** by adding entries to the appropriate section above
3. **Use semantic versioning** when tagging releases
4. **Group changes** by type: Added, Changed, Deprecated, Removed, Fixed, Security
5. **Be specific** about what was changed and why
6. **Include technical details** for developers who need to understand the implementation

### Change Categories
- **Added**: New features
- **Changed**: Changes in existing functionality  
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

### Entry Format
```
### [Category]
- Brief description of change [Context/reason if needed]
- Technical implementation details for complex changes
- Migration notes if applicable
```