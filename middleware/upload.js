// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // fs is CORRECTLY imported here, as it's needed for directory creation

// Configure disk storage for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads'); // This resolves to your_project_root/uploads
        if (!fs.existsSync(uploadDir)) {
            console.log(`Creating uploads directory: ${uploadDir}`);
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        console.log('Multer destination directory:', uploadDir);
        cb(null, uploadDir); // Files will be saved in the 'uploads' directory
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const fileName = file.fieldname + '-' + uniqueSuffix + fileExtension;
        console.log('Multer generated filename:', fileName);
        cb(null, fileName);
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed!'), false);
    }
};

// Initialize Multer upload middleware with the defined storage and filter
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5 MB file size limit
    }
});

module.exports = upload; // EXPORT the configured Multer instance