import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { 
  FaHome, 
  FaUsers, 
  FaGamepad, 
  FaHistory, 
  FaCog, 
  FaBars, 
  FaTimes, 
  FaSun, 
  FaMoon, 
  FaSignOutAlt, 
  FaExchangeAlt, 
  FaShareAlt,
  FaCreditCard,
  FaEnvelope,
  FaCode,
  FaImage,
  FaMoneyBillWave,
  FaUserFriends,
  FaGlobe,
  FaMoneyBill,
  FaDice
} from 'react-icons/fa';

const AdminLayout = ({ onLogout }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { siteSettings } = useSiteSettings();

  console.log('AdminLayout rendered');
  console.log('Current navigation links:', [
    '/admin',
    '/admin/users',
    '/admin/games',
    '/admin/transactions',
    '/admin/referral-settings',
    '/admin/commission-settings',
    '/admin/payment-settings',
    '/admin/settings',
    '/admin/smtp-settings',
    '/admin/email-templates'
  ]);

  // Log localStorage admin status
  useEffect(() => {
    const isAdminStatus = localStorage.getItem('isAdmin');
    console.log('Is Admin from localStorage:', isAdminStatus);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
      {/* Header */}
      <header className="bg-secondary text-white py-3 shadow w-full sticky top-0 z-40">
        <div className="w-full flex justify-between items-center px-4 md:px-8">
          <div className="flex items-center gap-2">
            {siteSettings.logoUrl && (
              <img 
                src={siteSettings.logoUrl} 
                alt={siteSettings.siteName || 'Site Logo'} 
                className="h-10 w-auto mr-2 object-contain max-w-[120px] sm:max-w-[160px] rounded-lg bg-white p-1 shadow-md"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <h1 className="text-lg sm:text-xl font-bold truncate max-w-[100px] sm:max-w-xs drop-shadow-md">Admin Dashboard - {siteSettings.siteName || 'Color Prediction Game'}</h1>
          </div>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <button 
              onClick={toggleDarkMode} 
              className="text-white hover:text-yellow-300 text-base sm:text-lg transition-colors duration-200"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
            </button>
            <button 
              onClick={() => {
                onLogout();
                navigate('/login');
              }}
              className="text-white hover:text-red-400 text-base sm:text-lg transition-colors duration-200"
              title="Logout"
            >
              <FaSignOutAlt className="text-xl" />
            </button>
          </nav>
          {/* Mobile menu button */}
          <button 
            onClick={toggleMobileMenu} 
            className="md:hidden text-white focus:outline-none"
            aria-label="Open menu"
          >
            <FaBars className="text-2xl" />
          </button>
        </div>
      </header>
      <div className="flex flex-1 w-full">
        {/* Sidebar - Always visible for admin */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-secondary via-secondary/95 to-gray-900 text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl md:shadow-none`}>
          {/* Close button for mobile */}
          <div className="md:hidden flex justify-end p-4">
            <button onClick={toggleMobileMenu} className="text-white">
              <FaTimes className="text-2xl" />
            </button>
          </div>
          {/* Sidebar Content */}
          <nav className="mt-8">
            <ul className="space-y-1 md:space-y-2 px-1 sm:px-2 md:px-0 w-64 overflow-hidden">
              <li>
                <NavLink 
                  to="/admin" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaHome className="mr-1 sm:mr-2" /> Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/users" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaUsers className="mr-1 sm:mr-2" /> Users
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/games" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaGamepad className="mr-1 sm:mr-2" /> Games
                </NavLink>
              </li>
              <li className="group relative">
                <button
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-left hover:bg-secondary focus:outline-none focus:bg-secondary text-sm sm:text-base"
                  type="button"
                >
                  <FaDice className="mr-1 sm:mr-2" />
                  Result
                  <svg className="ml-2 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 111.04 1.08l-4.25 3.85a.75.75 0 01-1.04 0l-4.25-3.85a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                <ul className="absolute left-0 mt-1 w-56 bg-secondary text-white rounded shadow-lg z-50 hidden group-hover:block group-focus-within:block">
                  <li>
                    <NavLink
                      to="/admin/wingo-result-management"
                      className={({ isActive }) => `block px-4 py-2 hover:bg-primary rounded text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                      style={{maxWidth:'16rem'}}
                      onClick={toggleMobileMenu}
                    >
                      Wingo Results
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/numma-result-manager"
                      className={({ isActive }) => `block px-4 py-2 hover:bg-primary rounded text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                      style={{maxWidth:'16rem'}}
                      onClick={toggleMobileMenu}
                    >
                      Numma Result Manager
                    </NavLink>
                  </li>
                </ul>
              </li>
              <li>
                <NavLink 
                  to="/admin/transactions" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaExchangeAlt className="mr-1 sm:mr-2" /> Transactions
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/referral-commission-settings" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaShareAlt className="mr-1 sm:mr-2" /> Referral & Commission
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/payment-settings" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaCreditCard className="mr-1 sm:mr-2" /> Payment Settings
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/withdrawal-requests" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaExchangeAlt className="mr-1 sm:mr-2" /> Withdrawal Requests
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/withdrawal-settings" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaMoneyBill className="mr-1 sm:mr-2" /> Withdrawal Settings
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/deposit-requests" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaMoneyBillWave className="mr-1 sm:mr-2" /> Deposit Requests
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/smtp-settings" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaEnvelope className="mr-1 sm:mr-2" /> Email Settings
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/email-templates" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaCode className="mr-1 sm:mr-2" /> Email Templates
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/site-settings" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaImage className="mr-1 sm:mr-2" /> Site Logo & Name
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/settings" 
                  className={({isActive}) => `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/60 md:ring-0 md:shadow-none md:bg-primary/90 z-10' : 'text-white hover:bg-secondary/80'} overflow-hidden`} 
                  style={{maxWidth:'16rem'}}
                  onClick={toggleMobileMenu}
                >
                  <FaCog className="mr-1 sm:mr-2" /> Settings
                </NavLink>
              </li>
              <li className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onLogout === 'function') onLogout();
                    navigate('/login');
                  }}
                  className="flex items-center px-3 py-2 rounded-md text-base hover:bg-red-500/80 transition-colors duration-200 w-full text-left"
                  title="Logout"
                >
                  <FaSignOutAlt className="mr-2" /> Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
        {/* Main Content */}
        <div className="flex-1 overflow-auto w-full px-2 py-4 sm:px-4 sm:py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
