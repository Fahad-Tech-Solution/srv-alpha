import { useState } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2 } from 'lucide-react'
import { useAdminDrivers } from '@/hooks/useAdmin'

const DriversPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useAdminDrivers({
    page,
    limit: 10,
    search: search || undefined,
  })

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Driver Management</h2>
          <p className="text-muted-foreground">View and manage all drivers</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Drivers</CardTitle>
            <CardDescription>Search and view driver information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {data?.drivers?.map((driver: any) => (
                    <div
                      key={driver._id}
                      className="p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{driver.name}</h3>
                            <Badge variant="default">Driver</Badge>
                            {!driver.isActive && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{driver.email}</p>
                          {driver.phone && (
                            <p className="text-sm text-muted-foreground">{driver.phone}</p>
                          )}
                          {driver.stats && (
                            <div className="mt-2 flex gap-4 text-sm">
                              <span className="text-muted-foreground">
                                <strong>Total Jobs:</strong> {driver.stats.totalJobs}
                              </span>
                              <span className="text-muted-foreground">
                                <strong>Completed:</strong> {driver.stats.completedJobs}
                              </span>
                              <span className="text-muted-foreground">
                                <strong>Active:</strong> {driver.stats.activeJobs}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default DriversPage

