## 2024-10-24 - Form Required Indicators
**Learning:** Users with cognitive disabilities or screen magnifier users benefit from explicit visual cues for required fields. Relying solely on HTML5 validation without a visual marker before submission degrades form completion confidence.
**Action:** Always include a visual required indicator (`<span className="text-red-500 ml-1" aria-hidden="true">*</span>`) in labels for required inputs, and update tests to use regex queries `getByLabelText(/Label/, { selector: "input" })` to ensure resilience against extra text nodes.
