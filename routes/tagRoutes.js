const express = require('express');
const router = express.Router();
const {
    getTags,
    getTag,
    createTag,
    updateTag,
    deleteTag
} = require('../controllers/tagController');

router.route('/')
    .get(getTags)
    .post(createTag);

router.route('/:id')
    .get(getTag)
    .put(updateTag)
    .delete(deleteTag);

module.exports = router; 