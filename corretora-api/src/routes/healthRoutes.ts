import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
