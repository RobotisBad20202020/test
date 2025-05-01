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
            const pdfData = await pdfParse(req.file.buffer);
    
            if (pdfData && pdfData.text && pdfData.text.trim()) {
                console.log('Successfully parsed text using pdf-parse.');
                res.send(`<script>localStorage.setItem('extractedText', '${encodeURIComponent(pdfData.text)}'); window.location.href = '/';</script>`);
            } else {
                console.log('pdf-parse returned empty text, attempting OCR with Tesseract...');
                Tesseract.recognize(
                    req.file.buffer,
                    'eng',
                    { logger: m => console.log(m.status, Math.round(m.progress * 100) + '%') }
                ).then(({ data: { text } }) => {
                    console.log('Successfully parsed text using Tesseract OCR.');
                    res.send(`<script>localStorage.setItem('extractedText', '${encodeURIComponent(text)}'); window.location.href = '/';</script>`);
                }).catch(ocrError => {
                    console.error('Tesseract OCR Error:', ocrError);
                    res.send(`<script>localStorage.setItem('extractionError', '${encodeURIComponent(`Error processing PDF with OCR: ${ocrError.message || ocrError}`)}'); window.location.href = '/';</script>`);
                });
            }
        } catch (parseError) {
            console.error('Error parsing PDF:', parseError);
            res.send(`<script>localStorage.setItem('extractionError', '${encodeURIComponent(`Error processing PDF: ${parseError.message || parseError}`)}'); window.location.href = '/';</script>`);
        }
    });

app.listen(port, '0.0.0.0', () => { // Listen on 0.0.0.0 for Railway compatibility
    console.log(`Server listening on port ${port}`);
});