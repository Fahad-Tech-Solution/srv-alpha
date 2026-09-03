import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Truck,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  Briefcase,
  MapPin,
  Calendar,
  PoundSterling,
  XCircle,
} from 'lucide-react'
import { useDriverStats, useDriverJobs } from '@/hooks/useDriver'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { driverApi } from '@/api/driver'
import { useAuth } from '@/hooks/useAuth'
import { getOfferForDriver } from '@/utils/driverOffers'
import { formatCurrency, formatCurrencyWhole, formatDate } from '@/utils/format'

const DriverDashboard = () => {
  const { user } = useAuth()
  const { data: stats, isLoading } = useDriverStats()
  const { data: completedJobsData, isLoading: isCompletedLoading } = useDriverJobs({
    status: 'completed',
    page: 1,
    limit: 5,
  })

  const queryClient = useQueryClient()

  const { data: availableJobsData, isLoading: isAvailableLoading } = useQuery(
    'availableJobsDashboard',
    driverApi.getAvailableJobs,
    {
      refetchInterval: 30000,
    }
  )

  const acceptMutation = useMutation(
    (id: string) => driverApi.acceptJobOffer(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('availableJobsDashboard')
        queryClient.invalidateQueries('driverJobs')
        queryClient.invalidateQueries('driverStats')
      },
    }
  )

  const rejectMutation = useMutation(
    (id: string) => driverApi.rejectJobOffer(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('availableJobsDashboard')
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
          <h2 className="text-3xl font-bold tracking-tight">Driver Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your jobs and vehicle information.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-sky-100 bg-sky-50/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Job Offers</CardTitle>
                  <Briefcase className="h-4 w-4 text-sky-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-sky-800">
                    {stats?.offeredJobs ?? availableJobsData?.bookings?.length ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Awaiting your response</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <Clock className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
                  <p className="text-xs text-muted-foreground">Confirmed / in progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.completedJobs || 0}</div>
                  <p className="text-xs text-muted-foreground">Total completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <PoundSterling className="h-4 w-4 text-emerald-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrencyWhole(stats?.totalEarnings || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">From completed jobs</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/driver/jobs">
                      <FileText className="mr-2 h-4 w-4" />
                      View My Jobs
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/driver/available-jobs">
                      <Briefcase className="mr-2 h-4 w-4" />
                      Available Jobs
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/driver/jobs">
                      <FileText className="mr-2 h-4 w-4" />
                      Job Sheet
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/driver/vehicle">
                      <Truck className="mr-2 h-4 w-4" />
                      Manage Vehicle Info
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Job Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-sky-800">Job Offers</span>
                    <span className="text-sm font-semibold rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-sky-800">
                      {stats?.offeredJobs ?? availableJobsData?.bookings?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Pending</span>
                    <span className="text-sm font-semibold rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-slate-700">
                      {stats?.pendingJobs || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-900">Active</span>
                    <span className="text-sm font-semibold rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-amber-900">
                      {stats?.activeJobs || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-800">Completed</span>
                    <span className="text-sm font-semibold rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-emerald-800">
                      {stats?.completedJobs || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>New Job Offers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isAvailableLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableJobsData?.bookings && availableJobsData.bookings.length > 0 ? (
                    <>
                      {availableJobsData.bookings.slice(0, 5).map((booking: any) => {
                        const offer = getOfferForDriver(booking, user)
                        const offeredPrice =
                          offer?.offeredPrice ?? booking.finalPrice ?? booking.estimatedPrice
                        return (
                          <div
                            key={booking._id}
                            className="p-3 border rounded-md flex flex-col gap-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm">
                                <div className="font-medium">
                                  {typeof booking.customer === 'object'
                                    ? booking.customer.name
                                    : 'Customer'}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span>
                                    {booking.pickupCity} → {booking.deliveryCity}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {formatDate(booking.pickupDate)} at{' '}
                                    {booking.pickupTime}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs font-semibold">
                                <PoundSterling className="h-3 w-3 mr-1" />
                                {offeredPrice}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleAccept(booking._id)}
                                disabled={acceptMutation.isLoading || rejectMutation.isLoading}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Accept ({formatCurrency(offeredPrice)})
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleReject(booking._id)}
                                disabled={acceptMutation.isLoading || rejectMutation.isLoading}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Reject
                              </Button>
                            </div>
                            <Button asChild size="sm" variant="ghost" className="w-full mt-1">
                              <Link to="/driver/available-jobs">
                                View in Available Jobs
                              </Link>
                            </Button>
                          </div>
                        )
                      })}
                      {availableJobsData.bookings.length > 5 && (
                        <Button asChild size="sm" variant="outline" className="w-full mt-2">
                          <Link to="/driver/available-jobs">View all job offers</Link>
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No new job offers right now.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Earnings Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Total earnings</p>
                      <p className="text-xs text-muted-foreground">Completed jobs</p>
                    </div>
                    <p className="text-lg font-bold">
                      {formatCurrencyWhole(stats?.totalEarnings || 0)}
                    </p>
                  </div>
                  {stats?.recentEarnings && stats.recentEarnings.length > 0 ? (
                    stats.recentEarnings.slice(0, 5).map((earning) => (
                      <Link key={earning._id} to={`/driver/jobs/${earning._id}`}>
                        <div className="p-3 border rounded-md hover:bg-muted/50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium">
                              {earning.orderCode || earning._id.slice(-6)}
                            </div>
                            <div className="text-sm font-semibold text-emerald-700">
                              {formatCurrencyWhole(earning.amount || 0)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {earning.pickupCity} → {earning.deliveryCity}
                            </span>
                          </div>
                          {earning.completedAt && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(earning.completedAt)}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Complete a job to see earnings here.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recently Completed Jobs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isCompletedLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : completedJobsData?.bookings && completedJobsData.bookings.length > 0 ? (
                    <>
                      {completedJobsData.bookings.slice(0, 5).map((booking: any) => (
                        <Link key={booking._id} to={`/driver/jobs/${booking._id}`}>
                          <div className="p-3 border rounded-md hover:bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium">
                                {typeof booking.customer === 'object'
                                  ? booking.customer.name
                                  : 'Customer'}
                              </div>
                              <StatusBadge status="completed" className="text-xs" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {booking.pickupCity} → {booking.deliveryCity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {booking.completedAt
                                  ? formatDate(booking.completedAt)
                                  : formatDate(booking.pickupDate)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {completedJobsData.bookings.length > 5 && (
                        <Button asChild size="sm" variant="outline" className="w-full mt-2">
                          <Link to="/driver/jobs?status=completed">View all completed jobs</Link>
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You have not completed any jobs yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DriverDashboard

