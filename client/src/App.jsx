import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ScanPage from './pages/ScanPage';
import ResultsPage from './pages/ResultsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="relative min-h-dvh">
          <div className="ambient-grid" />
          <div className="relative z-10 w-full min-h-dvh">
            <Routes>
              {/* Public */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected */}
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
              <Route path="/results/:scanId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
