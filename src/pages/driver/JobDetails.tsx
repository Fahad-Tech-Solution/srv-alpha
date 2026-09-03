import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  MapPin,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import {
  useDriverJob,
  useUpdateJobStatus,
  useAddCompletionDetails,
  useDisputeJob,
  useAcceptJobOffer,
  useRejectJobOffer,
} from '@/hooks/useDriver'
import { useAuth } from '@/hooks/useAuth'
import { getOfferForDriver } from '@/utils/driverOffers'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const JobDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: job, isLoading } = useDriverJob(id || '')
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [completionNotes, setCompletionNotes] = useState('')
  const [completionPictures, setCompletionPictures] = useState<string[]>([])
  const [disputeReason, setDisputeReason] = useState('')

  const updateStatusMutation = useUpdateJobStatus()
  const addCompletionMutation = useAddCompletionDetails()
  const disputeMutation = useDisputeJob()
  const acceptMutation = useAcceptJobOffer()
  const rejectMutation = useRejectJobOffer()

  const handleAcceptOffer = async () => {
    if (!id || !confirm('Are you sure you want to accept this job offer?')) return
    await acceptMutation.mutateAsync(id)
  }

  const handleRejectOffer = async () => {
    if (!id || !confirm('Are you sure you want to reject this job offer?')) return
    await rejectMutation.mutateAsync(id)
    navigate('/driver/available-jobs')
  }

  const handleStatusUpdate = async () => {
    if (!id || !newStatus) return
    await updateStatusMutation.mutateAsync({ id, status: newStatus })
    setIsStatusDialogOpen(false)
    setNewStatus('')
  }

  const handleComplete = async () => {
    if (!id) return
    await addCompletionMutation.mutateAsync({
      id,
      data: {
        notes: completionNotes,
        pictures: completionPictures,
      },
    })
    setIsCompleteDialogOpen(false)
    setCompletionNotes('')
    setCompletionPictures([])
  }

  const handleDispute = async () => {
    if (!id || !disputeReason) return
    await disputeMutation.mutateAsync({ id, reason: disputeReason })
    setIsDisputeDialogOpen(false)
    setDisputeReason('')
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

  if (!job) {
    return (
      <DashboardLayout role="driver">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => navigate('/driver/jobs')} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const offer = getOfferForDriver(job, user)
  const isOfferExpired =
    !!job.offerExpiresAt && new Date(job.offerExpiresAt) <= new Date()
  const hasAssignedDriver = !!(job as any).driver
  const canRespondToOffer =
    ['pending', 'offered'].includes(job.status) &&
    !hasAssignedDriver &&
    !isOfferExpired
  const canUpdateStatus = ['confirmed', 'in-progress'].includes(job.status)
  const canComplete = ['confirmed', 'in-progress'].includes(job.status)
  const canDispute =
    ['confirmed', 'in-progress', 'completed'].includes(job.status) && !job.isDisputed
  const offeredPrice = offer?.offeredPrice ?? job.finalPrice ?? job.estimatedPrice
  const additionalInfo =
    (job as any).specialInstructions ||
    (job as any).helpersLabel ||
    (job as any).durationRequired ||
    (job as any).collectionStairs ||
    (job as any).deliveryStairs

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Job Details</h2>
            <p className="text-muted-foreground">Order #{job.orderCode || job._id}</p>
          </div>
          <StatusBadge status={job.status} className="text-lg px-4 py-2" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Name:</strong>{' '}
                {typeof job.customer === 'object' ? job.customer.name : 'Unknown'}
              </p>
              <p>
                <strong>Email:</strong>{' '}
                {typeof job.customer === 'object' ? job.customer.email : job.contactEmail}
              </p>
              <p>
                <strong>Phone:</strong> {job.contactPhone}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Date:</strong> {formatDate(job.pickupDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Time:</strong> {job.pickupTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  <strong>
                    {canRespondToOffer ? 'Offered Pay:' : 'Price:'}
                  </strong>{' '}
                  {formatCurrency(offeredPrice)}
                </span>
              </div>
              {(job as any).additionalWorkPayment ? (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p>
                    <strong>Additional:</strong>{' '}
                    {formatCurrency((job as any).additionalWorkPayment)}
                  </p>
                  {(job as any).additionalWorkDescription ? (
                    <p className="text-muted-foreground mt-1">
                      {(job as any).additionalWorkDescription}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {canRespondToOffer && offer?.offeredPrice != null && (
                <p className="text-xs text-muted-foreground">
                  Admin offer (percentage of booking) — not customer list price
                </p>
              )}
              {job.offerExpiresAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Offer expires: {formatDateTime(job.offerExpiresAt)}
                  </span>
                </div>
              )}
              {(job as any).serviceType && (
                <p>
                  <strong>Service:</strong>{' '}
                  <span className="capitalize">{(job as any).serviceType}</span>
                </p>
              )}
              {(job as any).vehicleType && (
                <p>
                  <strong>Vehicle:</strong>{' '}
                  <span className="capitalize">
                    {String((job as any).vehicleType).replace('-', ' ')}
                  </span>
                </p>
              )}
              {(job as any).miles != null && (
                <p>
                  <strong>Miles:</strong> {(job as any).miles}
                </p>
              )}
              {(job as any).durationRequired && (
                <p>
                  <strong>Duration:</strong> {(job as any).durationRequired}
                </p>
              )}
              {(job as any).helpersLabel || (job as any).manRequired ? (
                <p>
                  <strong>Helpers:</strong>{' '}
                  {(job as any).helpersLabel || (job as any).manRequired}
                </p>
              ) : null}
              {(job as any).collectionStairs && (
                <p>
                  <strong>Collection stairs:</strong> {(job as any).collectionStairs}
                </p>
              )}
              {(job as any).deliveryStairs && (
                <p>
                  <strong>Delivery stairs:</strong> {(job as any).deliveryStairs}
                </p>
              )}
              {additionalInfo && (
                <div className="pt-2 border-t">
                  <p className="font-medium">Additional Info</p>
                  <p className="text-sm text-muted-foreground">
                    {(job as any).specialInstructions ||
                      [
                        (job as any).helpersLabel,
                        (job as any).durationRequired,
                        (job as any).collectionStairs
                          ? `Collection stairs: ${(job as any).collectionStairs}`
                          : null,
                        (job as any).deliveryStairs
                          ? `Delivery stairs: ${(job as any).deliveryStairs}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') ||
                      '—'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pickup Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p>{job.pickupAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.pickupCity} {job.pickupZipCode}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p>{job.deliveryAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.deliveryCity} {job.deliveryZipCode}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {(job as any).specialInstructions && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{(job as any).specialInstructions}</p>
            </CardContent>
          </Card>
        )}

        {job.completionPictures && job.completionPictures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completion Pictures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {job.completionPictures.map((pic: string, index: number) => (
                  <img
                    key={index}
                    src={pic}
                    alt={`Completion ${index + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {job.driverNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Driver Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{job.driverNotes}</p>
            </CardContent>
          </Card>
        )}

        {job.isDisputed && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Disputed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                <strong>Reason:</strong> {job.disputeReason}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Status: {job.disputeResolved ? 'Resolved' : 'Pending Resolution'}
              </p>
            </CardContent>
          </Card>
        )}

        {isOfferExpired && ['pending', 'offered'].includes(job.status) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Offer Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This job offer has expired and can no longer be accepted or rejected.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            {canRespondToOffer && (
              <>
                <Button
                  onClick={handleAcceptOffer}
                  disabled={acceptMutation.isLoading || rejectMutation.isLoading}
                  className="flex-1 min-w-[140px]"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Offer ({formatCurrency(offeredPrice)})
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRejectOffer}
                  disabled={acceptMutation.isLoading || rejectMutation.isLoading}
                  className="flex-1 min-w-[140px]"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            {canUpdateStatus && (
              <Button onClick={() => setIsStatusDialogOpen(true)}>Update Status</Button>
            )}
            {canComplete && (
              <Button variant="outline" onClick={() => setIsCompleteDialogOpen(true)}>
                Complete Job
              </Button>
            )}
            {canDispute && (
              <Button variant="destructive" onClick={() => setIsDisputeDialogOpen(true)}>
                Dispute Job
              </Button>
            )}
            {!canRespondToOffer && !canUpdateStatus && !canComplete && !canDispute && (
              <p className="text-sm text-muted-foreground">No actions available for this job.</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Job Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={!newStatus || updateStatusMutation.isLoading}
              >
                {updateStatusMutation.isLoading ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Job</DialogTitle>
              <DialogDescription>Add completion details and notes</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Add any notes about the job completion..."
                />
              </div>
              <div>
                <Label>Pictures (URLs, comma-separated)</Label>
                <Input
                  value={completionPictures.join(', ')}
                  onChange={(e) =>
                    setCompletionPictures(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={addCompletionMutation.isLoading}>
                {addCompletionMutation.isLoading ? 'Completing...' : 'Complete Job'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDisputeDialogOpen} onOpenChange={setIsDisputeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dispute Job</DialogTitle>
              <DialogDescription>Provide a reason for disputing this job</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why you are disputing this job..."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDisputeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDispute}
                disabled={!disputeReason || disputeMutation.isLoading}
              >
                {disputeMutation.isLoading ? 'Submitting...' : 'Submit Dispute'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default JobDetailsPage
