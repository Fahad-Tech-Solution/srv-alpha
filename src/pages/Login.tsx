import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoggingIn, user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const role = user.role || 'customer'
      navigate(`/${role}`)
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    login(
      { email, password },
      {
        onSuccess: (data: any) => {
          // Get user role and redirect
          const role = data?.user?.role || 'customer'
          navigate(`/${role}`)
        },
        onError: (error: any) => {
          console.error('Login failed:', error)
          setError(error?.response?.data?.message || 'Login failed. Please check your credentials.')
        },
      }
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-4xl">
        <div className={cn("flex flex-col gap-6")}>
          <Card className="overflow-hidden">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Welcome back</h1>
                    <p className="text-balance text-muted-foreground">
                      Login to your Local Van account
                    </p>
                  </div>
                  {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                      {error}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="ml-auto text-sm underline-offset-2 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? 'Logging in...' : 'Login'}
                  </Button>
                
                  <div className="text-center text-sm space-y-3">
                    {/* <div>
                      Don&apos;t have a customer account?{" "}
                      <Link to="/register" className="underline underline-offset-4">
                        Sign up
                      </Link>
                    </div> */}
                    <Button variant="secondary" className="w-full" asChild>
                      <Link to="/driver-application">
                        Are you a driver or interested to work with Local Van?
                      </Link>
                    </Button>
                  </div>
                </div>
              </form>
              <div className="relative hidden bg-muted md:block">
                <img
                  src="./driver.jpg"
                  alt="Fahad1"
                  className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
              </div>
            </CardContent>
          </Card>
          <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
            By clicking continue, you agree to our <Link to="https://local-van.com/driver-terms-and-conditions/"> Driver </Link> and <Link to="https://local-van.com/customer-terms-and-conditions/">Customer</Link> Terms of Service{" "}
            and <Link to="https://local-van.com/privacy-policy/">Privacy Policy</Link>.
          </div>
        </div>
      </div>
    </div>
  )
}
