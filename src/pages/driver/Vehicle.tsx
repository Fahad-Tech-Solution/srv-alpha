import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Truck, CheckCircle2, XCircle } from 'lucide-react'
import { useDriverVehicle, useUpdateVehicle } from '@/hooks/useDriver'
import { FileUpload } from '@/components/ui/file-upload'

const VehiclePage = () => {
  const { data: vehicle, isLoading } = useDriverVehicle()
  const updateVehicleMutation = useUpdateVehicle()
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [formData, setFormData] = useState({
    vehicleRegistration: '',
    vehicleCategory: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleSeats: '1',
    vehicleBaseLocation: '',
    vehicleRegistrationDocumentType: '',
    vehicleRegistrationDocument: '',
    vehiclePhoto: '',
    vehicleType: '',
    vehicleTotalPayload: { value: '', unit: 'kg' },
    vehicleLoadingCapacity: { value: '', unit: 'm³' },
    vehicleMaxLength: { value: '', unit: 'm' },
    vehicleMotorbikeCapacity: '0',
    vehicleTailLift: 'no',
    vehicleTrailer: 'no',
    vehiclePayload: { value: '', unit: 'kg' },
    vehicleFuelType: 'petrol',
  })

  useEffect(() => {
    if (vehicle) {
      setFormData({
        vehicleRegistration: vehicle.vehicleRegistration || '',
        vehicleCategory: vehicle.vehicleCategory || '',
        vehicleMake: vehicle.vehicleMake || '',
        vehicleModel: vehicle.vehicleModel || '',
        vehicleSeats: vehicle.vehicleSeats?.toString() || '1',
        vehicleBaseLocation: vehicle.vehicleBaseLocation || '',
        vehicleRegistrationDocumentType: vehicle.vehicleRegistrationDocumentType || '',
        vehicleRegistrationDocument: vehicle.vehicleRegistrationDocument || '',
        vehiclePhoto: vehicle.vehiclePhoto || '',
        vehicleType: vehicle.vehicleType || '',
        vehicleTotalPayload: {
          value: vehicle.vehicleTotalPayload?.value?.toString() || '',
          unit: vehicle.vehicleTotalPayload?.unit || 'kg',
        },
        vehicleLoadingCapacity: {
          value: vehicle.vehicleLoadingCapacity?.value?.toString() || '',
          unit: vehicle.vehicleLoadingCapacity?.unit || 'm³',
        },
        vehicleMaxLength: {
          value: vehicle.vehicleMaxLength?.value?.toString() || '',
          unit: vehicle.vehicleMaxLength?.unit || 'm',
        },
        vehicleMotorbikeCapacity: vehicle.vehicleMotorbikeCapacity?.toString() || '0',
        vehicleTailLift: vehicle.vehicleTailLift ? 'yes' : 'no',
        vehicleTrailer: vehicle.vehicleTrailer ? 'yes' : 'no',
        vehiclePayload: {
          value: vehicle.vehiclePayload?.value?.toString() || '',
          unit: vehicle.vehiclePayload?.unit || 'kg',
        },
        vehicleFuelType: vehicle.vehicleFuelType || 'petrol',
      })
    }
  }, [vehicle])

  const handleSave = async () => {
    setSuccessMessage('')
    setErrorMessage('')
    
    try {
      const payload: any = {}
      
      // Only include fields that have values
      if (formData.vehicleRegistration) payload.vehicleRegistration = formData.vehicleRegistration
      if (formData.vehicleCategory) payload.vehicleCategory = formData.vehicleCategory
      if (formData.vehicleMake) payload.vehicleMake = formData.vehicleMake
      if (formData.vehicleModel) payload.vehicleModel = formData.vehicleModel
      if (formData.vehicleSeats) payload.vehicleSeats = parseInt(formData.vehicleSeats)
      if (formData.vehicleBaseLocation) payload.vehicleBaseLocation = formData.vehicleBaseLocation
      if (formData.vehicleRegistrationDocumentType) payload.vehicleRegistrationDocumentType = formData.vehicleRegistrationDocumentType
      if (formData.vehicleRegistrationDocument) payload.vehicleRegistrationDocument = formData.vehicleRegistrationDocument
      if (formData.vehiclePhoto) payload.vehiclePhoto = formData.vehiclePhoto
      if (formData.vehicleType) payload.vehicleType = formData.vehicleType
      
      // Handle nested objects - only send if value exists
      if (formData.vehicleTotalPayload.value && formData.vehicleTotalPayload.value.trim() !== '') {
        const numValue = parseFloat(formData.vehicleTotalPayload.value)
        if (!isNaN(numValue)) {
          payload.vehicleTotalPayload = {
            value: numValue,
            unit: formData.vehicleTotalPayload.unit,
          }
        }
      }
      
      if (formData.vehicleLoadingCapacity.value && formData.vehicleLoadingCapacity.value.trim() !== '') {
        const numValue = parseFloat(formData.vehicleLoadingCapacity.value)
        if (!isNaN(numValue)) {
          payload.vehicleLoadingCapacity = {
            value: numValue,
            unit: formData.vehicleLoadingCapacity.unit,
          }
        }
      }
      
      if (formData.vehicleMaxLength.value && formData.vehicleMaxLength.value.trim() !== '') {
        const numValue = parseFloat(formData.vehicleMaxLength.value)
        if (!isNaN(numValue)) {
          payload.vehicleMaxLength = {
            value: numValue,
            unit: formData.vehicleMaxLength.unit,
          }
        }
      }
      
      if (formData.vehicleMotorbikeCapacity) {
        payload.vehicleMotorbikeCapacity = parseInt(formData.vehicleMotorbikeCapacity) || 0
      }
      
      payload.vehicleTailLift = formData.vehicleTailLift === 'yes'
      payload.vehicleTrailer = formData.vehicleTrailer === 'yes'
      
      if (formData.vehiclePayload.value && formData.vehiclePayload.value.trim() !== '') {
        const numValue = parseFloat(formData.vehiclePayload.value)
        if (!isNaN(numValue)) {
          payload.vehiclePayload = {
            value: numValue,
            unit: formData.vehiclePayload.unit,
          }
        }
      }
      
      if (formData.vehicleFuelType) payload.vehicleFuelType = formData.vehicleFuelType
      
      const result = await updateVehicleMutation.mutateAsync(payload)
      setSuccessMessage(result?.message || 'Vehicle details saved successfully!')
      setErrorMessage('')
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to save vehicle details. Please try again.'
      setErrorMessage(errorMsg)
      setSuccessMessage('')
      // Clear error message after 8 seconds
      setTimeout(() => setErrorMessage(''), 8000)
    }
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

  // Helper function to format vehicle category
  const formatCategory = (category?: string) => {
    if (!category) return 'Not set'
    return category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  // Helper function to format fuel type
  const formatFuelType = (fuelType?: string) => {
    if (!fuelType) return 'Not set'
    return fuelType.charAt(0).toUpperCase() + fuelType.slice(1)
  }

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Vehicle details:</h2>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert variant="success" className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Saved Vehicle Information */}
        {vehicle && vehicle.vehicleRegistration && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Current Vehicle Information
              </CardTitle>
              <CardDescription>Your saved vehicle details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Registration</Label>
                  <p className="font-medium">{vehicle.vehicleRegistration}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{formatCategory(vehicle.vehicleCategory)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Make & Model</Label>
                  <p className="font-medium">{vehicle.vehicleMake} {vehicle.vehicleModel}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{vehicle.vehicleType ? vehicle.vehicleType.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Base Location</Label>
                  <p className="font-medium">{vehicle.vehicleBaseLocation || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fuel Type</Label>
                  <p className="font-medium">{formatFuelType(vehicle.vehicleFuelType)}</p>
                </div>
                {vehicle.vehicleTotalPayload?.value && (
                  <div>
                    <Label className="text-muted-foreground">Total Payload</Label>
                    <p className="font-medium">{vehicle.vehicleTotalPayload.value} {vehicle.vehicleTotalPayload.unit}</p>
                  </div>
                )}
                {vehicle.vehicleLoadingCapacity?.value && (
                  <div>
                    <Label className="text-muted-foreground">Loading Capacity</Label>
                    <p className="font-medium">{vehicle.vehicleLoadingCapacity.value} {vehicle.vehicleLoadingCapacity.unit}</p>
                  </div>
                )}
                {vehicle.vehicleTailLift !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Tail Lift</Label>
                    <p className="font-medium">{vehicle.vehicleTailLift ? 'Yes' : 'No'}</p>
                  </div>
                )}
                {vehicle.vehicleTrailer !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Uses Trailer</Label>
                    <p className="font-medium">{vehicle.vehicleTrailer ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vehicleRegistration" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Vehicle registration
                    </Label>
                    <Input
                      id="vehicleRegistration"
                      value={formData.vehicleRegistration}
                      onChange={(e) => setFormData({ ...formData, vehicleRegistration: e.target.value.toUpperCase() })}
                      placeholder="e.g., AB12 CDE"
                      maxLength={8}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleCategory" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Vehicle category
                    </Label>
                    <Select
                      value={formData.vehicleCategory}
                      onValueChange={(value) => setFormData({ ...formData, vehicleCategory: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small-van">Small Van</SelectItem>
                        <SelectItem value="medium-van">Medium Van</SelectItem>
                        <SelectItem value="large-van">Large Van</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vehicleMake" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Make
                    </Label>
                    <Input
                      id="vehicleMake"
                      value={formData.vehicleMake}
                      onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                      placeholder="e.g., Ford, Mercedes"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleModel" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Model
                    </Label>
                    <Input
                      id="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                      placeholder="e.g., Transit, Sprinter"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleSeats">Seats (including driver)</Label>
                    <Select
                      value={formData.vehicleSeats}
                      onValueChange={(value) => setFormData({ ...formData, vehicleSeats: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vehicleBaseLocation" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Where is this vehicle based predominantly?
                    </Label>
                    <Input
                      id="vehicleBaseLocation"
                      value={formData.vehicleBaseLocation}
                      onChange={(e) => setFormData({ ...formData, vehicleBaseLocation: e.target.value })}
                      placeholder="Enter a location"
                      required
                    />
                  </div>

                  <div>
                    <Label className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Upload a document with the vehicle registration on:
                    </Label>
                    <div className="mt-2 space-y-2">
                      <RadioGroup
                        value={formData.vehicleRegistrationDocumentType}
                        onValueChange={(value) => setFormData({ ...formData, vehicleRegistrationDocumentType: value })}
                        required
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="logbook" id="logbook" />
                          <Label htmlFor="logbook" className="cursor-pointer font-normal">Copy of log book</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mot" id="mot" />
                          <Label htmlFor="mot" className="cursor-pointer font-normal">Copy of MOT</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="v5" id="v5" />
                          <Label htmlFor="v5" className="cursor-pointer font-normal">V5 Document</Label>
                        </div>
                      </RadioGroup>
                      <div className="pt-2">
                        <FileUpload
                          value={formData.vehicleRegistrationDocument}
                          onChange={(url) => setFormData({ ...formData, vehicleRegistrationDocument: url })}
                          accept="image/*,.pdf"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Vehicle image</Label>
                    <FileUpload
                      value={formData.vehiclePhoto}
                      onChange={(url) => setFormData({ ...formData, vehiclePhoto: url })}
                      accept="image/*"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vehicleType" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Type of vehicle
                    </Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="goods-vehicle">Goods Vehicle</SelectItem>
                        <SelectItem value="passenger-vehicle">Passenger Vehicle</SelectItem>
                        <SelectItem value="mixed-use">Mixed Use</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Total payload
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.vehicleTotalPayload.value}
                        onChange={(e) => setFormData({
                          ...formData,
                          vehicleTotalPayload: { ...formData.vehicleTotalPayload, value: e.target.value }
                        })}
                        placeholder="0"
                        required
                        className="flex-1"
                      />
                      <Select
                        value={formData.vehicleTotalPayload.unit}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          vehicleTotalPayload: { ...formData.vehicleTotalPayload, unit: value }
                        })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="tonnes">tonnes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Loading capacity
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.vehicleLoadingCapacity.value}
                        onChange={(e) => setFormData({
                          ...formData,
                          vehicleLoadingCapacity: { ...formData.vehicleLoadingCapacity, value: e.target.value }
                        })}
                        placeholder="0"
                        required
                        className="flex-1"
                      />
                      <Select
                        value={formData.vehicleLoadingCapacity.unit}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          vehicleLoadingCapacity: { ...formData.vehicleLoadingCapacity, unit: value }
                        })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m³">m³</SelectItem>
                          <SelectItem value="ft³">ft³</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Max length</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.vehicleMaxLength.value}
                        onChange={(e) => setFormData({
                          ...formData,
                          vehicleMaxLength: { ...formData.vehicleMaxLength, value: e.target.value }
                        })}
                        placeholder="0"
                        className="flex-1"
                      />
                      <Select
                        value={formData.vehicleMaxLength.unit}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          vehicleMaxLength: { ...formData.vehicleMaxLength, unit: value }
                        })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="ft">ft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="vehicleMotorbikeCapacity" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Can you carry motorbikes in your vehicle, and if so, how many?
                    </Label>
                    <Select
                      value={formData.vehicleMotorbikeCapacity}
                      onValueChange={(value) => setFormData({ ...formData, vehicleMotorbikeCapacity: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No</SelectItem>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Do you have a tail lift?</Label>
                    <RadioGroup
                      value={formData.vehicleTailLift}
                      onValueChange={(value) => setFormData({ ...formData, vehicleTailLift: value })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="tailLiftYes" />
                        <Label htmlFor="tailLiftYes" className="cursor-pointer font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="tailLiftNo" />
                        <Label htmlFor="tailLiftNo" className="cursor-pointer font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Do you ever use a trailer to transport vehicles
                    </Label>
                    <RadioGroup
                      value={formData.vehicleTrailer}
                      onValueChange={(value) => setFormData({ ...formData, vehicleTrailer: value })}
                      required
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="trailerYes" />
                        <Label htmlFor="trailerYes" className="cursor-pointer font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="trailerNo" />
                        <Label htmlFor="trailerNo" className="cursor-pointer font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Payload</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.vehiclePayload.value}
                        onChange={(e) => setFormData({
                          ...formData,
                          vehiclePayload: { ...formData.vehiclePayload, value: e.target.value }
                        })}
                        placeholder="0"
                        className="flex-1"
                      />
                      <Select
                        value={formData.vehiclePayload.unit}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          vehiclePayload: { ...formData.vehiclePayload, unit: value }
                        })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="tonnes">tonnes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="after:content-['*'] after:ml-0.5 after:text-destructive">
                      Fuel type
                    </Label>
                    <RadioGroup
                      value={formData.vehicleFuelType}
                      onValueChange={(value) => setFormData({ ...formData, vehicleFuelType: value })}
                      required
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="petrol" id="petrol" />
                        <Label htmlFor="petrol" className="cursor-pointer font-normal">Petrol</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="diesel" id="diesel" />
                        <Label htmlFor="diesel" className="cursor-pointer font-normal">Diesel</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="lpg" id="lpg" />
                        <Label htmlFor="lpg" className="cursor-pointer font-normal">LPG</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hybrid" id="hybrid" />
                        <Label htmlFor="hybrid" className="cursor-pointer font-normal">Hybrid</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="electric" id="electric" />
                        <Label htmlFor="electric" className="cursor-pointer font-normal">Electric</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="submit"
                  disabled={updateVehicleMutation.isLoading}
                  className="px-8"
                >
                  {updateVehicleMutation.isLoading ? 'Saving...' : 'Save Vehicle'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default VehiclePage
