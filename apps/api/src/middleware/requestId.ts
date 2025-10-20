import { createNamespace } from 'cls-hooked';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const requestNamespace = createNamespace('request');

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  
  requestNamespace.run(() => {
    requestNamespace.set('requestId', requestId);
    requestNamespace.set('userId', req.headers['x-user-id'] as string);
    requestNamespace.set('orgId', req.headers['x-org-id'] as string);
    
    res.set('x-request-id', requestId);
    next();
  });
};

export const getRequestId = (): string | undefined => {
  return requestNamespace.get('requestId');
};

export const getUserId = (): string | undefined => {
  return requestNamespace.get('userId');
};

export const getOrgId = (): string | undefined => {
  return requestNamespace.get('orgId');
};

