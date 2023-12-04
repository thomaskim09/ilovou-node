const express = require('express');

const router = express.Router();
const searchController = require('./searchesController');
const password = require('../utils/passport');

router.get('/search-list', password.authenticate('jwt'), searchController.get_search_list);

router.get('/nearby', password.authenticate('jwt'), searchController.get_nearby_search_result);

router.get('/query', password.authenticate('jwt'), searchController.get_search_result);

router.post('/query', password.authenticate('jwt'), searchController.get_search_result_batch);

router.post('/query/filter', password.authenticate('jwt'), searchController.get_search_result_filter);

module.exports = router;