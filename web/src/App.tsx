import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DownloadProvider } from './contexts/DownloadContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext'; // Added import
import Layout from './components/Layout';
import Home from './pages/Home';
import SourceDetail from './pages/SourceDetail';
import ComicDetail from './pages/ComicDetail';
import Reader from './pages/Reader';
import Login from './pages/Login';
import Register from './pages/Register';
import History from './pages/History';
import Library from './pages/Library';
import Search from './pages/Search';
import Settings from './pages/Settings';
import EditProfile from './pages/EditProfile';
import Notifications from './pages/Notifications';
import Downloads from './pages/Downloads';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

// New AppContent component to hold the Toaster and Routes
const AppContent = () => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#2c2c2c',
            color: '#fff',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#f97316',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate replace to="/home" />} />
          <Route path="home" element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/profile" element={<EditProfile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="downloads" element={<Downloads />} />
        </Route>

        {/* Full Screen Pages also protected */}
        <Route path="/search/:sourceId" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/source/:sourceId" element={<ProtectedRoute><SourceDetail /></ProtectedRoute>} />
        <Route path="/comic/:sourceId/:slug" element={<ProtectedRoute><ComicDetail /></ProtectedRoute>} />
        <Route path="/read/:sourceId/:slug/:chapterId" element={<ProtectedRoute><Reader /></ProtectedRoute>} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <DownloadProvider>
            <NotificationProvider>
              <Router>
                <AppContent />
              </Router>
            </NotificationProvider>
          </DownloadProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
