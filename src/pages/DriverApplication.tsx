import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from 'react-query'
import { authApi, DriverApplicationData } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { LocalFilePicker } from '@/components/ui/local-file-picker'
import { CheckCircle2, Loader2 } from 'lucide-react'

const STEPS = ['Personal', 'Documents', 'Vehicle', 'Bank & Video', 'Submit']

type ApplicationFiles = {
  drivingLicence?: File | null
  goodsInTransitInsurance?: File | null
  publicLiability?: File | null
  proofOfAddress?: File | null
  vehicleRegistrationDocument?: File | null
  vehiclePhoto?: File | null
  bankStatement?: File | null
  introductionVideo?: File | null
}

const emptyForm: DriverApplicationData = {
  name: '',
  email: '',
  phone: '',
  username: '',
  address: '',
  businessName: '',
  drivingLicence: '',
  goodsInTransitInsurance: '',
  publicLiability: '',
  proofOfAddress: '',
  vehicleRegistration: '',
  vehicleCategory: undefined,
  vehicleMake: '',
  vehicleModel: '',
  vehicleSeats: 1,
  vehicleBaseLocation: '',
  vehicleRegistrationDocumentType: undefined,
  vehicleRegistrationDocument: '',
  vehiclePhoto: '',
  vehicleType: '',
  vehicleFuelType: 'petrol',
  vehicleTailLift: false,
  vehicleTrailer: false,
  introductionVideoUrl: '',
  bankDetails: {
    accountName: '',
    accountNumber: '',
    sortCode: '',
    bankName: '',
    bankStatement: '',
  },
}

export default function DriverApplication() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<DriverApplicationData>(emptyForm)
  const [applicationFiles, setApplicationFiles] = useState<ApplicationFiles>({})
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const mutation = useMutation((data: DriverApplicationData) => authApi.submitDriverApplication(data))

  const update = (patch: Partial<DriverApplicationData>) => setForm((prev) => ({ ...prev, ...patch }))
  const updateBank = (patch: Partial<NonNullable<DriverApplicationData['bankDetails']>>) =>
    setForm((prev) => ({ ...prev, bankDetails: { ...prev.bankDetails, ...patch } }))
  const updateFile = (key: keyof ApplicationFiles, file: File | null) =>
    setApplicationFiles((prev) => ({ ...prev, [key]: file }))

  const validateStep = (forSubmit = false): boolean => {
    setError('')
    if (step === 0 || forSubmit) {
      if (!form.name.trim() || !form.email.trim() || !form.phone?.trim()) {
        setError('Name, email, and phone are required')
        return false
      }
    }
    if (step === 1 || forSubmit) {
      if (!applicationFiles.drivingLicence || !applicationFiles.proofOfAddress) {
        setError('Driving licence and proof of address files are required')
        return false
      }
    }
    if (step === 2 || forSubmit) {
      if (!form.vehicleRegistration || !form.vehicleCategory || !applicationFiles.vehiclePhoto) {
        setError('Vehicle registration, category, and photo are required')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const uploadApplicationFiles = async () => {
    const fileUploads: {
      key: keyof ApplicationFiles
      folder: string
      type?: 'image' | 'video'
      target: 'form' | 'bank' | 'video'
      formField?: keyof DriverApplicationData
      bankField?: keyof NonNullable<DriverApplicationData['bankDetails']>
    }[] = [
      { key: 'drivingLicence', folder: 'driver-applications/documents', target: 'form', formField: 'drivingLicence' },
      { key: 'goodsInTransitInsurance', folder: 'driver-applications/documents', target: 'form', formField: 'goodsInTransitInsurance' },
      { key: 'publicLiability', folder: 'driver-applications/documents', target: 'form', formField: 'publicLiability' },
      { key: 'proofOfAddress', folder: 'driver-applications/documents', target: 'form', formField: 'proofOfAddress' },
      { key: 'vehicleRegistrationDocument', folder: 'driver-applications/vehicles', target: 'form', formField: 'vehicleRegistrationDocument' },
      { key: 'vehiclePhoto', folder: 'driver-applications/vehicles', target: 'form', formField: 'vehiclePhoto' },
      { key: 'bankStatement', folder: 'driver-applications/bank', target: 'bank', bankField: 'bankStatement' },
      { key: 'introductionVideo', folder: 'driver-applications/videos', type: 'video', target: 'video' },
    ]

    const formUpdates: Partial<DriverApplicationData> = {}
    const bankUpdates: Partial<NonNullable<DriverApplicationData['bankDetails']>> = {}
    let videoUrl = form.introductionVideoUrl

    for (const item of fileUploads) {
      const file = applicationFiles[item.key]
      if (!file) continue

      const result = await authApi.uploadApplicationFile(file, {
        folder: item.folder,
        type: item.type || 'image',
      })

      if (item.target === 'form' && item.formField) {
        ;(formUpdates as Record<string, string>)[item.formField] = result.url
      } else if (item.target === 'bank' && item.bankField) {
        bankUpdates[item.bankField] = result.url
      } else if (item.target === 'video') {
        videoUrl = result.url
      }
    }

    return {
      ...formUpdates,
      introductionVideoUrl: videoUrl,
      bankDetails: { ...form.bankDetails, ...bankUpdates },
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(true)) return
    setError('')
    setIsUploading(true)
    try {
      const uploaded = await uploadApplicationFiles()
      await mutation.mutateAsync({
        ...form,
        ...uploaded,
        vehicleSeats: Number(form.vehicleSeats) || 1,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit application')
    } finally {
      setIsUploading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold">Application submitted</h1>
            <p className="text-muted-foreground">
              Thank you for applying to drive with Local Van. We will review your details and email you
              once a decision has been made.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fileHint = (
    <p className="text-sm text-muted-foreground">
      Files are previewed locally and uploaded together when you submit your application.
    </p>
  )

  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Drive with Local Van</h1>
          <p className="text-muted-foreground">Complete this form to apply as a driver partner</p>
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`text-xs px-3 py-1 rounded-full border ${
                i === step ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Full name *</Label>
                  <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+44..." />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input value={form.username} onChange={(e) => update({ username: e.target.value.toLowerCase() })} />
                </div>
                <div>
                  <Label>Business name (if applicable)</Label>
                  <Input value={form.businessName} onChange={(e) => update({ businessName: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea value={form.address} onChange={(e) => update({ address: e.target.value })} rows={3} />
                </div>
              </div>
            )}

            {step === 1 && (
              <>
                {fileHint}
                <LocalFilePicker label="Driving licence *" file={applicationFiles.drivingLicence} onChange={(f) => updateFile('drivingLicence', f)} />
                <LocalFilePicker label="Goods in transit insurance" file={applicationFiles.goodsInTransitInsurance} onChange={(f) => updateFile('goodsInTransitInsurance', f)} />
                <LocalFilePicker label="Public liability insurance" file={applicationFiles.publicLiability} onChange={(f) => updateFile('publicLiability', f)} />
                <LocalFilePicker label="Proof of address *" file={applicationFiles.proofOfAddress} onChange={(f) => updateFile('proofOfAddress', f)} />
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Registration *</Label>
                    <Input value={form.vehicleRegistration} onChange={(e) => update({ vehicleRegistration: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Select value={form.vehicleCategory} onValueChange={(v: any) => update({ vehicleCategory: v })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small-van">Small Van</SelectItem>
                        <SelectItem value="medium-van">Medium Van</SelectItem>
                        <SelectItem value="large-van">Large Van</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Make</Label>
                    <Input value={form.vehicleMake} onChange={(e) => update({ vehicleMake: e.target.value })} />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input value={form.vehicleModel} onChange={(e) => update({ vehicleModel: e.target.value })} />
                  </div>
                  <div>
                    <Label>Vehicle type</Label>
                    <Input value={form.vehicleType} onChange={(e) => update({ vehicleType: e.target.value })} placeholder="e.g. Luton van" />
                  </div>
                  <div>
                    <Label>Base location</Label>
                    <Input value={form.vehicleBaseLocation} onChange={(e) => update({ vehicleBaseLocation: e.target.value })} />
                  </div>
                  <div>
                    <Label>Fuel type</Label>
                    <Select value={form.vehicleFuelType} onValueChange={(v: any) => update({ vehicleFuelType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['petrol', 'diesel', 'lpg', 'hybrid', 'electric'].map((f) => (
                          <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Registration document type</Label>
                    <Select value={form.vehicleRegistrationDocumentType} onValueChange={(v: any) => update({ vehicleRegistrationDocumentType: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="logbook">Logbook</SelectItem>
                        <SelectItem value="mot">MOT</SelectItem>
                        <SelectItem value="v5">V5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {fileHint}
                <LocalFilePicker label="Vehicle registration document" file={applicationFiles.vehicleRegistrationDocument} onChange={(f) => updateFile('vehicleRegistrationDocument', f)} />
                <LocalFilePicker label="Vehicle photo *" file={applicationFiles.vehiclePhoto} onChange={(f) => updateFile('vehiclePhoto', f)} />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Tail lift?</Label>
                    <RadioGroup value={form.vehicleTailLift ? 'yes' : 'no'} onValueChange={(v) => update({ vehicleTailLift: v === 'yes' })} className="flex gap-4 mt-2">
                      <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="tail-yes" /><Label htmlFor="tail-yes">Yes</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="no" id="tail-no" /><Label htmlFor="tail-no">No</Label></div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Trailer?</Label>
                    <RadioGroup value={form.vehicleTrailer ? 'yes' : 'no'} onValueChange={(v) => update({ vehicleTrailer: v === 'yes' })} className="flex gap-4 mt-2">
                      <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="trailer-yes" /><Label htmlFor="trailer-yes">Yes</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="no" id="trailer-no" /><Label htmlFor="trailer-no">No</Label></div>
                    </RadioGroup>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Account name</Label><Input value={form.bankDetails?.accountName} onChange={(e) => updateBank({ accountName: e.target.value })} /></div>
                  <div><Label>Bank name</Label><Input value={form.bankDetails?.bankName} onChange={(e) => updateBank({ bankName: e.target.value })} /></div>
                  <div><Label>Account number</Label><Input value={form.bankDetails?.accountNumber} onChange={(e) => updateBank({ accountNumber: e.target.value.replace(/\D/g, '') })} maxLength={8} /></div>
                  <div><Label>Sort code</Label><Input value={form.bankDetails?.sortCode} onChange={(e) => updateBank({ sortCode: e.target.value })} placeholder="12-34-56" /></div>
                </div>
                {fileHint}
                <LocalFilePicker label="Bank statement" file={applicationFiles.bankStatement} onChange={(f) => updateFile('bankStatement', f)} />
                <div>
                  <Label>Introduction video URL (optional)</Label>
                  <Input
                    value={applicationFiles.introductionVideo ? '' : form.introductionVideoUrl}
                    onChange={(e) => update({ introductionVideoUrl: e.target.value })}
                    placeholder="YouTube, Vimeo, or Google Drive link"
                    disabled={!!applicationFiles.introductionVideo}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Or choose a video file below</p>
                </div>
                <LocalFilePicker
                  label="Introduction video file (optional)"
                  file={applicationFiles.introductionVideo}
                  onChange={(f) => {
                    updateFile('introductionVideo', f)
                    if (f) update({ introductionVideoUrl: '' })
                  }}
                  accept="video/mp4,video/webm,video/quicktime"
                  maxSizeMB={25}
                />
              </>
            )}

            {step === 4 && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">Review your details before submitting. All files will be uploaded now.</p>
                <p><strong>Name:</strong> {form.name}</p>
                <p><strong>Email:</strong> {form.email}</p>
                <p><strong>Phone:</strong> {form.phone}</p>
                <p><strong>Vehicle:</strong> {form.vehicleMake} {form.vehicleModel} ({form.vehicleRegistration})</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>Continue</Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={mutation.isLoading || isUploading}>
                  {mutation.isLoading || isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? 'Uploading files...' : 'Submitting...'}
                    </>
                  ) : (
                    'Submit application'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
