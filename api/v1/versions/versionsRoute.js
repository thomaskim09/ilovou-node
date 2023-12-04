const express = require('express');

const router = express.Router();
const versionController = require('./versionsController');
const passport = require('../utils/passport');

router.get('/', passport.authenticate('jwt'), versionController.get_app_version);

router.get('/details', passport.authenticate('jwt'), versionController.get_app_version_details);

router.post('/', passport.authenticate('jwt'), versionController.create_app_version);

router.put('/', passport.authenticate('jwt'), versionController.update_app_version);

router.get('/check', passport.authenticate('jwt'), versionController.check_app_version);

module.exports = router;