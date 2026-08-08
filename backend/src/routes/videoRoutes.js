const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload');
const { analyzeVideo, getHistory, searchPlate, healthCheck, getAnalysisDetail } = require('../controllers/videoController');

router.post('/analyze', upload.single('video'), analyzeVideo);
router.get('/history', getHistory);
router.get('/search', searchPlate);
router.get('/health', healthCheck);
router.get('/history/:id', getAnalysisDetail);

module.exports = router;
