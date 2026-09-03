import { useState } from 'react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react'

const BookService = () => {
  const [iframeHeight, setIframeHeight] = useState(800)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const increaseHeight = () => {
    setIframeHeight((prev) => Math.min(prev + 100, 1200))
  }

  const decreaseHeight = () => {
    setIframeHeight((prev) => Math.max(prev - 100, 400))
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Book Moving Service</h2>
          <p className="text-muted-foreground">
            Use the hour option calculator below to get an instant quote and book your moving service.
          </p>
        </div>

        {/* External Booking Link Card */}
        <Card>
          <CardHeader>
            <CardTitle>Prefer to Book Directly?</CardTitle>
            <CardDescription>
              You can also book directly on the Local Van website in a new tab
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <a
                href="https://local-van.com/instant-price/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Booking Page in New Tab
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Hour Option Calculator</CardTitle>
                <CardDescription>
                  Calculate your moving cost based on hours, men, and vans required
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decreaseHeight}
                  disabled={iframeHeight <= 400}
                  title="Decrease height"
                >
                  -
                </Button>
                <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                  {iframeHeight}px
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={increaseHeight}
                  disabled={iframeHeight >= 1200}
                  title="Increase height"
                >
                  +
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  title="Open in new tab"
                >
                  <a
                    href="https://local-van.com/instant-price/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Info */}
            {!isFullscreen && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <p className="font-medium mb-1">💡 Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Use the +/- buttons to resize the form height</li>
                  <li>Click the fullscreen icon for a better viewing experience</li>
                  <li>You can also open the form in a new tab if preferred</li>
                  <li>After booking, your booking will appear in "My Bookings"</li>
                </ul>
              </div>
            )}

            {/* Iframe Container */}
            <div
              className="relative w-full border rounded-lg overflow-hidden bg-background"
              style={{
                height: isFullscreen ? 'calc(100vh - 200px)' : `${iframeHeight}px`,
                transition: 'height 0.2s ease-in-out',
              }}
            >
              <iframe
                src="https://local-van.com/instant-price/"
                className="w-full h-full border-0"
                title="Local Van Instant Price Calculator"
                allow="payment; geolocation; microphone; camera"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                onLoad={() => setIsLoading(false)}
              />

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading booking form...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default BookService
