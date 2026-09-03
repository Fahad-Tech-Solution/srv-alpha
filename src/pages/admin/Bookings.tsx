import { useState } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { Textarea } from '@/components/ui/textarea'
import { Search, Loader2, Edit, Truck, Mail, AlertCircle, PoundSterling, MessageSquare, Users, CheckCircle2, XCircle, Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import { 
  useAdminBookings, 
  useUpdateBookingAdmin,
  useCreateBookingAdmin,
  useAssignDriver, 
  useAdminDrivers, 
  useHandleDispute, 
  useSendEmailReminder,
  useOfferJobToDrivers,
  useAddBookingNote,
  useRecordAdditionalWorkPayment,
} from '@/hooks/useAdmin'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const emptyManualOrder = () => ({
  customer: { name: '', email: '', phone: '' },
  pickupAddress: '',
  pickupCity: '',
  pickupZipCode: '',
  pickupDate: '',
  pickupTime: '',
  deliveryAddress: '',
  deliveryCity: '',
  deliveryZipCode: '',
  serviceType: 'local' as 'local' | 'long-distance' | 'interstate',
  vehicleType: 'small-van' as 'small-van' | 'medium-van' | 'large-van' | 'truck',
  pickupAccess: 'ground' as 'lift' | 'stairs' | 'ground',
  pickupStairsCount: 1,
  deliveryAccess: 'ground' as 'lift' | 'stairs' | 'ground',
  deliveryStairsCount: 1,
  men: 2,
  price: 0,
  paymentStatus: 'paid' as 'paid' | 'pending',
  paymentMethod: 'bank-transfer' as 'bank-transfer' | 'cash' | 'card' | 'other',
  paymentReference: '',
  specialInstructions: '',
  sendConfirmationEmail: true,
})

const BookingsPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingBooking, setEditingBooking] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false)
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [isAdditionalWorkDialogOpen, setIsAdditionalWorkDialogOpen] = useState(false)
  const [bookingToAssign, setBookingToAssign] = useState<string | null>(null)
  const [bookingForOffer, setBookingForOffer] = useState<any>(null)
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [offerPercentage, setOfferPercentage] = useState<number>(50)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<'call' | 'issue' | 'general'>('general')
  const [additionalWorkAmount, setAdditionalWorkAmount] = useState<number>(0)
  const [additionalWorkDescription, setAdditionalWorkDescription] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const { data, isLoading, refetch } = useAdminBookings({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const { data: driversData } = useAdminDrivers({ limit: 100 })
  const updateBookingMutation = useUpdateBookingAdmin()
  const createBookingMutation = useCreateBookingAdmin()
  const assignDriverMutation = useAssignDriver()
  const handleDisputeMutation = useHandleDispute()
  const sendReminderMutation = useSendEmailReminder()
  const offerJobMutation = useOfferJobToDrivers()
  const addNoteMutation = useAddBookingNote()
  const recordPaymentMutation = useRecordAdditionalWorkPayment()
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false)
  const [bookingToDispute, setBookingToDispute] = useState<any>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newManualOrder, setNewManualOrder] = useState(emptyManualOrder)

  const handleEdit = (booking: any) => {
    setEditingBooking({ ...booking })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingBooking) return
    try {
      await updateBookingMutation.mutateAsync({
        id: editingBooking._id,
        data: {
          status: editingBooking.status,
          finalPrice: editingBooking.finalPrice,
          pickupAddress: editingBooking.pickupAddress,
          pickupCity: editingBooking.pickupCity,
          pickupZipCode: editingBooking.pickupZipCode,
          pickupDate: editingBooking.pickupDate,
          pickupTime: editingBooking.pickupTime,
          deliveryAddress: editingBooking.deliveryAddress,
          deliveryCity: editingBooking.deliveryCity,
          deliveryZipCode: editingBooking.deliveryZipCode,
          contactEmail: editingBooking.contactEmail,
          contactPhone: editingBooking.contactPhone,
        },
      })
      setIsEditDialogOpen(false)
      setEditingBooking(null)
      setSuccessMessage('Booking updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to update booking')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleOpenCreateDialog = () => {
    setNewManualOrder(emptyManualOrder())
    setIsCreateDialogOpen(true)
  }

  const isManualOrderValid = () => {
    const order = newManualOrder
    const hasCustomer =
      order.customer.name.trim() &&
      order.customer.email.trim() &&
      order.customer.phone.trim()
    const hasAddresses =
      order.pickupAddress.trim() &&
      order.pickupCity.trim() &&
      order.pickupZipCode.trim() &&
      order.deliveryAddress.trim() &&
      order.deliveryCity.trim() &&
      order.deliveryZipCode.trim() &&
      order.pickupDate &&
      order.pickupTime.trim()
    const hasPayment =
      order.paymentStatus === 'pending' ||
      (order.paymentStatus === 'paid' && order.paymentMethod)
    const hasAccess =
      (order.pickupAccess !== 'stairs' || order.pickupStairsCount >= 1) &&
      (order.deliveryAccess !== 'stairs' || order.deliveryStairsCount >= 1)
    return hasCustomer && hasAddresses && order.price > 0 && hasPayment && order.men >= 1 && hasAccess
  }

  const handleCreateManualOrder = async () => {
    if (!isManualOrderValid()) return
    try {
      const result = await createBookingMutation.mutateAsync({
        customer: {
          name: newManualOrder.customer.name.trim(),
          email: newManualOrder.customer.email.trim(),
          phone: newManualOrder.customer.phone.trim(),
        },
        pickupAddress: newManualOrder.pickupAddress.trim(),
        pickupCity: newManualOrder.pickupCity.trim(),
        pickupZipCode: newManualOrder.pickupZipCode.trim(),
        pickupDate: new Date(newManualOrder.pickupDate).toISOString(),
        pickupTime: newManualOrder.pickupTime,
        deliveryAddress: newManualOrder.deliveryAddress.trim(),
        deliveryCity: newManualOrder.deliveryCity.trim(),
        deliveryZipCode: newManualOrder.deliveryZipCode.trim(),
        serviceType: newManualOrder.serviceType,
        vehicleType: newManualOrder.vehicleType,
        price: newManualOrder.price,
        paymentStatus: newManualOrder.paymentStatus,
        paymentMethod:
          newManualOrder.paymentStatus === 'paid' ? newManualOrder.paymentMethod : undefined,
        paymentReference: newManualOrder.paymentReference.trim() || undefined,
        specialInstructions: newManualOrder.specialInstructions.trim() || undefined,
        sendConfirmationEmail: newManualOrder.sendConfirmationEmail,
        pickupAccess: newManualOrder.pickupAccess,
        pickupStairsCount:
          newManualOrder.pickupAccess === 'stairs' ? newManualOrder.pickupStairsCount : undefined,
        deliveryAccess: newManualOrder.deliveryAccess,
        deliveryStairsCount:
          newManualOrder.deliveryAccess === 'stairs' ? newManualOrder.deliveryStairsCount : undefined,
        men: newManualOrder.men,
      })

      setIsCreateDialogOpen(false)
      setNewManualOrder(emptyManualOrder())

      const emailParts: string[] = []
      if (result.emails.confirmation === 'sent') {
        emailParts.push('confirmation email sent')
      } else if (result.emails.confirmation === 'failed') {
        emailParts.push('confirmation email failed')
      }
      if (result.emails.onboardingInvite === 'sent') {
        emailParts.push('account setup invite sent')
      } else if (result.emails.onboardingInvite === 'failed') {
        emailParts.push('account setup invite failed')
      }

      const emailNote = emailParts.length > 0 ? ` (${emailParts.join(', ')})` : ''
      setSuccessMessage(`Manual order ${result.booking.orderCode || 'created'} added successfully${emailNote}`)
      setTimeout(() => setSuccessMessage(''), 5000)
      refetch()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to create manual order')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleAssignDriver = async (driverId: string) => {
    if (!bookingToAssign) return
    try {
      await assignDriverMutation.mutateAsync({
        bookingId: bookingToAssign,
        driverId,
      })
      setIsAssignDialogOpen(false)
      setBookingToAssign(null)
      setSuccessMessage('Driver assigned successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to assign driver')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleOfferJob = async () => {
    if (!bookingForOffer || selectedDrivers.length === 0) return
    try {
      await offerJobMutation.mutateAsync({
        id: bookingForOffer._id,
        driverIds: selectedDrivers,
        percentage: offerPercentage,
      })
      setIsOfferDialogOpen(false)
      setBookingForOffer(null)
      setSelectedDrivers([])
      setOfferPercentage(50)
      setSuccessMessage('Job offers sent to drivers successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      refetch()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to send job offers')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleAddNote = async () => {
    if (!bookingForOffer || !noteText.trim()) return
    try {
      await addNoteMutation.mutateAsync({
        id: bookingForOffer._id,
        text: noteText,
        type: noteType,
      })
      setNoteText('')
      setNoteType('general')
      setIsNotesDialogOpen(false)
      setBookingForOffer(null)
      setSuccessMessage('Note added successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      refetch()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to add note')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleRecordAdditionalWork = async () => {
    if (!bookingForOffer || additionalWorkAmount <= 0) return
    if (!additionalWorkDescription.trim()) {
      setErrorMessage('Please enter a note explaining the additional amount')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    try {
      await recordPaymentMutation.mutateAsync({
        id: bookingForOffer._id,
        amount: additionalWorkAmount,
        description: additionalWorkDescription.trim(),
      })
      setIsAdditionalWorkDialogOpen(false)
      setBookingForOffer(null)
      setAdditionalWorkAmount(0)
      setAdditionalWorkDescription('')
      setSuccessMessage('Additional work payment recorded successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      refetch()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to record payment')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const canOfferJob = (booking: any) =>
    ['pending', 'offered'].includes(booking.status) && !booking.driver

  const canAssignDriver = (booking: any) =>
    !['completed', 'cancelled'].includes(booking.status)

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Booking Management</h2>
            <p className="text-muted-foreground">Manage all bookings and assign drivers</p>
          </div>
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Manual Order
          </Button>
        </div>

        {successMessage && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>Search and filter bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by address, order code, customer name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}>
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
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {data?.bookings?.map((booking: any) => {
                    const customer = typeof booking.customer === 'object' ? booking.customer : null
                    const driver = typeof booking.driver === 'object' ? booking.driver : null
                    const basePrice = booking.finalPrice || booking.estimatedPrice
                    const totalPrice = basePrice + (booking.additionalWorkPayment || 0)

                    return (
                      <Card key={booking._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg">
                                  {customer?.name || 'Unknown Customer'}
                                </h3>
                                <StatusBadge status={booking.status} />
                                {booking.orderCode && (
                                  <Badge variant="outline">#{booking.orderCode}</Badge>
                                )}
                                {booking.isDisputed && (
                                  <Badge variant="destructive">Disputed</Badge>
                                )}
                                {booking.additionalWorkPayment ? (
                                  <Badge variant="secondary">+{formatCurrency(booking.additionalWorkPayment)} additional</Badge>
                                ) : null}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                  <p><strong className="text-muted-foreground">Pickup:</strong> {booking.pickupAddress}, {booking.pickupCity} {booking.pickupZipCode}</p>
                                  <p><strong className="text-muted-foreground">Delivery:</strong> {booking.deliveryAddress}, {booking.deliveryCity} {booking.deliveryZipCode}</p>
                                  <p><strong className="text-muted-foreground">Date & Time:</strong> {formatDate(booking.pickupDate)} · {booking.pickupTime}</p>
                                </div>
                                <div className="space-y-1">
                                  <p><strong className="text-muted-foreground">Contact:</strong> {booking.contactEmail} | {booking.contactPhone}</p>
                                  <p><strong className="text-muted-foreground">Price:</strong> {formatCurrency(totalPrice)} {booking.additionalWorkPayment ? `(Base: ${formatCurrency(basePrice)})` : null}</p>
                                  {booking.additionalWorkPayment ? (
                                    <p>
                                      <strong className="text-muted-foreground">Additional:</strong>{' '}
                                      {formatCurrency(booking.additionalWorkPayment)}
                                      {booking.additionalWorkDescription
                                        ? ` — ${booking.additionalWorkDescription}`
                                        : null}
                                    </p>
                                  ) : null}
                                  {driver && (
                                    <p><strong className="text-muted-foreground">Driver:</strong> {driver.name}</p>
                                  )}
                                  {booking.driverOffers && booking.driverOffers.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Job Offers:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {booking.driverOffers.map((offer: any, idx: number) => (
                                          <div key={idx} className="flex items-center gap-1">
                                            <StatusBadge status={offer.status} kind="offer" />
                                            <span className="text-xs">{formatCurrency(offer.offeredPrice)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {booking.notes && booking.notes.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes ({booking.notes.length}):</p>
                                  <div className="space-y-1">
                                    {booking.notes.slice(-3).map((note: any, idx: number) => (
                                      <p key={idx} className="text-xs text-muted-foreground">
                                        <span className="font-medium">{note.type}:</span> {note.text.substring(0, 100)}{note.text.length > 100 ? '...' : ''}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBookingToAssign(booking._id)
                                  setIsAssignDialogOpen(true)
                                }}
                                disabled={!canAssignDriver(booking)}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                {driver ? 'Change Driver' : 'Assign Driver'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBookingForOffer(booking)
                                  setIsOfferDialogOpen(true)
                                }}
                                disabled={!canOfferJob(booking)}
                              >
                                <Users className="h-4 w-4 mr-1" />
                                Offer Job
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBookingForOffer(booking)
                                  setIsNotesDialogOpen(true)
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Add Note
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBookingForOffer(booking)
                                  setIsAdditionalWorkDialogOpen(true)
                                }}
                              >
                                <PoundSterling className="h-4 w-4 mr-1" />
                                Add Work
                              </Button>
                              {booking.isDisputed && !booking.disputeResolved && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setBookingToDispute(booking)
                                    setIsDisputeDialogOpen(true)
                                  }}
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Dispute
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  sendReminderMutation.mutate({ id: booking._id, type: 'customer' })
                                }}
                                disabled={sendReminderMutation.isLoading}
                                title="Send email reminder to customer"
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                👤
                              </Button>
                              {driver && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    sendReminderMutation.mutate({ id: booking._id, type: 'driver' })
                                  }}
                                  disabled={sendReminderMutation.isLoading}
                                  title="Send email reminder to driver"
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  🚗
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(booking)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
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
            )}
          </CardContent>
        </Card>

        {/* Create Manual Order Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Manual Order</DialogTitle>
              <DialogDescription>
                Create a booking for customers who booked by phone and paid directly to the business
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={newManualOrder.customer.name}
                    onChange={(e) =>
                      setNewManualOrder({
                        ...newManualOrder,
                        customer: { ...newManualOrder.customer, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Customer Phone</Label>
                  <Input
                    value={newManualOrder.customer.phone}
                    onChange={(e) =>
                      setNewManualOrder({
                        ...newManualOrder,
                        customer: { ...newManualOrder.customer, phone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={newManualOrder.customer.email}
                  onChange={(e) =>
                    setNewManualOrder({
                      ...newManualOrder,
                      customer: { ...newManualOrder.customer, email: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newManualOrder.price || ''}
                    onChange={(e) =>
                      setNewManualOrder({
                        ...newManualOrder,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select
                    value={newManualOrder.paymentStatus}
                    onValueChange={(value: 'paid' | 'pending') =>
                      setNewManualOrder({ ...newManualOrder, paymentStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newManualOrder.paymentStatus === 'paid' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      value={newManualOrder.paymentMethod}
                      onValueChange={(value: 'bank-transfer' | 'cash' | 'card' | 'other') =>
                        setNewManualOrder({ ...newManualOrder, paymentMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Reference (optional)</Label>
                    <Input
                      placeholder="Bank ref, receipt no..."
                      value={newManualOrder.paymentReference}
                      onChange={(e) =>
                        setNewManualOrder({ ...newManualOrder, paymentReference: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Service Type</Label>
                  <Select
                    value={newManualOrder.serviceType}
                    onValueChange={(value: 'local' | 'long-distance' | 'interstate') =>
                      setNewManualOrder({ ...newManualOrder, serviceType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="long-distance">Long Distance</SelectItem>
                      <SelectItem value="interstate">Interstate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <Select
                    value={newManualOrder.vehicleType}
                    onValueChange={(value: 'small-van' | 'medium-van' | 'large-van' | 'truck') =>
                      setNewManualOrder({ ...newManualOrder, vehicleType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small-van">Small Van</SelectItem>
                      <SelectItem value="medium-van">Medium Van</SelectItem>
                      <SelectItem value="large-van">Large Van</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Pickup Address</Label>
                <Input
                  value={newManualOrder.pickupAddress}
                  onChange={(e) =>
                    setNewManualOrder({ ...newManualOrder, pickupAddress: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Pickup City</Label>
                  <Input
                    value={newManualOrder.pickupCity}
                    onChange={(e) =>
                      setNewManualOrder({ ...newManualOrder, pickupCity: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Pickup Postcode</Label>
                  <Input
                    value={newManualOrder.pickupZipCode}
                    onChange={(e) =>
                      setNewManualOrder({ ...newManualOrder, pickupZipCode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pickup Access</Label>
                  <Select
                    value={newManualOrder.pickupAccess}
                    onValueChange={(value: 'lift' | 'stairs' | 'ground') =>
                      setNewManualOrder({ ...newManualOrder, pickupAccess: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ground">Ground floor</SelectItem>
                      <SelectItem value="lift">Lift</SelectItem>
                      <SelectItem value="stairs">Stairs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newManualOrder.pickupAccess === 'stairs' && (
                  <div>
                    <Label>Pickup Stairs (flights)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={newManualOrder.pickupStairsCount}
                      onChange={(e) =>
                        setNewManualOrder({
                          ...newManualOrder,
                          pickupStairsCount: parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Delivery Address</Label>
                <Input
                  value={newManualOrder.deliveryAddress}
                  onChange={(e) =>
                    setNewManualOrder({ ...newManualOrder, deliveryAddress: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Delivery City</Label>
                  <Input
                    value={newManualOrder.deliveryCity}
                    onChange={(e) =>
                      setNewManualOrder({ ...newManualOrder, deliveryCity: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Delivery Postcode</Label>
                  <Input
                    value={newManualOrder.deliveryZipCode}
                    onChange={(e) =>
                      setNewManualOrder({ ...newManualOrder, deliveryZipCode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Delivery Access</Label>
                  <Select
                    value={newManualOrder.deliveryAccess}
                    onValueChange={(value: 'lift' | 'stairs' | 'ground') =>
                      setNewManualOrder({ ...newManualOrder, deliveryAccess: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ground">Ground floor</SelectItem>
                      <SelectItem value="lift">Lift</SelectItem>
                      <SelectItem value="stairs">Stairs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newManualOrder.deliveryAccess === 'stairs' && (
                  <div>
                    <Label>Delivery Stairs (flights)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={newManualOrder.deliveryStairsCount}
                      onChange={(e) =>
                        setNewManualOrder({
                          ...newManualOrder,
                          deliveryStairsCount: parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>People Required</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={newManualOrder.men}
                  onChange={(e) =>
                    setNewManualOrder({
                      ...newManualOrder,
                      men: parseInt(e.target.value, 10) || 1,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pickup Date</Label>
                  <Input
                    type="date"
                    value={newManualOrder.pickupDate}
                    onChange={(e) =>
                      setNewManualOrder({ ...newManualOrder, pickupDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Pickup Time</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 10:00 - 11:00 am"
                    value={newManualOrder.pickupTime}
                    onChange={(e) =>
                      setNewManualOrder({ ...newManualOrder, pickupTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Special Instructions (optional)</Label>
                <Textarea
                  value={newManualOrder.specialInstructions}
                  onChange={(e) =>
                    setNewManualOrder({ ...newManualOrder, specialInstructions: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendConfirmationEmail"
                  checked={newManualOrder.sendConfirmationEmail}
                  onCheckedChange={(checked) =>
                    setNewManualOrder({
                      ...newManualOrder,
                      sendConfirmationEmail: checked === true,
                    })
                  }
                />
                <Label htmlFor="sendConfirmationEmail" className="font-normal cursor-pointer">
                  Send order confirmation email to customer
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateManualOrder}
                disabled={createBookingMutation.isLoading || !isManualOrderValid()}
              >
                {createBookingMutation.isLoading ? 'Creating...' : 'Create Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Booking</DialogTitle>
              <DialogDescription>Update booking details</DialogDescription>
            </DialogHeader>
            {editingBooking && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editingBooking.status}
                      onValueChange={(value) => setEditingBooking({ ...editingBooking, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="offered">Offered</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Final Price (£)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingBooking.finalPrice || editingBooking.estimatedPrice}
                      onChange={(e) => setEditingBooking({ ...editingBooking, finalPrice: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={typeof editingBooking.customer === 'object' ? editingBooking.customer.name : ''}
                    disabled
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      value={editingBooking.contactEmail || ''}
                      onChange={(e) => setEditingBooking({ ...editingBooking, contactEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={editingBooking.contactPhone || ''}
                      onChange={(e) => setEditingBooking({ ...editingBooking, contactPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Pickup Address</Label>
                  <Input
                    value={editingBooking.pickupAddress || ''}
                    onChange={(e) => setEditingBooking({ ...editingBooking, pickupAddress: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Pickup City</Label>
                    <Input
                      value={editingBooking.pickupCity || ''}
                      onChange={(e) => setEditingBooking({ ...editingBooking, pickupCity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Pickup Postcode</Label>
                    <Input
                      value={editingBooking.pickupZipCode || ''}
                      onChange={(e) => setEditingBooking({ ...editingBooking, pickupZipCode: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Delivery Address</Label>
                  <Input
                    value={editingBooking.deliveryAddress || ''}
                    onChange={(e) => setEditingBooking({ ...editingBooking, deliveryAddress: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Delivery City</Label>
                    <Input
                      value={editingBooking.deliveryCity || ''}
                      onChange={(e) => setEditingBooking({ ...editingBooking, deliveryCity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Delivery Postcode</Label>
                    <Input
                      value={editingBooking.deliveryZipCode || ''}
                      onChange={(e) => setEditingBooking({ ...editingBooking, deliveryZipCode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Pickup Date</Label>
                    <Input
                      type="date"
                      value={editingBooking.pickupDate ? new Date(editingBooking.pickupDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingBooking({ ...editingBooking, pickupDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Pickup Time</Label>
                    <Input
                      type="text"
                      placeholder="e.g. 10:00 - 11:00 am"
                      value={editingBooking.pickupTime || ''}
                      onChange={(e) => setEditingBooking({ ...editingBooking, pickupTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateBookingMutation.isLoading}>
                {updateBookingMutation.isLoading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Driver Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Driver</DialogTitle>
              <DialogDescription>Select a driver for this booking</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Driver</Label>
                <Select onValueChange={handleAssignDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {driversData?.drivers?.map((driver: any) => (
                      <SelectItem key={driver._id} value={driver._id}>
                        {driver.name} ({driver.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Offer Job to Drivers Dialog */}
        <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Offer Job to Drivers</DialogTitle>
              <DialogDescription>
                {bookingForOffer && (
                  <span>Base Price: {formatCurrency(bookingForOffer.finalPrice || bookingForOffer.estimatedPrice)}</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={offerPercentage}
                  onChange={(e) => setOfferPercentage(parseInt(e.target.value))}
                />
                {bookingForOffer && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Each driver will receive: {formatCurrency(((bookingForOffer.finalPrice || bookingForOffer.estimatedPrice) * offerPercentage) / 100)}
                  </p>
                )}
              </div>
              <div>
                <Label>Select Drivers</Label>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto border rounded p-2">
                  {driversData?.drivers?.map((driver: any) => (
                    <div key={driver._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={driver._id}
                        checked={selectedDrivers.includes(driver._id)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedDrivers([...selectedDrivers, driver._id])
                          } else {
                            setSelectedDrivers(selectedDrivers.filter(id => id !== driver._id))
                          }
                        }}
                      />
                      <Label htmlFor={driver._id} className="cursor-pointer">
                        {driver.name} ({driver.email})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsOfferDialogOpen(false)
                setSelectedDrivers([])
                setOfferPercentage(50)
              }}>
                Cancel
              </Button>
              <Button onClick={handleOfferJob} disabled={selectedDrivers.length === 0 || offerJobMutation.isLoading}>
                {offerJobMutation.isLoading ? 'Sending...' : 'Send Offers'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>Add a note to this booking</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Note Type</Label>
                <Select value={noteType} onValueChange={(value: any) => setNoteType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Note</Label>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter note details..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsNotesDialogOpen(false)
                setNoteText('')
                setNoteType('general')
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={!noteText.trim() || addNoteMutation.isLoading}>
                {addNoteMutation.isLoading ? 'Adding...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Additional Work Payment Dialog */}
        <Dialog open={isAdditionalWorkDialogOpen} onOpenChange={setIsAdditionalWorkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Additional Work Payment</DialogTitle>
              <DialogDescription>
                Add an extra amount with a note explaining why (shown on the booking card and details).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={additionalWorkAmount || ''}
                  onChange={(e) => setAdditionalWorkAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Note *</Label>
                <Textarea
                  value={additionalWorkDescription}
                  onChange={(e) => setAdditionalWorkDescription(e.target.value)}
                  placeholder="e.g. Extra flight of stairs, waiting time, additional boxes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAdditionalWorkDialogOpen(false)
                setAdditionalWorkAmount(0)
                setAdditionalWorkDescription('')
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleRecordAdditionalWork}
                disabled={
                  additionalWorkAmount <= 0 ||
                  !additionalWorkDescription.trim() ||
                  recordPaymentMutation.isLoading
                }
              >
                {recordPaymentMutation.isLoading ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Handle Dispute Dialog */}
        <Dialog open={isDisputeDialogOpen} onOpenChange={setIsDisputeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Handle Dispute</DialogTitle>
              <DialogDescription>
                {bookingToDispute && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Dispute Reason:</p>
                    <p className="text-sm text-muted-foreground">{bookingToDispute.disputeReason}</p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Resolution Status</Label>
                <Select
                  onValueChange={(value) => {
                    if (bookingToDispute) {
                      handleDisputeMutation.mutate({
                        id: bookingToDispute._id,
                        data: {
                          resolved: value === 'resolved',
                          status: value === 'resolved' ? 'completed' : undefined,
                        },
                      })
                      setIsDisputeDialogOpen(false)
                      setBookingToDispute(null)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved">Mark as Resolved</SelectItem>
                    <SelectItem value="pending">Keep as Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDisputeDialogOpen(false)
                setBookingToDispute(null)
              }}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default BookingsPage
