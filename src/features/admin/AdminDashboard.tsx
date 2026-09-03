import { useState } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Truck, FileText, Loader2, Search } from 'lucide-react'
import { useAdminStats, useAdminUsers } from '@/hooks/useAdmin'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyWhole } from '@/utils/format'

const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminStats()
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const { data: searchResults } = useAdminUsers({
    search: searchQuery || undefined,
    limit: 5,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/admin/users?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const activeAssigned =
    stats?.bookings.activeAssigned ??
    (stats?.bookings.confirmed || 0) + (stats?.bookings.inProgress || 0)

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-muted-foreground">
              Manage users, drivers, and bookings from here.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Search</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
            {searchQuery && searchResults?.users && searchResults.users.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Quick Results:</p>
                {searchResults.users.slice(0, 5).map((user: any) => (
                  <Link
                    key={user._id}
                    to={`/admin/users?search=${encodeURIComponent(user.email)}`}
                    className="block p-2 border rounded hover:bg-muted/50 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground">{user.email}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.users.admins || 0} admins, {stats?.users.drivers || 0} drivers,{' '}
                    {stats?.users.customers || 0} customers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.users.drivers || 0}</div>
                  <p className="text-xs text-muted-foreground">Active drivers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bookings</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.bookings.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.bookings.pending || 0} pending, {activeAssigned} active assigned
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue (completed)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrencyWhole(stats?.revenue.total || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paid to date: {formatCurrencyWhole(stats?.revenue.totalSpent || 0)}
                  </p>
                  {(stats?.revenue.pipeline ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Pipeline (confirmed/in-progress): {formatCurrencyWhole(stats?.revenue.pipeline)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/admin/drivers">
                      <Truck className="mr-2 h-4 w-4" />
                      Manage Drivers
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/admin/bookings">
                      <FileText className="mr-2 h-4 w-4" />
                      Manage Bookings
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Booking Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="text-sm font-medium">{stats?.bookings.pending || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Offered</span>
                    <span className="text-sm font-medium">{stats?.bookings.offered || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Confirmed</span>
                    <span className="text-sm font-medium">{stats?.bookings.confirmed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">In Progress</span>
                    <span className="text-sm font-medium">{stats?.bookings.inProgress || 0}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-muted-foreground">Active assigned</span>
                    <span className="text-sm font-medium">{activeAssigned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="text-sm font-medium">{stats?.bookings.completed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Disputed</span>
                    <span className="text-sm font-medium text-destructive">
                      {stats?.bookings.disputed || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Users</span>
                    <span className="text-sm font-medium">{stats?.users.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Admins</span>
                    <span className="text-sm font-medium">{stats?.users.admins || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Drivers</span>
                    <span className="text-sm font-medium">{stats?.users.drivers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Customers</span>
                    <span className="text-sm font-medium">{stats?.users.customers || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminDashboard
