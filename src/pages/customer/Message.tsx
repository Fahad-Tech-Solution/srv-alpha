import { useState } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
import { useMutation } from 'react-query'
import { customerApi } from '@/api/customer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { XCircle } from 'lucide-react'

const MessagePage = () => {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string>('')

  const sendMessageMutation = useMutation(
    (data: { subject: string; message: string }) => customerApi.sendMessage(data),
    {
      onSuccess: () => {
        setSubmitted(true)
        setFormData({ subject: '', message: '' })
        setError('')
        setTimeout(() => setSubmitted(false), 5000)
      },
      onError: (error: any) => {
        setError(error?.response?.data?.message || 'Failed to send message. Please try again.')
      },
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.subject || !formData.message) return
    await sendMessageMutation.mutateAsync(formData)
  }

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Send Message</h2>
          <p className="text-muted-foreground">
            Send a message to info@local-van.com
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Support
            </CardTitle>
            <CardDescription>
              Your message will be sent to info@local-van.com
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Message Sent</AlertTitle>
                <AlertDescription>
                  Message sent successfully! We'll get back to you soon.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What is your message about?"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Type your message here..."
                    rows={8}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!formData.subject || !formData.message || sendMessageMutation.isLoading}
                  className="w-full"
                >
                  {sendMessageMutation.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default MessagePage
