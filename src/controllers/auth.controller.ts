import { Request, Response, NextFunction } from 'express'
import { User } from '../models/User.model'
import { generateToken } from '../utils/jwt'
import { createError } from '../middlewares/errorHandler'
import { AuthRequest } from '../middlewares/auth.middleware'

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

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      role: role || 'customer',
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

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    })
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

