// --- REQUIRED SETUP ---
// 1. Create a folder named 'uploads' in the same directory as this file.
// 2. Run 'npm init -y'
// 3. Install dependencies: 'npm install express multer'
// 4. Run the server: 'node server.js'
// ----------------------

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
// Use the environment port (provided by Render/cloud host) or default to 3000 locally.
const PORT = process.env.PORT || 3000; 
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// --- 1. Setup Storage for Multer ---
// This configures where uploaded files will be saved and what they will be named.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create the upload directory if it doesn't exist (important for Render deployment)
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR);
        }
        cb(null, UPLOAD_DIR); // Files will be saved in the 'uploads/' directory
    },
    filename: (req, file, cb) => {
        // Use the original file name, which is necessary for the device to request the correct file.
        const originalName = file.originalname;
        console.log(`Saving file with original name: ${originalName}`);
        cb(null, originalName);
    }
});

const upload = multer({ storage: storage });

// --- 2. Serve Static Files (Makes the bin file downloadable) ---
// This line makes the 'uploads' directory publicly accessible.
// A file uploaded as 'firmware.bin' will be available at:
// [Your Render URL]/uploads/firmware.bin
app.use('/uploads', express.static(UPLOAD_DIR));

// --- 3. Route for File Upload Form (GET /) ---
app.get('/', (req, res) => {
    // Simple, responsive HTML form for uploading the file
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
                h1 { color: #333; text-align: center; margin-bottom: 20px; }
                p { margin-bottom: 15px; line-height: 1.5; }
                input[type="file"] { padding: 10px; border: 1px solid #ddd; border-radius: 4px; display: block; margin-bottom: 20px; width: 100%; box-sizing: border-box; }
                button { background-color: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; transition: background-color 0.3s; }
                button:hover { background-color: #45a049; }
                .link-box { margin-top: 20px; padding: 15px; background-color: #e6f7ff; border: 1px solid #b3e0ff; border-radius: 4px; word-wrap: break-word; font-family: monospace; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>OTA File Host for ESP32</h1>
                <form action="/upload" method="post" enctype="multipart/form-data">
                    <input type="file" name="binFile" accept=".bin" required>
                    <button type="submit">Upload Firmware (.bin)</button>
                </form>
                <p style="text-align: center;">---</p>
                <p>After a successful upload, your device will access the file via the following pattern:</p>
                <div class="link-box">
                    <strong>[Your Render Live URL]/uploads/[filename.bin]</strong>
                    <p style="font-size: 0.8em; margin-top: 5px;">Example: <code>https://my-ota-host.onrender.com/uploads/smart_node_c6.bin</code></p>
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
    // The link below uses a relative path, but the device must use the full public URL.
    const fileLink = `/uploads/${filename}`; 

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
                h1 { color: #4CAF50; text-align: center; }
                .link-box { margin-top: 20px; padding: 15px; background-color: #e6f7ff; border: 1px solid #b3e0ff; border-radius: 4px; word-wrap: break-word; font-family: monospace; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ Upload Successful!</h1>
                <p>The file <strong>${filename}</strong> is now available.</p>
                <p>The **exact URL** for your device to download this firmware is:</p>
                <div class="link-box">
                    <strong>[Your Render Live URL]${fileLink}</strong>
                    <p style="font-size: 0.8em; margin-top: 5px;">Remember to replace <code>[Your Render Live URL]</code> with the actual public domain of your deployed service.</p>
                </div>
                <p style="margin-top: 20px; text-align: center;"><a href="/">← Upload another file</a></p>
            </div>
        </body>
        </html>
    `);
});


// --- 5. Start the Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
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
