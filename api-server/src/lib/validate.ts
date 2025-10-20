import { z } from 'zod';

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        type: 'about:blank',
        title: 'Validation Error',
        detail: parsed.error.message,
        status: 400
      });
    }
    req.body = parsed.data;
    next();
  };
}
