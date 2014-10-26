var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
    res.render('about', { title: 'iMerge' });
});

module.exports = router;
