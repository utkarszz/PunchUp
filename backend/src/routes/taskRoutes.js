const express = require('express');
const { createTask, getTasks } = require('../controllers/taskController');
const protect = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/', protect, createTask);
router.get('/', protect, getTasks);

module.exports = router;