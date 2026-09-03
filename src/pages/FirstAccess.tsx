import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from 'react-query'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function FirstAccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const email = searchParams.get('email') || ''
  const token = searchParams.get('token') || ''

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [linkValid, setLinkValid] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function verify() {
      if (!email || !token) {
        setError('This invite link is incomplete. Please use the link from your email.')
        setChecking(false)
        return
      }

      try {
        const result = await authApi.verifyFirstAccess(email, token)
        if (!cancelled) {
          setName(result.name)
          setLinkValid(true)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Invalid or expired invite link')
          setLinkValid(false)
        }
      } finally {
        if (!cancelled) {
          setChecking(false)
        }
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [email, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const data = await authApi.completeFirstAccess({ email, token, password })
      localStorage.setItem('token', data.token)
      queryClient.setQueryData('currentUser', data.user)
      navigate(`/${data.user.role || 'customer'}`)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete account setup')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Complete your account</h1>
                <p className="text-balance text-muted-foreground">
                  {name
                    ? `Welcome ${name}. Set a password to access Local Van.`
                    : 'Set a password to access your Local Van account.'}
                </p>
              </div>

              {checking && (
                <p className="text-sm text-muted-foreground text-center">Checking invite link...</p>
              )}

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}

              {!checking && linkValid && (
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">New password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Set password and continue'}
                  </Button>
                </form>
              )}

              {!checking && !linkValid && (
                <p className="text-sm text-center">
                  <Link to="/login" className="underline underline-offset-2">
                    Back to login
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
