import { Router } from 'express';
import * as orderController from '../controllers/pedidoController.js';
import { validarRequest } from '../middlewares/validation.js';
import { autenticarToken as autenticarToken } from '../middlewares/auth.js';
import { criarPedidoSchema } from '../schemas/index.js';

const router = Router();

router.get('/', autenticarToken, orderController.getOrders);
router.post('/', autenticarToken, validarRequest(criarPedidoSchema), orderController.createOrder);
router.get('/history', autenticarToken, orderController.getOrderHistory);

export default router;
