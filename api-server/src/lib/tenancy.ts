import { Request, Response, NextFunction } from 'express';

export function requireOrg(req: Request, res: Response, next: NextFunction) {
  const orgId = (req.headers['x-org-id'] as string) || (req.query.orgId as string) || (req as any).orgId;
  if (!orgId) return res.status(401).json({ error: 'Missing org' });
  (req as any).orgId = orgId;
  next();
}
