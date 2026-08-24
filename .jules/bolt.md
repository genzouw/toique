## 2026-08-24 - Pre-compute Search Targets for Static Datasets
**Learning:** Performing array mapping and string lowercasing inside a component's render function (even inside useMemo) during rapid user input (like search typing) causes unnecessary CPU overhead from string allocations.
**Action:** When filtering static datasets (like FAQs) on the client, always pre-compute searchable string targets at the module level outside the React component to ensure they are only allocated once.
