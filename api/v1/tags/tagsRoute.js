const express = require('express');

const router = express.Router();
const tagsController = require('./tagsController');
const addressesController = require('./addressesController');
const passport = require('../utils/passport');

router.get('/all', passport.authenticate('jwt'), tagsController.get_all_types);

router.get('/common-tags', passport.authenticate('jwt'), tagsController.get_all_common_tags);

router.get('/address', passport.authenticate('jwt'), addressesController.get_all_address);

router.get('/address/cities', passport.authenticate('jwt'), addressesController.get_all_cities_location);

router.get('/address/postcodes-all-children', passport.authenticate('jwt'), addressesController.get_postcodes_all_children);

module.exports = router;