const express = require('express');

const router = express.Router();
const menusController = require('./menusController');
const passport = require('../utils/passport');

// Admin access area
router.post('/settings', passport.authenticate('jwt'), menusController.create_menu);

router.get('/settings', passport.authenticate('jwt'), menusController.get_menu_settings);

router.put('/settings', passport.authenticate('jwt'), menusController.update_settings);

router.get('/remarks', passport.authenticate('jwt'), menusController.get_remarks);

router.post('/remarks', passport.authenticate('jwt'), menusController.add_remarks);

router.put('/remarks', passport.authenticate('jwt'), menusController.update_remarks);

router.delete('/remarks', passport.authenticate('jwt'), menusController.delete_remarks);

router.get('/categories', passport.authenticate('jwt'), menusController.get_category_list);

router.post('/categories', passport.authenticate('jwt'), menusController.create_category);

router.put('/categories', passport.authenticate('jwt'), menusController.update_category);

router.delete('/categories', passport.authenticate('jwt'), menusController.delete_category);

router.put('/categories/status', passport.authenticate('jwt'), menusController.update_category_status);

router.put('/categories/order', passport.authenticate('jwt'), menusController.update_category_order);

router.get('/categories/foods', passport.authenticate('jwt'), menusController.get_food_list);

router.post('/categories/foods', passport.authenticate('jwt'), menusController.create_food);

router.get('/foods', passport.authenticate('jwt'), menusController.get_food_details);

router.put('/foods', passport.authenticate('jwt'), menusController.update_food);

router.delete('/foods', passport.authenticate('jwt'), menusController.delete_food);

router.put('/foods/status', passport.authenticate('jwt'), menusController.update_food_status);

router.put('/foods/order', passport.authenticate('jwt'), menusController.update_food_order);

router.get('/categories_foods', passport.authenticate('jwt'), menusController.get_all_category_food_list);


// User access area
router.get('/restaurants', passport.authenticate('jwt'), menusController.get_menu_user);

router.get('/categories/users', passport.authenticate('jwt'), menusController.get_food_list_user);

router.get('/users', passport.authenticate('jwt'), menusController.get_food_search_list_user);

router.get('/foods/users', passport.authenticate('jwt'), menusController.get_food_details_user);


// Super admin access area
router.put('/link', passport.authenticate('jwt'), menusController.link_menu);

router.put('/unlink', passport.authenticate('jwt'), menusController.unlink_menu);

module.exports = router;