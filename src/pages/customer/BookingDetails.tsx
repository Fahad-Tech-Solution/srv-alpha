import { useParams, Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBooking, useCancelBooking, useAmendBooking } from '@/hooks/useBookings'
import { MapPin, Calendar, Truck, Phone, Mail, FileText, AlertCircle, Edit } from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle } from 'lucide-react'

const vehicleLabels = {
  'small-van': 'Small Van',
  'medium-van': 'Medium Van',
  'large-van': 'Large Van',
  truck: 'Truck',
}

const serviceTypeLabels = {
  local: 'Local',
  'long-distance': 'Long Distance',
  interstate: 'Interstate',
}

const BookingDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: booking, isLoading, error } = useBooking(id || '')
  const cancelBooking = useCancelBooking()
  const amendBooking = useAmendBooking()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [amendDialogOpen, setAmendDialogOpen] = useState(false)
  const [amendData, setAmendData] = useState({
    hours: '',
    men: '',
    vans: '',
    pickupDate: '',
    pickupTime: '',
  })
  const [amendError, setAmendError] = useState<string>('')
  const [amendSuccess, setAmendSuccess] = useState<string>('')

  // Initialize amend data when booking loads
  useEffect(() => {
    if (booking) {
      setAmendData({
        hours: booking.hours?.toString() || '',
        men: booking.men?.toString() || '',
        vans: booking.vans?.toString() || '1',
        pickupDate: booking.pickupDate ? new Date(booking.pickupDate).toISOString().split('T')[0] : '',
        pickupTime: booking.pickupTime || '',
      })
    }
  }, [booking])

  const handleCancel = async () => {
    if (!id) return
    try {
      await cancelBooking.mutateAsync(id)
      setCancelDialogOpen(false)
      navigate('/customer/bookings')
    } catch (error: any) {
      console.error('Failed to cancel booking:', error)
      // Error message will be shown in the dialog
      throw error
    }
  }

  const handleAmend = async () => {
    if (!id) return
    setAmendError('')
    setAmendSuccess('')
    
    try {
      const payload: any = {}
      if (amendData.hours) payload.hours = parseInt(amendData.hours)
      if (amendData.men) payload.men = parseInt(amendData.men)
      if (amendData.vans) payload.vans = parseInt(amendData.vans)
      if (amendData.pickupDate) payload.pickupDate = amendData.pickupDate
      if (amendData.pickupTime) payload.pickupTime = amendData.pickupTime

      const result = await amendBooking.mutateAsync({ id, data: payload })
      setAmendSuccess(result?.message || 'Booking amended successfully!')
      if (result?.newPrice !== undefined) {
        setAmendSuccess(prev => prev + ` New price: ${formatCurrency(result.newPrice)}`)
      }
      setAmendDialogOpen(false)
      setTimeout(() => setAmendSuccess(''), 5000)
    } catch (error: any) {
      setAmendError(error?.response?.data?.message || 'Failed to amend booking')
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout role="customer">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !booking) {
    return (
      <DashboardLayout role="customer">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive">Booking not found</p>
          <Button asChild className="mt-4">
            <Link to="/customer/bookings">Back to Bookings</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  // Check if cancellation is allowed (48 hours before pickup)
  const pickupDate = booking ? new Date(booking.pickupDate) : null
  const hoursUntilPickup = pickupDate
    ? (pickupDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)
    : null
  const canCancelWithin48Hours = hoursUntilPickup !== null && hoursUntilPickup < 48
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'
  const canAmend = booking && (booking.status === 'pending' || booking.status === 'confirmed')

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Booking #{booking._id.slice(-6).toUpperCase()}
            </h2>
            <p className="text-muted-foreground">
              View details and manage your booking
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/customer/bookings">Back to Bookings</Link>
            </Button>
            {canCancel && (
              <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" disabled={canCancelWithin48Hours}>
                    Cancel Booking
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Booking</DialogTitle>
                    <DialogDescription>
                      {canCancelWithin48Hours ? (
                        <span className="text-destructive">
                          Cannot cancel booking within 48 hours of the move date. Please contact support at info@local-van.com
                        </span>
                      ) : (
                        'Are you sure you want to cancel this booking? This action cannot be undone.'
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  {!canCancelWithin48Hours && (
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                        No, Keep Booking
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={cancelBooking.isLoading}
                      >
                        {cancelBooking.isLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
                      </Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
            )}
            {canCancelWithin48Hours && (
              <div className="text-sm text-muted-foreground">
                Cancellation not available within 48 hours of move date
              </div>
            )}
            {canAmend && (
              <Dialog open={amendDialogOpen} onOpenChange={setAmendDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Amend Booking
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Amend Booking</DialogTitle>
                    <DialogDescription>
                      Update hours, men, vans, or pickup date/time. Price will be recalculated.
                    </DialogDescription>
                  </DialogHeader>
                  {amendError && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{amendError}</AlertDescription>
                    </Alert>
                  )}
                  {amendSuccess && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Success</AlertTitle>
                      <AlertDescription>{amendSuccess}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-4 py-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hours">Hours</Label>
                      <Input
                        id="hours"
                        type="number"
                        min="1"
                        value={amendData.hours}
                        onChange={(e) => setAmendData({ ...amendData, hours: e.target.value })}
                        placeholder={booking.hours?.toString() || '2'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="men">Number of Men</Label>
                      <Input
                        id="men"
                        type="number"
                        min="1"
                        value={amendData.men}
                        onChange={(e) => setAmendData({ ...amendData, men: e.target.value })}
                        placeholder={booking.men?.toString() || '2'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vans">Number of Vans</Label>
                      <Input
                        id="vans"
                        type="number"
                        min="1"
                        value={amendData.vans}
                        onChange={(e) => setAmendData({ ...amendData, vans: e.target.value })}
                        placeholder={booking.vans?.toString() || '1'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pickupTime">Pickup Time</Label>
                      <Input
                        id="pickupTime"
                        type="text"
                        placeholder="e.g. 10:00 - 11:00 am"
                        value={amendData.pickupTime}
                        onChange={(e) => setAmendData({ ...amendData, pickupTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="pickupDate">Pickup Date</Label>
                      <Input
                        id="pickupDate"
                        type="date"
                        value={amendData.pickupDate}
                        onChange={(e) => setAmendData({ ...amendData, pickupDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAmendDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAmend}
                      disabled={amendBooking.isLoading}
                    >
                      {amendBooking.isLoading ? 'Updating...' : 'Update Booking'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-2">
                  <StatusBadge status={booking.status} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(booking.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pickup Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pickup Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{booking.pickupAddress}</p>
              <p className="text-muted-foreground">
                {booking.pickupCity}, {booking.pickupState} {booking.pickupZipCode}
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {formatDate(booking.pickupDate)} · {booking.pickupTime}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{booking.deliveryAddress}</p>
              <p className="text-muted-foreground">
                {booking.deliveryCity}, {booking.deliveryState} {booking.deliveryZipCode}
              </p>
            </CardContent>
          </Card>

          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Service Type</p>
                <p className="font-medium">{serviceTypeLabels[booking.serviceType]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehicle Type</p>
                <p className="font-medium">{vehicleLabels[booking.vehicleType]}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{booking.contactPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{booking.contactEmail}</span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Estimated Price</p>
                <p className="text-2xl font-bold">{formatCurrency(booking.estimatedPrice)}</p>
                {booking.finalPrice ? (
                  <>
                    <p className="text-sm text-muted-foreground mt-2">Final Price</p>
                    <p className="text-xl font-semibold">{formatCurrency(booking.finalPrice)}</p>
                  </>
                ) : null}
                {booking.additionalWorkPayment ? (
                  <div className="mt-3 rounded-md border bg-muted/40 p-3">
                    <p className="text-sm font-medium">
                      Additional: {formatCurrency(booking.additionalWorkPayment)}
                    </p>
                    {booking.additionalWorkDescription ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        {booking.additionalWorkDescription}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <Badge className="mt-2">{booking.paymentStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Items to Move
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {booking.items.map((item, index) => (
                <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">Qty: {item.quantity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Special Instructions */}
        {booking.specialInstructions && (
          <Card>
            <CardHeader>
              <CardTitle>Special Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{booking.specialInstructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Driver Information */}
        {booking.driver && (
          <Card>
            <CardHeader>
              <CardTitle>Assigned Driver</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{booking.driver.name}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {booking.driver.email}
                  </span>
                  {booking.driver.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {booking.driver.phone}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

export default BookingDetails

