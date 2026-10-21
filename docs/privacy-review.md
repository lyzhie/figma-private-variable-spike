# Distribution privacy review

Reviewed source, generated runtime, tests, manifest template, dependency metadata and documentation before initial upload.

## Excluded from version control

- Native-workspace instructions containing personal names and absolute paths.
- Raw experiment payloads and observation logs containing actual Figma variable IDs/keys, node IDs and private file URLs.
- Personal manifest with the account-assigned plugin ID.
- Local dependency installations, environment files, archives and incidental OS files.

Only the generic manifest template is committed. A fresh Git history is used; excluded files were not committed before removal. Commit identity uses a GitHub noreply address.

## Retained by design

- Figma API names and synthetic test values.
- Public package registry URLs and dependency integrity hashes.
- Runtime code that reads and stores user-selected design metadata inside Figma. The repository contains the code, not collected user data.

Scans reduce accidental disclosure risk but are not a formal security certification. No credentials were found in the reviewed upload set.
