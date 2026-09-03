import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Briefcase, MapPin, Calendar, PoundSterling, CheckCircle, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { driverApi } from '@/api/driver'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getOfferForDriver } from '@/utils/driverOffers'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'

const AvailableJobsPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery('availableJobs', driverApi.getAvailableJobs, {
    refetchInterval: 30000,
  })

  const acceptMutation = useMutation(
    (id: string) => driverApi.acceptJobOffer(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('availableJobs')
        queryClient.invalidateQueries('availableJobsDashboard')
        queryClient.invalidateQueries('availableJobsInJobSheet')
        queryClient.invalidateQueries('driverJobs')
        queryClient.invalidateQueries('driverStats')
      },
    }
  )

  const rejectMutation = useMutation(
    (id: string) => driverApi.rejectJobOffer(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('availableJobs')
        queryClient.invalidateQueries('availableJobsDashboard')
        queryClient.invalidateQueries('availableJobsInJobSheet')
      },
    }
  )

  const handleAccept = async (id: string) => {
    if (confirm('Are you sure you want to accept this job offer?')) {
      await acceptMutation.mutateAsync(id)
    }
  }

  const handleReject = async (id: string) => {
    if (confirm('Are you sure you want to reject this job offer?')) {
      await rejectMutation.mutateAsync(id)
    }
  }

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Available Jobs</h2>
          <p className="text-muted-foreground">
            Jobs offered to you - accept or reject offers
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {data?.bookings && data.bookings.length > 0 ? (
              <div className="space-y-4">
                {data.bookings.map((booking: any) => {
                  const offer = getOfferForDriver(booking, user)
                  const offeredPrice =
                    offer?.offeredPrice ?? booking.finalPrice ?? booking.estimatedPrice

                  return (
                    <Card key={booking._id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <Briefcase className="h-5 w-5" />
                              {typeof booking.customer === 'object' ? booking.customer.name : 'Customer'}
                            </CardTitle>
                            <CardDescription>
                              {booking.orderCode
                                ? `Order #${booking.orderCode}`
                                : `Order #${booking._id}`}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-lg font-semibold">
                            <PoundSterling className="h-4 w-4 mr-1" />
                            {offeredPrice}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Route</p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.pickupCity} → {booking.deliveryCity}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Pickup Date</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(booking.pickupDate)} at {booking.pickupTime}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-medium">Service Type</p>
                              <p className="text-sm text-muted-foreground capitalize">{booking.serviceType}</p>
                            </div>

                            <div>
                              <p className="text-sm font-medium">Vehicle Type</p>
                              <p className="text-sm text-muted-foreground capitalize">{booking.vehicleType?.replace('-', ' ')}</p>
                            </div>

                            <div>
                              <p className="text-sm font-medium">Offered Pay</p>
                              <p className="text-sm font-semibold">{formatCurrency(offeredPrice)}</p>
                            </div>

                            {booking.offerExpiresAt && (
                              <div>
                                <p className="text-sm font-medium">Offer Expires</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateTime(booking.offerExpiresAt)}
                                </p>
                              </div>
                            )}
                          </div>

                          {booking.specialInstructions && (
                            <div>
                              <p className="text-sm font-medium">Additional Info</p>
                              <p className="text-sm text-muted-foreground">{booking.specialInstructions}</p>
                            </div>
                          )}

                          <div className="pt-4 border-t flex gap-2">
                            <Button
                              onClick={() => handleAccept(booking._id)}
                              disabled={acceptMutation.isLoading || rejectMutation.isLoading}
                              className="flex-1"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Accept ({formatCurrency(offeredPrice)})
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleReject(booking._id)}
                              disabled={acceptMutation.isLoading || rejectMutation.isLoading}
                              className="flex-1"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>

                          <div className="pt-2">
                            <Link to={`/driver/jobs/${booking._id}`}>
                              <Button variant="ghost" className="w-full">
                                View Full Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">No jobs available at the moment</p>
                  <p className="text-sm text-muted-foreground mt-2">Check back later for new job offers</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AvailableJobsPage
