import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { validateRequest } from '../middlewares/validation.js';
import { authenticateToken } from '../middlewares/auth.js';
import { createOrderSchema } from '../schemas/index.js';

const router = Router();

router.get('/', authenticateToken, orderController.getOrders);
router.post('/', authenticateToken, validateRequest(createOrderSchema), orderController.createOrder);
router.get('/history', authenticateToken, orderController.getOrderHistory);

export default router;
