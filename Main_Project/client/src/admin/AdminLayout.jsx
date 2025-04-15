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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-secondary text-white py-4 shadow">
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
            <h1 className="text-xl font-bold">Admin Dashboard - {siteSettings.siteName || 'Color Prediction Game'}</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode} 
              className="text-white hover:text-gray-300"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
            </button>
            <button 
              onClick={() => {
                onLogout();
                navigate('/login');
              }}
              className="text-white hover:text-gray-300"
              title="Logout"
            >
              <FaSignOutAlt className="text-xl" />
            </button>
          </nav>
          
          {/* Mobile menu button */}
          <button 
            onClick={toggleMobileMenu} 
            className="md:hidden text-white"
          >
            <FaBars className="text-2xl" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - Always visible for admin */}
        <div className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-secondary text-white transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:relative md:translate-x-0
        `}>
          {/* Close button for mobile */}
          <div className="md:hidden flex justify-end p-4">
            <button onClick={toggleMobileMenu} className="text-white">
              <FaTimes className="text-2xl" />
            </button>
          </div>

          {/* Sidebar Content */}
          <nav className="mt-8">
            <ul className="space-y-2 px-4">
              <li>
                <NavLink 
                  to="/admin" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaHome className="mr-2" /> Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/users" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaUsers className="mr-2" /> Users
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/games" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaGamepad className="mr-2" /> Games
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/wingo-result-management" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaDice className="mr-2" /> Wingo Results
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/transactions" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaExchangeAlt className="mr-2" /> Transactions
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/referral-commission-settings" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaShareAlt className="mr-2" /> Referral & Commission
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/payment-settings" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaCreditCard className="mr-2" /> Payment Settings
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/withdrawal-requests" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaExchangeAlt className="mr-2" /> Withdrawal Requests
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/withdrawal-settings" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaMoneyBill className="mr-2" /> Withdrawal Settings
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/deposit-requests" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaMoneyBillWave className="mr-2" /> Deposit Requests
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/smtp-settings" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaEnvelope className="mr-2" /> Email Settings
                </NavLink>
              </li>

              <li>
                <NavLink 
                  to="/admin/email-templates" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaCode className="mr-2" /> Email Templates
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/site-settings" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaImage className="mr-2" /> Site Logo & Name
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/admin/settings" 
                  className={({isActive}) => 
                    `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-primary text-white' : 'text-white hover:bg-secondary'}`
                  }
                  onClick={toggleMobileMenu}
                >
                  <FaCog className="mr-2" /> Settings
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
