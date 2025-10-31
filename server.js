// --- REQUIRED SETUP ---
// 1. Create a folder named 'uploads' in the same directory as this file.
// 2. Run 'npm init -y'
// 3. Install dependencies: 'npm install express multer'
// 4. Run the server: 'node server.js'

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// --- 1. Setup Storage for Multer ---
// This configures where uploaded files will be saved and what they will be named.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create the upload directory if it doesn't exist
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR);
        }
        cb(null, UPLOAD_DIR); // Files will be saved in the 'uploads/' directory
    },
    filename: (req, file, cb) => {
        // We ensure the original name is used so the device can reliably call it.
        // Sanitization is recommended in a production environment.
        const originalName = file.originalname;
        console.log(`Saving file with original name: ${originalName}`);
        cb(null, originalName);
    }
});

const upload = multer({ storage: storage });

// --- 2. Serve Static Files (The magic for the device link) ---
// This line makes the 'uploads' directory publicly accessible.
// A file uploaded as 'firmware.bin' will be available at:
// http://localhost:3000/uploads/firmware.bin
app.use('/uploads', express.static(UPLOAD_DIR));

// --- 3. Route for File Upload Form (GET /) ---
app.get('/', (req, res) => {
    // Simple HTML form for uploading the file
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BIN File Uploader</title>
            <style>
                body { font-family: sans-serif; padding: 20px; background-color: #f4f4f9; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                h1 { color: #333; }
                input[type="file"] { padding: 10px; border: 1px solid #ddd; border-radius: 4px; display: block; margin-bottom: 20px; width: 100%; box-sizing: border-box; }
                button { background-color: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
                button:hover { background-color: #45a049; }
                .link-box { margin-top: 20px; padding: 15px; background-color: #e6f7ff; border: 1px solid #b3e0ff; border-radius: 4px; word-wrap: break-word; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Upload Binary File (.bin)</h1>
                <form action="/upload" method="post" enctype="multipart/form-data">
                    <input type="file" name="binFile" accept=".bin" required>
                    <button type="submit">Upload File</button>
                </form>
                <p>---</p>
                <p>Uploaded files will be available for devices here (replace [filename.bin] with your file name):</p>
                <div class="link-box">
                    <strong>http://localhost:${PORT}/uploads/[filename.bin]</strong>
                </div>
            </div>
        </body>
        </html>
    `);
});

// --- 4. Route to Handle Upload (POST /upload) ---
// 'binFile' must match the 'name' attribute in the input field of the HTML form.
app.post('/upload', upload.single('binFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file was uploaded.');
    }

    const filename = req.file.filename;
    const fileLink = `http://localhost:${PORT}/uploads/${filename}`;

    // Respond with a success message and the accessible link
    res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Upload Successful</title>
            <style>
                body { font-family: sans-serif; padding: 20px; background-color: #f4f4f9; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                h1 { color: #4CAF50; }
                .link-box { margin-top: 20px; padding: 15px; background-color: #e6f7ff; border: 1px solid #b3e0ff; border-radius: 4px; word-wrap: break-word; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ Upload Successful!</h1>
                <p>The file <strong>${filename}</strong> is now available.</p>
                <p>The device link to download/access this file is:</p>
                <div class="link-box">
                    <a href="${fileLink}" target="_blank">${fileLink}</a>
                </div>
                <p style="margin-top: 20px;"><a href="/">← Upload another file</a></p>
            </div>
        </body>
        </html>
    `);
});


// --- 5. Start the Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`Upload directory: ${UPLOAD_DIR}`);
});

// Basic error handler for Multer/Express
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        return res.status(500).send({ error: err.message, code: err.code });
    }
    // General errors
    res.status(500).send('An unexpected error occurred during file upload.');
});
