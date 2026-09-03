import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'customer' | 'driver'
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If role is required, check if user has the correct role
  if (requiredRole) {
    const userRole = user.role || 'customer'
    
    // If user doesn't have the required role, redirect them to their own dashboard
    if (userRole !== requiredRole) {
      // Redirect to their appropriate dashboard based on their actual role
      const redirectPath = `/${userRole}`
      return <Navigate to={redirectPath} replace />
    }
  }

  // User is authenticated and has the correct role (if required)
  return <>{children}</>
}
