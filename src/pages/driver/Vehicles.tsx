import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Truck, Plus, ChevronRight } from 'lucide-react'
import { useDriverVehicles, useDeleteVehicle } from '@/hooks/useDriver'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useState } from 'react'
import { XCircle, CheckCircle2 } from 'lucide-react'

const VehiclesPage = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useDriverVehicles()
  const deleteVehicleMutation = useDeleteVehicle()
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Debug logging
  useEffect(() => {
    console.log('VehiclesPage - isLoading:', isLoading)
    console.log('VehiclesPage - error:', error)
    console.log('VehiclesPage - data:', data)
    if (error) {
      console.error('Error fetching vehicles:', error)
      console.error('Error details:', {
        message: (error as any)?.message,
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
        url: (error as any)?.config?.url,
      })
    }
    if (data) {
      console.log('Vehicles data received:', data)
      console.log('Vehicles count:', data?.vehicles?.length)
    }
  }, [error, data, isLoading])

  const vehicles = data?.vehicles || []

  const formatCategory = (category?: string) => {
    if (!category) return 'Unknown'
    return category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return
    }

    setDeletingId(id)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      await deleteVehicleMutation.mutateAsync(id)
      setSuccessMessage('Vehicle deleted successfully')
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to delete vehicle'
      setErrorMessage(errorMsg)
      setTimeout(() => setErrorMessage(''), 8000)
    } finally {
      setDeletingId(null)
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

  if (error) {
    const errorMessage = (error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load vehicles'
    return (
      <DashboardLayout role="driver">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">My Vehicles</h2>
          </div>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Vehicles</AlertTitle>
            <AlertDescription>
              {errorMessage}
              <br />
              <span className="text-xs mt-2 block">
                Status: {(error as any)?.response?.status || 'Unknown'} | 
                Check console for more details
              </span>
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">My Vehicles</h2>
            <p className="text-muted-foreground mt-1">
              Manage your vehicle fleet
            </p>
          </div>
          <Button onClick={() => navigate('/driver/vehicles/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
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

        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vehicles yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by adding your first vehicle to your fleet.
              </p>
              <Button onClick={() => navigate('/driver/vehicles/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Vehicle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <Card
                key={vehicle._id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/driver/vehicles/${vehicle._id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        {vehicle.vehicleMake} {vehicle.vehicleModel}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription>
                    {vehicle.vehicleRegistration}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{formatCategory(vehicle.vehicleCategory)}</span>
                    </div>
                    {vehicle.vehicleBaseLocation && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{vehicle.vehicleBaseLocation}</span>
                      </div>
                    )}
                    {vehicle.vehicleFuelType && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fuel:</span>
                        <span className="font-medium capitalize">{vehicle.vehicleFuelType}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/driver/vehicles/${vehicle._id}`)
                      }}
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(vehicle._id!)
                      }}
                      disabled={deletingId === vehicle._id}
                    >
                      {deletingId === vehicle._id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </Button>
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

export default VehiclesPage
