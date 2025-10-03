import express from 'express';
import FactoriesController from '../controllers/factories.controller';
import { authenticate } from '@/middleware/auth';
import { requireSystemAdmin } from '@/middleware/permission';

const router = express.Router();

// All factory routes require authentication
router.use(authenticate);

// Get all factories (admin only or user's accessible factories)
router.get('/', FactoriesController.getAllFactories);

// Get factory by ID
router.get('/:id', FactoriesController.getFactoryById);

// Get user's accessible factories
router.get('/user/my-factories', FactoriesController.getUserFactories);

// Get users assigned to a specific factory
router.get('/:factoryId/users', FactoriesController.getFactoryUsers);

// Create new factory (admin only)
router.post('/', requireSystemAdmin(), FactoriesController.createFactory);

// Update factory (admin only)
router.put('/:id', requireSystemAdmin(), FactoriesController.updateFactory);

// Delete factory (admin only)
router.delete('/:id', requireSystemAdmin(), FactoriesController.deleteFactory);

// Assign user to factory (admin only)
router.post('/:factoryId/users', requireSystemAdmin(), FactoriesController.assignUserToFactory);

// Remove user from factory (admin only)
router.delete('/:factoryId/users/:userId', requireSystemAdmin(), FactoriesController.removeUserFromFactory);

export default router;
