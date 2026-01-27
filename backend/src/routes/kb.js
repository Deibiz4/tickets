const express = require('express');
const router = express.Router();
const kbController = require('../controllers/kb.controller');
const { auth, agentAuth } = require('../middleware/auth');

const upload = require('../middleware/upload');

// Public access (authenticated users)
router.get('/articles', auth(), kbController.getArticles);
router.get('/articles/:id', auth(), kbController.getArticle);
router.get('/articles/:id/attachments', auth(), kbController.getAttachments); // Get attachments
router.get('/categories', auth(), kbController.getCategories);

// Admin/Agent only
router.post('/articles', agentAuth, kbController.createArticle);
router.put('/articles/:id', agentAuth, kbController.updateArticle);
router.delete('/articles/:id', agentAuth, kbController.deleteArticle);

// Attachments (Admin/Agent)
router.post('/articles/:id/attachments', [agentAuth, upload.single('file')], kbController.uploadAttachment);
router.delete('/articles/:id/attachments/:attachmentId', agentAuth, kbController.deleteAttachment);

module.exports = router;
