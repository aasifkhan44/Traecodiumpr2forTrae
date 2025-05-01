import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FaHome, FaUser, FaHistory, FaShareAlt, FaSignOutAlt, FaUsers, FaWallet } from 'react-icons/fa';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

const UserLayout = ({ onLogout }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { siteSettings } = useSiteSettings();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="app-bg min-h-screen w-full">
      <header className="w-full bg-white dark:bg-gray-800 shadow">
        <div className="w-full flex justify-between items-center px-4 py-3 md:px-8">
          <div className="flex items-center">
            {siteSettings.logoUrl && (
              <img 
                src={siteSettings.logoUrl} 
                alt={siteSettings.siteName || 'Site Logo'} 
                className="h-8 mr-2 object-contain max-w-[120px] sm:max-w-[160px]"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <h1 className="text-lg sm:text-xl font-bold text-primary truncate max-w-[100px] sm:max-w-xs">{siteSettings.siteName || 'User Dashboard'}</h1>
          </div>
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-200 focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <NavLink 
              to="/dashboard" 
              className={({isActive}) => 
                `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaHome className="mr-1 sm:mr-2" /> Dashboard
            </NavLink>
            <NavLink 
              to="/profile" 
              className={({isActive}) => 
                `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaUser className="mr-1 sm:mr-2" /> Profile
            </NavLink>
            <NavLink 
              to="/wallet/recharge" 
              className={({isActive}) => 
                `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaWallet className="mr-1 sm:mr-2" /> Add Funds
            </NavLink>
            <NavLink 
              to="/transactions" 
              className={({isActive}) => 
                `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaHistory className="mr-1 sm:mr-2" /> Transactions
            </NavLink>
            <NavLink 
              to="/referrals" 
              className={({isActive}) => 
                `flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaShareAlt className="mr-1 sm:mr-2" /> Referrals
            </NavLink>
            {siteSettings && typeof siteSettings.userBalance === 'number' && (
              <div className="hidden md:flex items-center ml-4 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-100 to-green-100 border border-blue-200 text-blue-900 font-bold shadow text-base">
                <FaWallet className="mr-2" />
                {siteSettings.userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <button
              onClick={onLogout}
              className="flex items-center px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm sm:text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FaSignOutAlt className="mr-1 sm:mr-2" /> Logout
            </button>
          </nav>
        </div>
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay to close menu when clicking outside */}
            <div className="fixed inset-0 z-40" onClick={toggleMobileMenu} />
            <div className="fixed top-3 right-3 w-72 max-w-[95vw] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-2xl z-50 rounded-2xl border border-gray-200 dark:border-gray-700 animate-fade-in-up transition-all duration-300">
              <div className="flex justify-end pr-2 pt-2">
                <button onClick={toggleMobileMenu} aria-label="Close menu" className="rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                  <svg className="w-6 h-6 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-4 pt-2 pb-4 space-y-2">
                <NavLink 
                  to="/dashboard" 
                  className={({isActive}) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold shadow-sm transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 ring-2 ring-pink-300' : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 hover:scale-105'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaHome className="text-xl" /> Dashboard
                </NavLink>
                <NavLink 
                  to="/profile" 
                  className={({isActive}) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold shadow-sm transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 ring-2 ring-pink-300' : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 hover:scale-105'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaUser className="text-xl" /> Profile
                </NavLink>
                <NavLink 
                  to="/wallet/recharge" 
                  className={({isActive}) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold shadow-sm transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 ring-2 ring-pink-300' : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 hover:scale-105'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaWallet className="text-xl" /> Add Funds
                </NavLink>
                <NavLink 
                  to="/transactions" 
                  className={({isActive}) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold shadow-sm transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 ring-2 ring-pink-300' : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 hover:scale-105'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaHistory className="text-xl" /> Transactions
                </NavLink>
                <NavLink 
                  to="/referrals" 
                  className={({isActive}) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold shadow-sm transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 ring-2 ring-pink-300' : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 hover:scale-105'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaShareAlt className="text-xl" /> Referrals
                </NavLink>
                <button
                  onClick={() => {
                    onLogout();
                    toggleMobileMenu();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold shadow-sm bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-red-100/80 dark:hover:bg-red-900/50 hover:text-red-600 hover:scale-105 transition-all duration-200"
                >
                  <FaSignOutAlt className="text-xl" /> Logout
                </button>
              </div>
            </div>
          </>
        )}
      </header>
      {/* Wallet Balance - Mobile */}
      {siteSettings && typeof siteSettings.userBalance === 'number' && (
        <div className="flex md:hidden items-center mt-2 mb-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-100 to-green-100 border border-blue-200 text-blue-900 font-bold shadow text-base w-full justify-center">
          <FaWallet className="mr-2" />
          {siteSettings.userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col items-stretch px-2 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 shadow mt-auto w-full">
        <div className="w-full px-2 py-4 sm:px-4">
          <p className="text-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
            {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default UserLayout;
