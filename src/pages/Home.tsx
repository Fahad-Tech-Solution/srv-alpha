import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const Home = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-5xl font-bold text-gray-900">
          Local Van
        </h1>
        <p className="text-xl text-gray-600">
          Your trusted moving service platform
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/register">Sign up</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Home

