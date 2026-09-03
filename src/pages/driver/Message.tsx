import { useState } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
import { useMutation } from 'react-query'
import { driverApi } from '@/api/driver'

const MessagePage = () => {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const sendMessageMutation = useMutation(
    (data: { subject: string; message: string }) => driverApi.sendMessage(data),
    {
      onSuccess: () => {
        setSubmitted(true)
        setFormData({ subject: '', message: '' })
        setTimeout(() => setSubmitted(false), 5000)
      },
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.subject || !formData.message) return
    await sendMessageMutation.mutateAsync(formData)
  }

  return (
    <DashboardLayout role="driver">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Send Message</h2>
          <p className="text-muted-foreground">
            Send a message to info@local-van.com
          </p>
        </div>

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
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Message sent successfully! We'll get back to you soon.
                </p>
              </div>
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
