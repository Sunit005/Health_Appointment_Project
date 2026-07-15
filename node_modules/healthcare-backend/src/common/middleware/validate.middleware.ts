import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Factory middleware that validates a specific section of the request
 * against the provided Zod schema.
 *
 * If validation fails a `ValidationError` is thrown which is caught by
 * the global error handler and returned as a structured 400 response.
 *
 * Unknown fields are stripped by the schema's `.strip()` semantics (default
 * in Zod) before the validated data is re-assigned to the request object.
 *
 * @param schema - The Zod schema to validate against.
 * @param target - Which part of the request to validate ('body', 'query', or 'params').
 * @returns An Express middleware function.
 *
 * @example
 * router.post('/register', validate(registerSchema), authController.register);
 */
export function validate(schema: ZodSchema, target: ValidateTarget = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      throw new ValidationError(result.error);
    }

    // Replace the raw input with the parsed (and stripped) data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
}
