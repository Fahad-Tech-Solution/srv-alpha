import { Link } from 'react-router-dom'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { useBookings } from '@/hooks/useBookings'
import { FileText, Calendar, MapPin, Truck } from 'lucide-react'
import { Booking } from '@/api/bookings'
import { formatCurrency, formatDate } from '@/utils/format'

const vehicleLabels = {
  'small-van': 'Small Van',
  'medium-van': 'Medium Van',
  'large-van': 'Large Van',
  'truck': 'Truck',
}

const MyBookings = () => {
  const { data, isLoading, error } = useBookings()

  if (isLoading) {
    return (
      <DashboardLayout role="customer">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout role="customer">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading bookings</p>
        </div>
      </DashboardLayout>
    )
  }

  const bookings = data?.bookings || []

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Bookings</h2>
            <p className="text-muted-foreground">
              View and manage your moving service bookings
            </p>
          </div>
          <Button asChild>
            <Link to="/customer/book">New Booking</Link>
          </Button>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-4">
                Book your first moving service to get started
              </p>
              <Button asChild>
                <Link to="/customer/book">Book Now</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking: Booking) => (
              <Card key={booking._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Booking #{booking._id.slice(-6).toUpperCase()}
                        <StatusBadge status={booking.status} />
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Created on {formatDate(booking.createdAt)}
                      </CardDescription>
                    </div>
                    <Button variant="outline" asChild>
                      <Link to={`/customer/bookings/${booking._id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium">Pickup</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.pickupCity}, {booking.pickupState}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium">Delivery</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.deliveryCity}, {booking.deliveryState}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium">Pickup Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(booking.pickupDate)} · {booking.pickupTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium">Vehicle</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicleLabels[booking.vehicleType]}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Price</p>
                        <p className="text-lg font-semibold">{formatCurrency(booking.estimatedPrice)}</p>
                      </div>
                      {booking.finalPrice ? (
                        <div>
                          <p className="text-sm text-muted-foreground">Final Price</p>
                          <p className="text-lg font-semibold">{formatCurrency(booking.finalPrice)}</p>
                        </div>
                      ) : null}
                    </div>
                    {booking.additionalWorkPayment ? (
                      <div className="mt-3 text-sm">
                        <p className="font-medium">
                          Additional: {formatCurrency(booking.additionalWorkPayment)}
                        </p>
                        {booking.additionalWorkDescription ? (
                          <p className="text-muted-foreground">{booking.additionalWorkDescription}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default MyBookings

