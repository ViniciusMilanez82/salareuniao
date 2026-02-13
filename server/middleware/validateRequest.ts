import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'

export function validateRequest(schema: z.ZodObject<Record<string, z.ZodTypeAny>>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params })
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.errors })
      }
      next(error)
    }
  }
}
