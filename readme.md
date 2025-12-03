# Storytime Library
A two-page experience for uploading, organizing, and reading illustrated PDFs with optional audio narration.

## Pages
- `index.html`: small landing page linking to admin and reader.
- `admin.html`: upload PDFs with matching audio, generate a cover from the first page, and store everything locally in `localStorage`.
- `reader.html`: automatically detects all saved stories in the browser, shows their covers, and opens the read-aloud/"read by myself" overlay.

## Features
- Upload a PDF and matching audio file to create a book entry stored in the browser.
- Automatic cover generation from the first page of the PDF.
- Reader overlay with manual navigation or "Read to me" mode that auto-plays audio and pages.

## Getting started
Open `admin.html` to add stories, then visit `reader.html` to view them. All data stays in `localStorage` on the same device.
