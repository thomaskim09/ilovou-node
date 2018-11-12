const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//For File Uploads
const multer = require('multer')
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    // reject a file
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
});


//POST /uploads/restaurants
router.post('/restaurant', upload.single('img'), (req, res, next) => {
    console.log(req.file);
    img = req.file.path
    if (err instanceof multer.MulterError) {
        console.log("multer error")
            // A Multer error occurred when uploading.
    } else if (err) {
        console.log('Hit err')
            // An unknown error occurred when uploading.
        res.status(404).json({ err });
    } else {
        res.status(200).json({
            "message": "Image uploaded successfully",
            "file": req.file
        });
    }
    // Everything went fine.
});

module.exports = router;