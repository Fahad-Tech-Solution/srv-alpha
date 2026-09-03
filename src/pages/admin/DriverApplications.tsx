import { useState } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react'
import {
  useAdminUsers,
  useApproveDriverApplication,
  useRejectDriverApplication,
} from '@/hooks/useAdmin'
import { formatDate } from '@/utils/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

const DriverApplicationsPage = () => {
  const [page] = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [message, setMessage] = useState('')

  const { data, isLoading, refetch } = useAdminUsers({
    page,
    limit: 10,
    role: 'driver',
    applicationStatus: 'pending',
  })

  const approveMutation = useApproveDriverApplication()
  const rejectMutation = useRejectDriverApplication()

  const applications = data?.users || []

  const handleApprove = async (id: string) => {
    try {
      const result = await approveMutation.mutateAsync(id)
      setMessage(result.message)
      setSelected(null)
      refetch()
      setTimeout(() => setMessage(''), 4000)
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to approve')
    }
  }

  const handleReject = async () => {
    if (!selected) return
    try {
      const result = await rejectMutation.mutateAsync({ id: selected._id, note: rejectNote })
      setMessage(result.message)
      setIsRejectOpen(false)
      setSelected(null)
      setRejectNote('')
      refetch()
      setTimeout(() => setMessage(''), 4000)
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to reject')
    }
  }

  const docLink = (url?: string, label?: string) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
        {label || 'View document'}
      </a>
    ) : (
      <span className="text-muted-foreground">Not provided</span>
    )

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Driver Applications</h2>
          <p className="text-muted-foreground">Review and approve or decline driver interest forms</p>
        </div>

        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pending applications</CardTitle>
            <CardDescription>{data?.pagination?.total || 0} awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No pending applications</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app: any) => (
                  <div key={app._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{app.name}</h3>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{app.email}</p>
                      {app.applicationSubmittedAt && (
                        <p className="text-xs text-muted-foreground">
                          Submitted {formatDate(app.applicationSubmittedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelected(app)}>
                        <Eye className="h-4 w-4 mr-1" /> Review
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(app._id)} disabled={approveMutation.isLoading}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelected(app)
                          setIsRejectOpen(true)
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected && !isRejectOpen} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <p><strong>Phone:</strong> {selected.phone || '—'}</p>
                <p><strong>Business:</strong> {selected.businessName || '—'}</p>
                <p className="col-span-2"><strong>Address:</strong> {selected.address || '—'}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Documents</h4>
                <div className="grid gap-1">
                  <div>Driving licence: {docLink(selected.drivingLicence)}</div>
                  <div>GIT insurance: {docLink(selected.goodsInTransitInsurance)}</div>
                  <div>Public liability: {docLink(selected.publicLiability)}</div>
                  <div>Proof of address: {docLink(selected.proofOfAddress)}</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Vehicle</h4>
                <p>{selected.vehicleMake} {selected.vehicleModel} · {selected.vehicleRegistration}</p>
                <p className="text-muted-foreground capitalize">{selected.vehicleCategory?.replace('-', ' ')} · {selected.vehicleBaseLocation}</p>
                <div className="mt-1">{docLink(selected.vehiclePhoto, 'Vehicle photo')}</div>
              </div>
              {selected.introductionVideoUrl && (
                <div>
                  <h4 className="font-semibold mb-2">Introduction video</h4>
                  {selected.introductionVideoUrl.includes('cloudinary') ? (
                    <video src={selected.introductionVideoUrl} controls className="max-h-48 w-full rounded" />
                  ) : (
                    docLink(selected.introductionVideoUrl, 'Open video link')
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <Button onClick={() => selected && handleApprove(selected._id)}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline application</DialogTitle>
            <DialogDescription>
              The driver will receive an email. You can include an optional note.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="rejectNote">Note (optional)</Label>
            <Textarea id="rejectNote" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isLoading}>
              Decline & notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default DriverApplicationsPage
