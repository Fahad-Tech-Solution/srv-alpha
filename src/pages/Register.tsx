import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { register, isRegistering, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate(`/${user.role || 'customer'}`)
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password) {
      setError('Please fill in all required fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    register(
      { name, email, password, role: 'customer' },
      {
        onSuccess: (data: any) => {
          navigate(`/${data?.user?.role || 'customer'}`)
        },
        onError: (error: any) => {
          setError(error?.response?.data?.message || 'Registration failed. Please try again.')
        },
      }
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-4xl">
        <div className={cn('flex flex-col gap-6')}>
          <Card className="overflow-hidden">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Create a customer account</h1>
                    <p className="text-balance text-muted-foreground">
                      Sign up to book moves with Local Van
                    </p>
                  </div>
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isRegistering}>
                    {isRegistering ? 'Creating account...' : 'Create Account'}
                  </Button>
                  <div className="text-center text-sm space-y-3">
                    <div>
                      Already have an account?{' '}
                      <Link to="/login" className="underline underline-offset-4">Sign in</Link>
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/driver-application">Apply to drive with Local Van</Link>
                    </Button>
                  </div>
                </div>
              </form>
              <div className="relative hidden bg-muted md:block">
                <img src="./driver.jpg" alt="Local Van" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
