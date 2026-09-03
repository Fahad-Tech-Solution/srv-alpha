import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import {
  FileText,
  Loader2,
  MapPin,
  Calendar,
  Briefcase,
  PoundSterling,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useDriverJobs } from '@/hooks/useDriver'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { driverApi } from '@/api/driver'
import { useAuth } from '@/hooks/useAuth'
import { getOfferForDriver } from '@/utils/driverOffers'
import { formatCurrency, formatDate } from '@/utils/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const VALID_STATUS_FILTERS = [
  'all',
  'pending',
  'confirmed',
  'in-progress',
  'completed',
  'disputed',
] as const

const DriverJobsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlStatus = searchParams.get('status')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    urlStatus && VALID_STATUS_FILTERS.includes(urlStatus as (typeof VALID_STATUS_FILTERS)[number])
      ? urlStatus
      : 'all'
  )
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data, isLoading } = useDriverJobs({
    page,
    limit: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  useEffect(() => {
    const nextStatus =
      urlStatus && VALID_STATUS_FILTERS.includes(urlStatus as (typeof VALID_STATUS_FILTERS)[number])
        ? urlStatus
        : 'all'
    if (nextStatus !== statusFilter) {
      setStatusFilter(nextStatus)
      setPage(1)
    }
  }, [urlStatus, statusFilter])

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
    const next = new URLSearchParams(searchParams)
    if (value === 'all') {
      next.delete('status')
    } else {
      next.set('status', value)
    }
    setSearchParams(next, { replace: true })
  }

  const { data: confirmedJobsData, isLoading: isConfirmedLoading } = useDriverJobs({
    status: 'confirmed',
    page: 1,
    limit: 20,
  })

  const { data: inProgressJobsData, isLoading: isInProgressLoading } = useDriverJobs({
    status: 'in-progress',
    page: 1,
    limit: 20,
  })

  const isUpcomingLoading = isConfirmedLoading || isInProgressLoading

  const { data: availableJobsData, isLoading: isAvailableLoading } = useQuery(
    'availableJobsInJobSheet',
    driverApi.getAvailableJobs,
    { refetchInterval: 30000 }
  )

  const acceptMutation = useMutation((id: string) => driverApi.acceptJobOffer(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('availableJobsInJobSheet')
      queryClient.invalidateQueries('availableJobs')
      queryClient.invalidateQueries('availableJobsDashboard')
      queryClient.invalidateQueries('driverJobs')
      queryClient.invalidateQueries('driverStats')
    },
  })

  const rejectMutation = useMutation((id: string) => driverApi.rejectJobOffer(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('availableJobsInJobSheet')
      queryClient.invalidateQueries('availableJobs')
      queryClient.invalidateQueries('availableJobsDashboard')
    },
  })

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

  const upcomingJobs = useMemo(() => {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    const bookings = [
      ...(confirmedJobsData?.bookings || []),
      ...(inProgressJobsData?.bookings || []),
    ]

    return bookings
      .filter((booking: any) => {
        if (booking.status === 'in-progress') return true
        return (
          booking.status === 'confirmed' &&
          new Date(booking.pickupDate).getTime() >= todayStart
        )
      })
      .sort((a: any, b: any) => {
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1
        if (b.status === 'in-progress' && a.status !== 'in-progress') return 1
        return new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime()
      })
      .slice(0, 5)
  }, [confirmedJobsData?.bookings, inProgressJobsData?.bookings])

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Jobs</h2>
          <p className="text-muted-foreground">View and manage your assigned jobs</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Offers Awaiting Response</CardTitle>
            <CardDescription>
              Accept or reject jobs offered to you directly from your job sheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAvailableLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableJobsData?.bookings && availableJobsData.bookings.length > 0 ? (
              <div className="space-y-3">
                {availableJobsData.bookings.slice(0, 5).map((booking: any) => {
                  const offer = getOfferForDriver(booking, user)
                  const offeredPrice =
                    offer?.offeredPrice ?? booking.finalPrice ?? booking.estimatedPrice
                  return (
                    <div key={booking._id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <h3 className="font-medium">
                              {typeof booking.customer === 'object'
                                ? booking.customer.name
                                : 'Customer'}
                            </h3>
                            {booking.orderCode && (
                              <Badge variant="outline">#{booking.orderCode}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {booking.pickupCity} → {booking.deliveryCity}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(booking.pickupDate)} at{' '}
                              {booking.pickupTime}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-base font-semibold">
                          <PoundSterling className="h-4 w-4 mr-1" />
                          {offeredPrice}
                        </Badge>
                      </div>
                      <div className="mt-4 flex gap-2">
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
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No pending offers right now.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Jobs</CardTitle>
            <CardDescription>Your active and upcoming jobs by pickup date</CardDescription>
          </CardHeader>
          <CardContent>
            {isUpcomingLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingJobs.length > 0 ? (
              <div className="space-y-3">
                {upcomingJobs.map((booking: any) => (
                  <Link key={booking._id} to={`/driver/jobs/${booking._id}`}>
                    <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {typeof booking.customer === 'object'
                              ? booking.customer.name
                              : 'Unknown Customer'}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {booking.pickupCity} → {booking.deliveryCity}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(booking.pickupDate)} at{' '}
                              {booking.pickupTime}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No upcoming jobs yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Jobs</CardTitle>
                <CardDescription>Filter by status</CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="offered">Offered</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {data?.bookings && data.bookings.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {data.bookings.map((booking: any) => (
                        <Link key={booking._id} to={`/driver/jobs/${booking._id}`}>
                          <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-medium">
                                    {typeof booking.customer === 'object' ? booking.customer.name : 'Unknown Customer'}
                                  </h3>
                                  <StatusBadge status={booking.status} />
                                  {booking.orderCode && (
                                    <Badge variant="outline">#{booking.orderCode}</Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>
                                      {booking.pickupCity} → {booking.deliveryCity}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(booking.pickupDate)}</span>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                  <span className="font-medium">
                                    {formatCurrency(booking.finalPrice || booking.estimatedPrice)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {data?.pagination && data.pagination.pages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {data.pagination.page} of {data.pagination.pages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                            disabled={page === data.pagination.pages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No jobs found. Check back later!</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default DriverJobsPage

