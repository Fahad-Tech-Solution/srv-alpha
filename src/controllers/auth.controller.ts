import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { User } from '../models/User.model'
import { generateToken } from '../utils/jwt'
import { AuthRequest } from '../middlewares/auth.middleware'

function hashFirstAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name, role } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' })
      return
    }

    // Only customers can self-register publicly
    const allowedRole = role === 'customer' ? 'customer' : 'customer'
    if (role && role !== 'customer') {
      res.status(400).json({
        message:
          'Driver applications must use the driver application form. Admin accounts can only be created by existing admins.',
      })
      return
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      role: allowedRole,
    })

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body

    // Find user and include password
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }

    // Check if user is active
    if (!user.isActive) {
      if (user.role === 'driver' && user.applicationStatus === 'pending') {
        res.status(401).json({
          message: 'Your driver application is under review. We will email you once a decision has been made.',
        })
        return
      }
      if (user.role === 'driver' && user.applicationStatus === 'rejected') {
        res.status(401).json({
          message:
            user.applicationReviewNote ||
            'Your driver application was not approved. Contact info@local-van.com if you have questions.',
        })
        return
      }
      res.status(401).json({ message: 'Account is deactivated' })
      return
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const user = await User.findById(req.user.userId)
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    const userResponse: any = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    }
    
    if (user.address) {
      userResponse.address = user.address
    }
    
    res.json(userResponse)
  } catch (error) {
    next(error)
  }
}

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In a stateless JWT setup, logout is handled client-side
    // You could implement token blacklisting here if needed
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}

// Update user profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { name, phone } = req.body

    const user = await User.findById(req.user.userId)
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    if (name !== undefined && name.trim() !== '') {
      user.name = name.trim()
    }
    if (phone !== undefined) {
      // Allow empty string to clear phone
      user.phone = phone === '' ? undefined : phone.trim()
    }

    await user.save()

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Change password
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters' })
      return
    }

    const user = await User.findById(req.user.userId).select('+password')
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword)
    if (!isPasswordValid) {
      res.status(400).json({ message: 'Current password is incorrect' })
      return
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      message: 'Password changed successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const verifyFirstAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = String(req.query.email || '')
      .trim()
      .toLowerCase()
    const token = String(req.query.token || '').trim()

    if (!email || !token) {
      res.status(400).json({ message: 'Email and token are required' })
      return
    }

    const user = await User.findOne({ email }).select('+firstAccessToken +firstAccessExpires')
    if (
      !user ||
      !user.firstAccessToken ||
      !user.firstAccessExpires ||
      user.firstAccessExpires.getTime() < Date.now() ||
      user.firstAccessToken !== hashFirstAccessToken(token)
    ) {
      res.status(400).json({ message: 'Invalid or expired invite link' })
      return
    }

    res.json({
      valid: true,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    next(error)
  }
}

export const completeFirstAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase()
    const token = String(req.body.token || '').trim()
    const password = String(req.body.password || '')

    if (!email || !token || !password) {
      res.status(400).json({ message: 'Email, token, and password are required' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' })
      return
    }

    const user = await User.findOne({ email }).select(
      '+password +firstAccessToken +firstAccessExpires'
    )
    if (
      !user ||
      !user.firstAccessToken ||
      !user.firstAccessExpires ||
      user.firstAccessExpires.getTime() < Date.now() ||
      user.firstAccessToken !== hashFirstAccessToken(token)
    ) {
      res.status(400).json({ message: 'Invalid or expired invite link' })
      return
    }

    user.password = password
    user.firstAccessToken = undefined
    user.firstAccessExpires = undefined
    await user.save()

    const authToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    res.json({
      message: 'Account setup complete',
      token: authToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
}

