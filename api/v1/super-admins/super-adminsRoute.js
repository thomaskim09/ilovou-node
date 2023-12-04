const express = require('express');

const router = express.Router();
const adminsController = require('../admins/adminsController');
const superAdminsController = require('./super-adminsController');
const tagsController = require('../tags/tagsController');
const addressesController = require('../tags/addressesController');
const vouchersController = require('../vouchers/vouchersController');
const passport = require('../utils/passport');

router.get('/admins/list', passport.authenticate('jwt'), adminsController.get_admins_list);

router.get('/admins/details', passport.authenticate('jwt'), adminsController.get_admins_details);

router.put('/admins/details', passport.authenticate('jwt'), adminsController.update_admins_details);

router.post('/admins/sign_up', passport.authenticate('jwt'), adminsController.sign_up);

router.post('/admins/sign_up_future', passport.authenticate('jwt'), adminsController.sign_up_future);

router.post('/admins/branch', passport.authenticate('jwt'), superAdminsController.get_admin_restaurant_list);

router.post('/admins/create_branch', passport.authenticate('jwt'), superAdminsController.create_branch);

router.post('/admins/unlink_branch', passport.authenticate('jwt'), superAdminsController.unlink_branch);

router.get('/vouchers/list', passport.authenticate('jwt'), superAdminsController.get_voucher_list);

router.put('/restaurants/status', passport.authenticate('jwt'), superAdminsController.update_res_vou_status);

router.get('/all_areas_places', passport.authenticate('jwt'), addressesController.get_all_areas_places);

router.get('/all_voucher_list', passport.authenticate('jwt'), vouchersController.get_all_voucher_list);

router.get('/tags', passport.authenticate('jwt'), tagsController.get_tag_id);

router.post('/tags', passport.authenticate('jwt'), tagsController.create_tag);

router.put('/tags/add', passport.authenticate('jwt'), tagsController.add_tags);

router.put('/tags/rename', passport.authenticate('jwt'), tagsController.rename_tags);

router.put('/tags/delete', passport.authenticate('jwt'), tagsController.delete_tags);

router.put('/address/add', passport.authenticate('jwt'), addressesController.add_address);

router.put('/address/rename', passport.authenticate('jwt'), addressesController.rename_address);

router.put('/address/delete', passport.authenticate('jwt'), addressesController.delete_address);

router.put('/rating', passport.authenticate('jwt'), superAdminsController.update_rating);

router.post('/rating', passport.authenticate('jwt'), superAdminsController.recalculate_rating);

router.get('/users/list', passport.authenticate('jwt'), superAdminsController.get_user_list);

router.put('/users/status', passport.authenticate('jwt'), superAdminsController.update_user_status);

router.put('/search', passport.authenticate('jwt'), superAdminsController.search_collection);

router.get('/mass_settlement', passport.authenticate('jwt'), superAdminsController.mass_settlement);

router.get('/admin_company', passport.authenticate('jwt'), superAdminsController.admin_company);

router.get('/feedback_list', passport.authenticate('jwt'), superAdminsController.feedback_list);

router.put('/feedback_list', passport.authenticate('jwt'), superAdminsController.update_feedback_status);

router.get('/tickets/list', passport.authenticate('jwt'), superAdminsController.get_tickets_list);

router.post('/push_notifications', passport.authenticate('jwt'), superAdminsController.push_notifications);

module.exports = router;