import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Messages from './pages/Messages';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/onboarding"
          element={
            <AuthGuard requireTenant={false}>
              <Onboarding />
            </AuthGuard>
          }
        />
        <Route
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/messages" element={<Messages />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
