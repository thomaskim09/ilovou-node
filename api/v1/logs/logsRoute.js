const express = require('express');

const router = express.Router();

const logsController = require('./logsController');

router.post('/', logsController.log_to_file);

module.exports = router;