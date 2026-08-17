import { Navigate, Outlet } from 'react-router-dom';
import { getSession } from '../lib/auth';

export default function ProtectedRoute() {
  return getSession() ? <Outlet /> : <Navigate to="/login" replace />;
}
