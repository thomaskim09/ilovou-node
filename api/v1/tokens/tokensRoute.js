const express = require('express');

const router = express.Router();

const TokenController = require('./tokensController');

router.get('/', TokenController.get_access_token);

module.exports = router;