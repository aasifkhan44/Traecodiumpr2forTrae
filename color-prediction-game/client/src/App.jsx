import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';

// HomePage Component
import HomePage from './components/HomePage';

// Auth Components
import Login from './auth/Login';
import Register from './auth/Register';

// User Components
import UserLayout from './user/UserLayout';
import Dashboard from './user/Dashboard';
import GamePage from './user/GamePage';
import Profile from './user/Profile';
import WalletRecharge from './user/WalletRecharge';
import Transactions from './user/Transactions';
import Referrals from './user/Referrals';
import ReferralCommissions from './user/ReferralCommissions';

// Admin Components
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/Dashboard';
import UserManagement from './admin/UserManagement';
import GameHistory from './admin/GameHistory';
import Settings from './admin/Settings';
import AdminTransactions from './admin/Transactions';
import ReferralCommissionSettings from './admin/ReferralCommissionSettings';
import PaymentSettings from './admin/PaymentSettings';
import SmtpSettings from './admin/SmtpSettings';
import EmailTemplates from './admin/EmailTemplates';
import SiteSettings from './admin/SiteSettings';
import DepositRequests from './admin/DepositRequests';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      
      if (token) {
        setIsAuthenticated(true);
        setIsAdmin(adminStatus);
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
      
      setLoading(false);
    };
    
    // Check authentication when component mounts
    checkAuth();
    
    // Set up an interval to periodically check authentication status
    const authCheckInterval = setInterval(checkAuth, 5000);
    
    // Clean up the interval when component unmounts
    return () => clearInterval(authCheckInterval);
  }, []);
  
  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('countryCode');
    localStorage.removeItem('mobile');
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If still loading, show nothing (or could add a loading spinner here)
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return (
    <SiteSettingsProvider>
      <Router>
        <Routes>
          {/* Public routes that don't require authentication */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={isAuthenticated ? (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />) : <Login setIsAuthenticated={setIsAuthenticated} setIsAdmin={setIsAdmin} />} />
          <Route path="/register" element={isAuthenticated ? (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />) : <Register setIsAuthenticated={setIsAuthenticated} setIsAdmin={setIsAdmin} />} />
          
          {/* Protected routes */}
          {isAuthenticated && isAdmin ? (
            // Admin Routes
            <Route element={<AdminLayout onLogout={handleLogout} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/game-history" element={<GameHistory />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/transactions" element={<AdminTransactions />} />
              <Route path="/admin/referral-commission-settings" element={<ReferralCommissionSettings />} />
              <Route path="/admin/payment-settings" element={<PaymentSettings />} />
              <Route path="/admin/smtp-settings" element={<SmtpSettings />} />
              <Route path="/admin/email-templates" element={<EmailTemplates />} />
              <Route path="/admin/site-settings" element={<SiteSettings />} />
              <Route path="/admin/deposit-requests" element={<DepositRequests />} />
            </Route>
          ) : isAuthenticated ? (
            // User Routes
            <Route element={<UserLayout onLogout={handleLogout} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/wallet/recharge" element={<WalletRecharge />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/referral-commissions" element={<ReferralCommissions />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Route>
          ) : (
            // Redirect to login for any other route when not authenticated
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </Router>
    </SiteSettingsProvider>
  );
}

export default App;
