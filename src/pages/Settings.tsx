import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Lock, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const SettingsPage = () => {
  const { user, updateProfile, changePassword, isUpdatingProfile, isChangingPassword } = useAuth()
  const role = (user?.role || 'customer') as 'admin' | 'customer' | 'driver'
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address: '',
  })

  // Initialize profile data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      })
    }
  }, [user])
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!profileData.name) {
      setProfileError('Name is required')
      return
    }

    updateProfile(
      { name: profileData.name, phone: profileData.phone, address: profileData.address },
      {
        onSuccess: () => {
          setProfileSuccess('Profile updated successfully!')
          setTimeout(() => setProfileSuccess(''), 3000)
        },
        onError: (error: any) => {
          setProfileError(error?.response?.data?.message || 'Failed to update profile')
        },
      }
    )
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    changePassword(
      {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      },
      {
        onSuccess: () => {
          setPasswordSuccess('Password changed successfully!')
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })
          setTimeout(() => setPasswordSuccess(''), 3000)
        },
        onError: (error: any) => {
          setPasswordError(error?.response?.data?.message || 'Failed to change password')
        },
      }
    )
  }

  return (
    <DashboardLayout role={role as 'admin' | 'customer' | 'driver'}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {profileError && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm rounded-md flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {profileSuccess}
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        type="text"
                        value={user?.role || ''}
                        disabled
                        className="bg-muted capitalize"
                      />
                      <p className="text-xs text-muted-foreground">
                        Role cannot be changed
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+44 7700 900123 or 07700 900123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      type="text"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      placeholder="Enter your address"
                    />
                  </div>
                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm rounded-md flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {passwordSuccess}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default SettingsPage

