import express from 'express';
const router = express.Router();

router.get('/', function(req, res) {
    res.render('about', { title: 'iMerge' });
});

export default router;
