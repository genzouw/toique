import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import RedirectIfAuthed from './components/RedirectIfAuthed';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Messages from './pages/Messages';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Forms from './pages/Forms';
import FormEdit from './pages/FormEdit';
import Submissions from './pages/Submissions';
import Help from './pages/Help';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/help" element={<Help />} />
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthed>
              <Signup />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/onboarding"
          element={
            <AuthGuard requireTenant={false} redirectIfTenantExists>
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
          <Route path="/forms" element={<Forms />} />
          <Route path="/forms/:id" element={<FormEdit />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route path="/messages" element={<Messages />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
