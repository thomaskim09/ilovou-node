const express = require('express');

const router = express.Router();
const treatsController = require('./treatsController');
const passport = require('../utils/passport');

router.get('/id', passport.authenticate('jwt'), treatsController.get_treats_id);

router.post('/', passport.authenticate('jwt'), treatsController.create_treats);

router.get('/', passport.authenticate('jwt'), treatsController.get_treats);

router.get('/details', passport.authenticate('jwt'), treatsController.get_treats_details);

module.exports = router;