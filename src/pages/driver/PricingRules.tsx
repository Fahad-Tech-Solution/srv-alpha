import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, FileText, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { driverApi } from '@/api/driver'
import { authApi } from '@/api/auth'
import { formatDate } from '@/utils/format'

const PricingRulesPage = () => {
  const queryClient = useQueryClient()
  const { data: user } = useQuery('currentUser', authApi.getCurrentUser)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (user?.pricingRulesAccepted) {
      setAccepted(true)
    }
  }, [user])

  const acceptRulesMutation = useMutation(
    () => driverApi.acceptPricingRules(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('currentUser')
        setAccepted(true)
      },
    }
  )

  const handleAccept = async () => {
    if (accepted) return
    await acceptRulesMutation.mutateAsync()
  }

  const pricingRules = [
    'All pricing is based on the instant price calculator and is final once accepted.',
    'Drivers must accept the offered price before starting the job.',
    'Additional charges may apply for extra services (stairs, helpers, etc.) as agreed.',
    'Payment will be processed within 7-14 business days after job completion.',
    'Drivers are responsible for ensuring their vehicle meets job requirements.',
    'Any disputes must be raised within 24 hours of job completion.',
    'Cancellation fees may apply if driver cancels after accepting a job.',
    'Drivers must maintain valid insurance and documentation at all times.',
    'All jobs must be completed to customer satisfaction.',
    'Local Van reserves the right to adjust pricing based on actual job requirements.',
  ]

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Instant Pricing Rules</h2>
          <p className="text-muted-foreground">
            Please read and accept the pricing rules to continue
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pricing Terms & Conditions
            </CardTitle>
            <CardDescription>
              These rules govern how pricing works for jobs on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.pricingRulesAccepted ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    You have accepted the pricing rules on {formatDate(user.pricingRulesAcceptedAt)}
                  </p>
                </div>

                <div className="space-y-3">
                  {pricingRules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-sm">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {pricingRules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-sm">{rule}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="accept-rules"
                      checked={accepted}
                      onCheckedChange={(checked: boolean) => setAccepted(checked === true)}
                    />
                    <Label htmlFor="accept-rules" className="cursor-pointer">
                      I have read and accept the Instant Pricing Rules and Terms & Conditions
                    </Label>
                  </div>

                  <Button
                    onClick={handleAccept}
                    disabled={!accepted || acceptRulesMutation.isLoading}
                    className="mt-4 w-full"
                  >
                    {acceptRulesMutation.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      'Accept Pricing Rules'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default PricingRulesPage
