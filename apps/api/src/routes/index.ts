import { Router } from 'express';
import customersRouter from './customers';

const router = Router();

// Mount routes
router.use('/customers', customersRouter);

export default router;
