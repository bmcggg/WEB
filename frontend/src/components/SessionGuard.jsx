import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { readUser } from '../services/api';

export default function SessionGuard({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    const expire = () => navigate('/login', { replace: true });
    const storage = () => { if (!readUser()?.id) expire(); };
    window.addEventListener('fella:session-expired', expire);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener('fella:session-expired', expire);
      window.removeEventListener('storage', storage);
    };
  }, [navigate]);
  return readUser()?.id ? children : <Navigate to="/login" replace />;
}
