import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, User } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { driverApi } from '@/api/driver'
import { authApi } from '@/api/auth'

const ProfilePage = () => {
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useQuery('currentUser', authApi.getCurrentUser)
  const [formData, setFormData] = useState({
    username: '',
    businessName: '',
    address: '',
    name: '',
    phone: '',
  })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        businessName: user.businessName || '',
        address: user.address || '',
        name: user.name || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const updateProfileMutation = useMutation(
    (data: typeof formData) => driverApi.updateProfile(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('currentUser')
        setIsEditing(false)
      },
    }
  )

  const handleSave = async () => {
    await updateProfileMutation.mutateAsync(formData)
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        username: user.username || '',
        businessName: user.businessName || '',
        address: user.address || '',
        name: user.name || '',
        phone: user.phone || '',
      })
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <DashboardLayout role="driver">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Profile Information</h2>
            <p className="text-muted-foreground">
              Manage your personal and business information
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal & Business Details
            </CardTitle>
            <CardDescription>
              Update your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="Choose a username (optional)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Username will be visible to other users
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+44 7xxx xxxxxx"
                  />
                </div>

                <div>
                  <Label htmlFor="businessName">Business Name (if applicable)</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Your full address"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isLoading || !formData.name}
                  >
                    {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="mt-1 font-medium">{formData.name || <span className="text-muted-foreground italic">Not provided</span>}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="mt-1 font-medium">
                      {formData.username ? `@${formData.username}` : <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Phone Number</Label>
                    <p className="mt-1 font-medium">{formData.phone || <span className="text-muted-foreground italic">Not provided</span>}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="mt-1 font-medium">{user?.email}</p>
                  </div>

                  {formData.businessName && (
                    <div>
                      <Label className="text-muted-foreground">Business Name</Label>
                      <p className="mt-1 font-medium">{formData.businessName}</p>
                    </div>
                  )}

                  {formData.address && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="mt-1 whitespace-pre-line">{formData.address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default ProfilePage
