import { Link } from 'react-router-dom'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { useBookings } from '@/hooks/useBookings'
import { Truck, FileText, Plus, Calendar, MapPin, ArrowRight } from 'lucide-react'
import { Booking } from '@/api/bookings'
import { formatCurrency, formatDate } from '@/utils/format'

const CustomerDashboard = () => {
  const { data, isLoading } = useBookings({ limit: 5 })
  const bookings = data?.bookings || []
  const totalBookings = data?.pagination?.total || 0

  const recentBookings = bookings.slice(0, 3)

  return (
    <DashboardLayout role="customer">
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome Back!</h2>
          <p className="text-muted-foreground">
            Manage your bookings and book new moving services.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>View and manage your moving bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{totalBookings}</span>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/customer/bookings">View All</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Book New Service</CardTitle>
              <CardDescription>Schedule a new moving service</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link to="/customer/book">
                  <Plus className="mr-2 h-4 w-4" />
                  Book Now
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Your recent moving service bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Loading bookings...</p>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bookings yet. Book your first moving service!</p>
                <Button asChild className="mt-4">
                  <Link to="/customer/book">Book Now</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking: Booking) => (
                  <div
                    key={booking._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          Booking #{booking._id.slice(-6).toUpperCase()}
                        </span>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {booking.pickupCity} → {booking.deliveryCity}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(booking.pickupDate)}
                        </span>
                        <span className="font-medium">{formatCurrency(booking.estimatedPrice)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/customer/bookings/${booking._id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
                {totalBookings > 3 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/customer/bookings">View All Bookings</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default CustomerDashboard

