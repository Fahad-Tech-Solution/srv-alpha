<<<<<<< HEAD
import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  status?: string
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500
  const status = err.status || 'error'

  res.status(statusCode).json({
    status,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message)
  error.statusCode = statusCode
  error.status = statusCode >= 500 ? 'error' : 'fail'
  return error
}

=======
import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  status?: string
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500
  const status = err.status || 'error'

  res.status(statusCode).json({
    status,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message)
  error.statusCode = statusCode
  error.status = statusCode >= 500 ? 'error' : 'fail'
  return error
}

>>>>>>> d99250162e1829b35a0e58cb77f3deb4ebcf610e
