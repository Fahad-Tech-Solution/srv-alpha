import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { driverApi } from '@/api/driver'
import { FileUpload } from '@/components/ui/file-upload'

const BankDetailsPage = () => {
  const queryClient = useQueryClient()
  const { data: user } = useQuery('currentUser', () => 
    import('@/api/auth').then(m => m.authApi.getCurrentUser())
  )
  
  const [formData, setFormData] = useState({
    accountName: '',
    accountNumber: '',
    sortCode: '',
    bankName: '',
    bankStatement: '',
  })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (user?.bankDetails) {
      setFormData({
        accountName: user.bankDetails.accountName || '',
        accountNumber: user.bankDetails.accountNumber || '',
        sortCode: user.bankDetails.sortCode || '',
        bankName: user.bankDetails.bankName || '',
        bankStatement: user.bankDetails.bankStatement || '',
      })
    }
  }, [user])

  const updateBankDetailsMutation = useMutation(
    (data: { bankDetails: typeof formData }) => driverApi.updateBankDetails(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('currentUser')
        setIsEditing(false)
      },
    }
  )

  const handleSave = async () => {
    await updateBankDetailsMutation.mutateAsync({ bankDetails: formData })
  }

  const handleCancel = () => {
    if (user?.bankDetails) {
      setFormData({
        accountName: user.bankDetails.accountName || '',
        accountNumber: user.bankDetails.accountNumber || '',
        sortCode: user.bankDetails.sortCode || '',
        bankName: user.bankDetails.bankName || '',
        bankStatement: user.bankDetails.bankStatement || '',
      })
    }
    setIsEditing(false)
  }

  const hasAllInfo =
    formData.accountName &&
    formData.accountNumber &&
    formData.sortCode &&
    formData.bankName

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bank Details</h2>
            <p className="text-muted-foreground">
              Provide your bank account details for payments
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              {hasAllInfo ? 'Edit' : 'Add Bank Details'}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
            <CardDescription>
              Your bank details are securely stored and only used for payment processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="accountName">Account Holder Name</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Full name as on bank account"
                  />
                </div>

                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="8 digits"
                    maxLength={8}
                  />
                </div>

                <div>
                  <Label htmlFor="sortCode">Sort Code</Label>
                  <Input
                    id="sortCode"
                    type="text"
                    value={formData.sortCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      const formatted = value.match(/.{1,2}/g)?.join('-') || value
                      setFormData({ ...formData, sortCode: formatted })
                    }}
                    placeholder="00-00-00"
                    maxLength={8}
                  />
                </div>

                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g., Barclays, HSBC, Lloyds"
                  />
                </div>

                <div>
                  <FileUpload
                    label="Bank Statement (Optional)"
                    description="Upload a recent bank statement for verification"
                    value={formData.bankStatement}
                    onChange={(url) => setFormData({ ...formData, bankStatement: url })}
                    accept="image/*,.pdf"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={updateBankDetailsMutation.isLoading}
                  >
                    {updateBankDetailsMutation.isLoading ? 'Saving...' : 'Save Bank Details'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Account Holder Name</Label>
                    <p className="mt-1 font-medium">
                      {formData.accountName || <span className="text-muted-foreground italic">Not provided</span>}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Bank Name</Label>
                    <p className="mt-1 font-medium">
                      {formData.bankName || <span className="text-muted-foreground italic">Not provided</span>}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Account Number</Label>
                    <p className="mt-1 font-medium">
                      {formData.accountNumber ? '••••' + formData.accountNumber.slice(-4) : <span className="text-muted-foreground italic">Not provided</span>}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Sort Code</Label>
                    <p className="mt-1 font-medium">
                      {formData.sortCode || <span className="text-muted-foreground italic">Not provided</span>}
                    </p>
                  </div>

                  {formData.bankStatement && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Bank Statement</Label>
                      <p className="mt-1">
                        <a href={formData.bankStatement} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View Statement
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {hasAllInfo && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Bank details have been provided. You can receive payments.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default BankDetailsPage
