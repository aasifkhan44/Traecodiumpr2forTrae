import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import './App.css';
// HomePage Component
import HomePage from './components/HomePage';

// Auth Components
import Login from './auth/Login';
import Register from './auth/Register';

// User Components
import UserLayout from './user/UserLayout';
import Dashboard from './user/Dashboard';
// Removed duplicate import: import GamePage from './user/GamePage';
import Profile from './user/Profile';
import WalletRecharge from './user/WalletRecharge';
import Withdrawal from './user/Withdrawal';
import Transactions from './user/Transactions';
import Referrals from './user/Referrals';
import ReferralCommissions from './user/ReferralCommissions';

// Admin Components
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/Dashboard';
import UserManagement from './admin/UserManagement';
import AdminGameManagement from './admin/AdminGameManagement';
import GameHistory from './admin/GameHistory';
import Settings from './admin/Settings';
import AdminTransactions from './admin/Transactions';
import ReferralCommissionSettings from './admin/ReferralCommissionSettings';
import PaymentSettings from './admin/PaymentSettings';
import WithdrawalSettings from './admin/WithdrawalSettings';
import WithdrawalRequests from './admin/WithdrawalRequests';
import SmtpSettings from './admin/SmtpSettings';
import EmailTemplates from './admin/EmailTemplates';
import SiteSettings from './admin/SiteSettings';
import DepositRequests from './admin/DepositRequests';
import WingoResultManagement from './components/Admin/WingoResultManagement';
import AdminNummaResultManager from './admin/AdminNummaResultManager';

// Lazy-loaded game components
const WingoGame = lazy(() => import('./components/Games/Wingo/Wingo'));
const K3Game = lazy(() => import('./components/Games/K3/K3'));
const FiveDGame = lazy(() => import('./components/Games/5D/5D'));
const WingoTrxGame = lazy(() => import('./components/Games/WingoTrx/WingoTrx'));
const LudoGame = lazy(() => import('./components/Games/Ludo/Ludo'));
const ChessGame = lazy(() => import('./components/Games/Chess/Chess'));
const NummaGame = lazy(() => import('./components/Games/Numma/Numma'));
const FortuneWheelGame = lazy(() => import('./components/Games/FortuneWheel/FortuneWheel'));
import { toast, Toaster } from 'react-hot-toast';

import { AuthContext } from './contexts/AuthContext';

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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AuthContext.Provider value={{ 
  user: isAuthenticated ? { isAdmin: isAdmin } : null,
  loading: loading
}}>
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
                <Route path="/admin/games" element={<AdminGameManagement />} />
                <Route path="/admin/wingo-result-management" element={<WingoResultManagement />} />
                <Route path="/admin/numma-result-manager" element={<AdminNummaResultManager />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/transactions" element={<AdminTransactions />} />
                <Route path="/admin/referral-commission-settings" element={<ReferralCommissionSettings />} />
                <Route path="/admin/payment-settings" element={<PaymentSettings />} />
                <Route path="/admin/withdrawal-settings" element={<WithdrawalSettings />} />
                <Route path="/admin/withdrawal-requests" element={<WithdrawalRequests />} />
                <Route path="/admin/smtp-settings" element={<SmtpSettings />} />
                <Route path="/admin/email-templates" element={<EmailTemplates />} />
                <Route path="/admin/site-settings" element={<SiteSettings />} />
                <Route path="/admin/deposit-requests" element={<DepositRequests />} />
              </Route>
            ) : isAuthenticated ? (
              // User Routes
              <Route element={<UserLayout onLogout={handleLogout} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/wallet/recharge" element={<WalletRecharge />} />
                <Route path="/wallet/withdraw" element={<Withdrawal />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/referral-commissions" element={<ReferralCommissions />} />
                
                {/* Game Routes - dynamically loaded based on active games */}
                <Route path="/games/wingo" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading game...</div>}>
                    <WingoGame />
                  </Suspense>
                } />
                <Route path="/games/k3" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading game...</div>}>
                    <K3Game />
                  </Suspense>
                } />
                <Route path="/games/5d" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading game...</div>}>
                    <FiveDGame />
                  </Suspense>
                } />
                <Route path="/games/wingo-trx" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading game...</div>}>
                    <WingoTrxGame />
                  </Suspense>
                } />
                <Route path="/games/ludo" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading game...</div>}>
                    <LudoGame />
                  </Suspense>
                } />
                <Route path="/games/chess" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading game...</div>}>
                    <ChessGame />
                  </Suspense>
                } />
                <Route path="/games/numma" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading game...</div>}>
                    <NummaGame />
                  </Suspense>
                } />
                <Route path="/games/fortune-wheel" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading game...</div>}>
                    <FortuneWheelGame />
                  </Suspense>
                } />
                
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Route>
            ) : (
              // Redirect to login for any other route when not authenticated
              <Route path="*" element={<Navigate to="/login" />} />
            )}
          </Routes>
        </Router>
      </SiteSettingsProvider>
      <Toaster
        position="top-center"
        containerStyle={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        toastOptions={{
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          },
          success: {
            style: {
              background: '#E6F4F1',
              color: '#166534'
            }
          },
          error: {
            style: {
              background: '#FEE2E2',
              color: '#991B1B'
            }
          }
        }}
      />
    </AuthContext.Provider>
    </div>
  );
}

export default App;
