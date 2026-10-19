import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ClientLogin from './client';
import ClientHome from './App';
import AdminLoginPage from './AdminLoginPage';
import AdminDashboard from './AdminDashboard';
import RequireAdmin from './RequireAdmin';

export default function RootApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientHome />} />
        <Route path="/login" element={<ClientLogin />} />
        <Route path="/home" element={<ClientHome />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
