import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="dot-spinner">
          <div className="dot-spinner__dot" />
          <div className="dot-spinner__dot" />
          <div className="dot-spinner__dot" />
          <div className="dot-spinner__dot" />
          <div className="dot-spinner__dot" />
          <div className="dot-spinner__dot" />
          <div className="dot-spinner__dot" />
          <div className="dot-spinner__dot" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
