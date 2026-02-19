// import jwt from 'jsonwebtoken'
import jwt, { SignOptions } from 'jsonwebtoken'


const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Ensure TypeScript knows secret is always a string   us
const secret: string = JWT_SECRET

export interface TokenPayload {
  userId: string
  email: string
  role: string
}

export const generateToken = (payload: TokenPayload): string => {
  // return jwt.sign(payload, JWT_SECRET, {
  //   expiresIn: JWT_EXPIRES_IN,
  // })
const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] }
return jwt.sign(payload, secret, options)

}

export const verifyToken = (token: string): TokenPayload => {
  try {
    // return jwt.verify(token, JWT_SECRET) as TokenPayload
    return jwt.verify(token, secret) as TokenPayload

  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

