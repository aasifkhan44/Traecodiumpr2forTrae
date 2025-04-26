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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            {siteSettings.logoUrl && (
              <img 
                src={siteSettings.logoUrl} 
                alt={siteSettings.siteName || 'Site Logo'} 
                className="h-8 mr-2"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <h1 className="text-xl font-bold text-primary">{siteSettings.siteName || 'User Dashboard'}</h1>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-200"
            onClick={toggleMobileMenu}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <NavLink 
              to="/dashboard" 
              className={({isActive}) => 
                `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaHome className="mr-2" /> Dashboard
            </NavLink>

            <NavLink 
              to="/profile" 
              className={({isActive}) => 
                `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaUser className="mr-2" /> Profile
            </NavLink>
            <NavLink 
              to="/wallet/recharge" 
              className={({isActive}) => 
                `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaWallet className="mr-2" /> Add Funds
            </NavLink>
            <NavLink 
              to="/transactions" 
              className={({isActive}) => 
                `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaHistory className="mr-2" /> Transactions
            </NavLink>
            <NavLink 
              to="/referrals" 
              className={({isActive}) => 
                `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <FaShareAlt className="mr-2" /> Referrals
            </NavLink>
            <button
              onClick={onLogout}
              className="flex items-center px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FaSignOutAlt className="mr-2" /> Logout
            </button>
          </nav>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 py-2">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <NavLink 
                to="/dashboard" 
                className={({isActive}) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
                }
                onClick={toggleMobileMenu}
              >
                <FaHome className="mr-2" /> Dashboard
              </NavLink>

              <NavLink 
                to="/profile" 
                className={({isActive}) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
                }
                onClick={toggleMobileMenu}
              >
                <FaUser className="mr-2" /> Profile
              </NavLink>
              <NavLink 
                to="/wallet/recharge" 
                className={({isActive}) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
                }
                onClick={toggleMobileMenu}
              >
                <FaWallet className="mr-2" /> Add Funds
              </NavLink>
              <NavLink 
                to="/transactions" 
                className={({isActive}) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
                }
                onClick={toggleMobileMenu}
              >
                <FaHistory className="mr-2" /> Transactions
              </NavLink>
              <NavLink 
                to="/referrals" 
                className={({isActive}) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
                }
                onClick={toggleMobileMenu}
              >
                <FaShareAlt className="mr-2" /> Referrals
              </NavLink>
              <button
                onClick={() => {
                  onLogout();
                  toggleMobileMenu();
                }}
                className="flex w-full items-center px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FaSignOutAlt className="mr-2" /> Logout
              </button>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 shadow mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
            {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default UserLayout;
