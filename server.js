const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const path = require('path');

const app = express();
// Use Railway's PORT environment variable or default to 3000
const port = process.env.PORT || 3000;

// Configure multer for file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files from the 'views' directory
app.use(express.static(path.join(__dirname, 'views')));

// Route to serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Route to handle PDF uploads and text extraction
app.post('/upload', upload.single('pdfFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    console.log(`Processing file: ${req.file.originalname}, Size: ${req.file.size}`);

    try {
        // Attempt to parse PDF directly
        const pdfData = await pdfParse(req.file.buffer);

        if (pdfData && pdfData.text && pdfData.text.trim()) {
            console.log('Successfully parsed text using pdf-parse.');
            // Redirect back to the homepage with the extracted text in the query string
            res.redirect(`/?text=${encodeURIComponent(pdfData.text)}`);
        } else {
            // If pdf-parse returns empty text, try OCR with Tesseract
            console.log('pdf-parse returned empty text, attempting OCR with Tesseract...');
            Tesseract.recognize(
                req.file.buffer,
                'eng', // Specify the language(s) for OCR
                { logger: m => console.log(m.status, Math.round(m.progress * 100) + '%') } // Log OCR progress
            ).then(({ data: { text } }) => {
                console.log('Successfully parsed text using Tesseract OCR.');
                res.redirect(`/?text=${encodeURIComponent(text)}`);
            }).catch(ocrError => {
                console.error('Tesseract OCR Error:', ocrError);
                // Send a more informative error back, maybe without redirecting
                res.status(500).send(`Error processing PDF with OCR: ${ocrError.message || ocrError}`);
            });
        }
    } catch (parseError) {
        console.error('Error parsing PDF:', parseError);
         // If pdf-parse itself throws an error, potentially try Tesseract as a fallback?
         // Or just report the error. For now, reporting the initial error.
         // Consider adding Tesseract fallback here too if pdf-parse fails catastrophically.
        res.status(500).send(`Error processing PDF: ${parseError.message || parseError}`);
    }
});

app.listen(port, '0.0.0.0', () => { // Listen on 0.0.0.0 for Railway compatibility
    console.log(`Server listening on port ${port}`);
});