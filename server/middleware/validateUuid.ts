import { Request, Response, NextFunction } from 'express'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUUID(value: string): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

/** Middleware para router.param('id', ...) - retorna 400 se o valor não for UUID válido. */
export function validateUuidParam(_req: Request, res: Response, next: NextFunction, value: string): void {
  if (!isValidUUID(value)) {
    res.status(400).json({ error: 'ID inválido' })
    return
  }
  next()
}
