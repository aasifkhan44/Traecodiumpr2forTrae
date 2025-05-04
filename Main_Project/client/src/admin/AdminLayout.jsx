import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { FaBars } from 'react-icons/fa';

const adminNavItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Games', to: '/admin/games' },
  { label: 'Wingo Results', to: '/admin/wingo-result-management' },
  { label: 'Numma Result Manager', to: '/admin/numma-result-manager' },
  { label: 'Transactions', to: '/admin/transactions' },
  { label: 'Referral & Commission', to: '/admin/referral-commission-settings' },
  { label: 'Payment Settings', to: '/admin/payment-settings' },
  { label: 'Withdrawal Requests', to: '/admin/withdrawal-requests' },
  { label: 'Withdrawal Settings', to: '/admin/withdrawal-settings' },
  { label: 'Deposit Requests', to: '/admin/deposit-requests' },
  { label: 'Email Settings', to: '/admin/smtp-settings' },
  { label: 'Email Templates', to: '/admin/email-templates' },
  { label: 'Site Logo & Name', to: '/admin/site-settings' },
  { label: 'Settings', to: '/admin/settings' },
];

const AdminLayout = ({ onLogout }) => {
  const navigate = useNavigate();
  const { siteSettings } = useSiteSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleLogout = () => {
    if (typeof onLogout === 'function') onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Responsive Navbar */}
      <nav className="w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Logo and Site Name */}
          <div className="flex items-center gap-3">
            {siteSettings.logoUrl && (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.siteName || 'Logo'}
                className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 shadow"
                onError={e => (e.target.style.display = 'none')}
              />
            )}
            <span className="font-extrabold text-2xl tracking-tight text-primary dark:text-white drop-shadow-md">
              {siteSettings.siteName || 'Admin Panel'}
            </span>
          </div>
          {/* Mobile Hamburger (always visible) */}
          <div className="flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-2xl text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/60 rounded"
              aria-label="Open menu"
            >
              <FaBars />
            </button>
          </div>
        </div>
        {/* Mobile Sidebar Menu with Overlay */}
        {/* Sidebar appears from left, overlay covers rest. */}
        {menuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden animate-fade-in"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Sidebar */}
            <div className="fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col transform transition-transform duration-300 animate-slide-in">
              <div className="flex flex-col items-start px-4 py-6 gap-1 flex-1 overflow-y-auto">
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `w-full text-left px-3 py-2 rounded-md font-medium text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/60
                      ${isActive ? 'bg-primary text-white shadow-md' : 'text-gray-700 dark:text-gray-100 hover:bg-primary/10 hover:text-primary'}
                      ${isActive ? '' : 'cursor-pointer'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white font-semibold text-base shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </nav>
      <main className="max-w-7xl mx-auto p-4 w-full">
        <Outlet />
      </main>
      {/* Animations for fade and slide */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease; }
        @keyframes slide-in { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.25s cubic-bezier(.4,1.3,.5,1); }
      `}</style>
    </div>
  );
};

export default AdminLayout;
