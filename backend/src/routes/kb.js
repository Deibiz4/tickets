const express = require('express');
const router = express.Router();
const kbController = require('../controllers/kb.controller');
const { auth, agentAuth } = require('../middleware/auth');

// Public access (authenticated users)
router.get('/articles', auth(), kbController.getArticles);
router.get('/articles/:id', auth(), kbController.getArticle);
router.get('/categories', auth(), kbController.getCategories);

// Admin/Agent only
router.post('/articles', agentAuth, kbController.createArticle);
router.put('/articles/:id', agentAuth, kbController.updateArticle);
router.delete('/articles/:id', agentAuth, kbController.deleteArticle);

module.exports = router;
