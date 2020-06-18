const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('./middleware').ensureAuthenticated;

// Get Homepage
router.get('/', ensureAuthenticated, (req, res) => {
    res.render('index');
});

module.exports = router;
