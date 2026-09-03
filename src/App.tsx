import { HashRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ProtectedRoute } from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import DriverApplication from './pages/DriverApplication'
import FirstAccess from './pages/FirstAccess'
import AdminDashboard from './features/admin/AdminDashboard'
import CustomerDashboard from './features/customer/CustomerDashboard'
import DriverDashboard from './features/driver/DriverDashboard'
import BookService from './pages/customer/BookService'
import MyBookings from './pages/customer/MyBookings'
import BookingDetails from './pages/customer/BookingDetails'
import AdminUsers from './pages/admin/Users'
import AdminBookings from './pages/admin/Bookings'
import AdminDrivers from './pages/admin/Drivers'
import AdminDriverApplications from './pages/admin/DriverApplications'
import DriverJobs from './pages/driver/Jobs'
import DriverJobDetails from './pages/driver/JobDetails'
import DriverVehicle from './pages/driver/Vehicle'
import DriverVehicles from './pages/driver/Vehicles'
import DriverVehicleDetail from './pages/driver/VehicleDetail'
import DriverBankDetails from './pages/driver/BankDetails'
import DriverProfile from './pages/driver/Profile'
import DriverPricingRules from './pages/driver/PricingRules'
import DriverMessage from './pages/driver/Message'
import DriverAvailableJobs from './pages/driver/AvailableJobs'
import CustomerMessage from './pages/customer/Message'
import Settings from './pages/Settings'
import NotificationsPage from './pages/Notifications'

const queryClient = new QueryClient()

function App() {
  // HashRouter matches GitHub Pages deploy (.../Local-Van/#/...)
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/driver-application" element={<DriverApplication />} />
          <Route path="/first-access" element={<FirstAccess />} />
          
          {/* Admin Routes - Protected */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute requiredRole="admin">
              <AdminBookings />
            </ProtectedRoute>
          } />
          <Route path="/admin/drivers" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDrivers />
            </ProtectedRoute>
          } />
          <Route path="/admin/driver-applications" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDriverApplications />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute requiredRole="admin">
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute requiredRole="admin">
              <NotificationsPage />
            </ProtectedRoute>
          } />
          
          {/* Customer Routes - Protected */}
          <Route path="/customer" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/customer/book" element={
            <ProtectedRoute requiredRole="customer">
              <BookService />
            </ProtectedRoute>
          } />
          <Route path="/customer/bookings" element={
            <ProtectedRoute requiredRole="customer">
              <MyBookings />
            </ProtectedRoute>
          } />
          <Route path="/customer/bookings/:id" element={
            <ProtectedRoute requiredRole="customer">
              <BookingDetails />
            </ProtectedRoute>
          } />
          <Route path="/customer/message" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerMessage />
            </ProtectedRoute>
          } />
          <Route path="/customer/settings" element={
            <ProtectedRoute requiredRole="customer">
              <Settings />
            </ProtectedRoute>
          } />
          
          {/* Driver Routes - Protected */}
          <Route path="/driver" element={
            <ProtectedRoute requiredRole="driver">
              <DriverDashboard />
            </ProtectedRoute>
          } />
          <Route path="/driver/jobs" element={
            <ProtectedRoute requiredRole="driver">
              <DriverJobs />
            </ProtectedRoute>
          } />
          <Route path="/driver/jobs/:id" element={
            <ProtectedRoute requiredRole="driver">
              <DriverJobDetails />
            </ProtectedRoute>
          } />
          <Route path="/driver/available-jobs" element={
            <ProtectedRoute requiredRole="driver">
              <DriverAvailableJobs />
            </ProtectedRoute>
          } />
          <Route path="/driver/vehicle" element={
            <ProtectedRoute requiredRole="driver">
              <DriverVehicle />
            </ProtectedRoute>
          } />
          <Route path="/driver/vehicles" element={
            <ProtectedRoute requiredRole="driver">
              <DriverVehicles />
            </ProtectedRoute>
          } />
          <Route path="/driver/vehicles/new" element={
            <ProtectedRoute requiredRole="driver">
              <DriverVehicleDetail />
            </ProtectedRoute>
          } />
          <Route path="/driver/vehicles/:id" element={
            <ProtectedRoute requiredRole="driver">
              <DriverVehicleDetail />
            </ProtectedRoute>
          } />
          <Route path="/driver/bank-details" element={
            <ProtectedRoute requiredRole="driver">
              <DriverBankDetails />
            </ProtectedRoute>
          } />
          <Route path="/driver/profile" element={
            <ProtectedRoute requiredRole="driver">
              <DriverProfile />
            </ProtectedRoute>
          } />
          <Route path="/driver/pricing-rules" element={
            <ProtectedRoute requiredRole="driver">
              <DriverPricingRules />
            </ProtectedRoute>
          } />
          <Route path="/driver/message" element={
            <ProtectedRoute requiredRole="driver">
              <DriverMessage />
            </ProtectedRoute>
          } />
          <Route path="/driver/settings" element={
            <ProtectedRoute requiredRole="driver">
              <Settings />
            </ProtectedRoute>
          } />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App
