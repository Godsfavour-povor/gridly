# Changelog

All notable changes to **Gridly** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-document ingestion: upload multiple CSV/XLSX/XLS files in one session; union schema with a synthetic `Document` column.
- Combined analysis pipeline: builds a `combinedParsedData` and `combinedStringData` that tag each section with `### Document: <fileName>`.
- Source-aware AI summaries: new server action `getSummaryActionMulti` generates a combined summary and per-document summaries; prompts enforce explicit source citation.
- Source-aware chat: questions use the combined dataset (when present) and instruct AI to cite sources, e.g., “(Source: file.xlsx)”.
- Per-document reporting UI: AI Analysis tab now includes a “Per-Document Analysis” accordion (Key Insights per file).
- Cross-document PDF export: first renders Cross-Document sections, then appends individual sections per source document.
- Data Explorer improvements: prefers combined dataset when present; Document appears as a category; legends constrained with tidy chip lists.
- Mobile chat experience: floating button opens a bottom sheet with the chat panel; desktop retains sidebar.
- Dynamic progress and ETA: uploader emits granular progress events (preparing/reading/combining) and the page shows phase-specific text and estimated time remaining; analysis ETA during AI processing.

### Changed
- Performance: switched spreadsheet parsing to `FileReader.readAsArrayBuffer` and `XLSX.read(type: 'array')`; used `sheet_to_json(..., raw: true, dense: true)` to reduce overhead.
- Dashboard: defaults category to `Document` when available; visual components use the combined dataset for charts/filters/tables where applicable.
- Chat data source: prefers `combinedStringData` (when multi-doc) to ensure answers consider all uploaded documents.
- PDF: consolidated Cross-Document headings and added per-document sections for clarity and traceability.

### Fixed
- Improved monthly trend rendering with guards and friendlier fallbacks when a date column is not detected.
- Donut legends no longer overflow; long category lists are summarized and contained in scrollable chip containers.

### Developer Notes
- Types: `DocumentData` introduced; `AnalysisResult` extended with `documents`, `combinedParsedData`, `combinedStringData`, `combinedMetrics`, `documentSummaries`, `combinedSummary` (all optional for backward compatibility).
- New action: `getSummaryActionMulti(documents, combinedStringData)` in `src/app/actions.ts`.
- Controller wiring in `src/app/page.tsx`: multi-doc flow, chat over combined data, enhanced PDF export, dynamic progress + ETA.
- File uploader in `src/components/file-uploader.tsx`: multiple file parsing, union/merge, progress emission, improved performance.
- Dashboard in `src/components/analysis-dashboard.tsx`: prefers combined dataset, “Per-Document Analysis” accordion, Document default category, and Compare-friendly visuals.

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