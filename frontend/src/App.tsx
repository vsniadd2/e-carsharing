import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import CookieConsent from './components/CookieConsent'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ContentPage from './pages/ContentPage'
import TariffsPage from './pages/TariffsPage'
import RewardsPage from './pages/RewardsPage'
import SupportPage from './pages/SupportPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/tariffs" element={<TariffsPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/:slug" element={<ContentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CookieConsent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
