💡 What: Extract table row in `Submissions` component to a separate `SubmissionRow` wrapped in `React.memo()`.
🎯 Why: Prevents 100 table rows and their nested components (which use `JSON.stringify`) from unnecessarily re-rendering when unrelated state in the parent (like the `exportFormId` dropdown or `downloading` status) changes.
📊 Impact: Reduces virtual DOM diffing overhead and speeds up UI interaction when selecting forms for CSV download.
🔬 Measurement: Verify by rendering the Submissions page with multiple items, opening React DevTools Profiler, and changing the form selection dropdown. The list items will no longer re-render.
