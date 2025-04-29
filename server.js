const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Use Railway's PORT environment variable

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files (for the HTML)
app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/upload', upload.single('pdfFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const pdfData = await pdfParse(req.file.buffer);

        if (pdfData.text.trim()) {
            res.redirect(`/?text=${encodeURIComponent(pdfData.text)}`);
        } else {
            Tesseract.recognize(
                req.file.buffer,
                'eng', // You can specify other languages here
                { logger: m => console.log(m) } // Optional logger
            ).then(({ data: { text } }) => {
                res.redirect(`/?text=${encodeURIComponent(text)}`);
            }).catch(error => {
                console.error('Tesseract OCR Error:', error);
                res.status(500).send('Error processing PDF with OCR.');
            });
        }
    } catch (error) {
        console.error('Error parsing PDF:', error);
        res.status(500).send('Error processing PDF.');
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});