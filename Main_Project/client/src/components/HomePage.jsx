import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import Login from '../auth/Login';
import Register from '../auth/Register';

const cardSvgs = [
  '/1.svg',
  '/2.svg',
  '/3.svg',
  '/4.svg',
];

const sliderImages = [
  '/p1.png',
  '/p2.png',
  '/p3.png',
  '/p4.png',
  '/p5.png',
];

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-gray-700">&times;</button>
        {children}
      </div>
    </div>
  );
}

const HomePage = () => {
  const { siteSettings } = useSiteSettings();
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const sliderRef = useRef(null);
  const jumping = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Close modal on successful login/register
  const handleSetIsAuthenticated = (val) => {
    setIsAuthenticated(val);
    // Always get isAdmin from localStorage after login
    if (val) {
      setModalOpen(false);
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      if (adminStatus) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };
  const handleSetIsAdmin = (val) => setIsAdmin(val);

  // Auto-advance (pause during jump)
  useEffect(() => {
    if (!isTransitioning) return;
    const interval = setInterval(() => {
      setCurrent((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [isTransitioning]);

  // Handle transition end for infinite loop
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const handleTransitionEnd = () => {
      if (current === sliderImages.length) {
        jumping.current = true;
        setIsTransitioning(false); // Disable transition for the jump
        setTimeout(() => {
          setCurrent(0); // Jump to first slide
        }, 20);
      }
    };
    slider.addEventListener('transitionend', handleTransitionEnd);
    return () => slider.removeEventListener('transitionend', handleTransitionEnd);
  }, [current]);

  // Re-enable transition after jump
  useEffect(() => {
    if (!isTransitioning && current === 0 && jumping.current) {
      setTimeout(() => {
        setIsTransitioning(true);
        jumping.current = false;
      }, 40);
    }
  }, [isTransitioning, current]);

  // Store referral code from URL param if present, but do NOT open modal automatically
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referralCode', ref);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in min-h-screen flex flex-col justify-center">
          {/* Header: perfectly aligned to card's padding and width */}
          <header className="w-full mb-10 px-0 sm:px-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
                {siteSettings.logoUrl && (
                  <img 
                    src={siteSettings.logoUrl} 
                    alt={siteSettings.siteName || 'Site Logo'} 
                    className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-xl shadow border border-blue-200 p-1 object-contain"
                  />
                )}
                <h1 className="text-xl sm:text-3xl font-bold text-white drop-shadow truncate w-full">{siteSettings.siteName || 'Color Prediction Game'}</h1>
              </div>
              {/* Removed login/register/dashboard button from header */}
            </div>
          </header>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
            <div className="flex mb-6">
              <button onClick={() => setActiveTab('login')} className={`flex-1 py-2 font-bold rounded-l ${activeTab==='login' ? 'bg-primary text-white' : 'bg-gray-100 text-primary'}`}>Login</button>
              <button onClick={() => setActiveTab('register')} className={`flex-1 py-2 font-bold rounded-r ${activeTab==='register' ? 'bg-primary text-white' : 'bg-gray-100 text-primary'}`}>Register</button>
            </div>
            {activeTab === 'login' ? (
              <Login setIsAuthenticated={handleSetIsAuthenticated} setIsAdmin={handleSetIsAdmin} isModal={true} inputClass="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow" />
            ) : (
              <Register setIsAuthenticated={handleSetIsAuthenticated} setIsAdmin={handleSetIsAdmin} isModal={true} inputClass="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow" />
            )}
          </Modal>
          <main>
            {/* Moved Login/Register or Dashboard button to top of main container */}
            <div className="w-full flex flex-col items-center gap-4 mb-10">
              {!isAuthenticated ? (
                <button 
                  onClick={() => setModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl font-bold shadow bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white border border-blue-200 transition hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                >
                  Login / Register
                </button>
              ) : (
                <button
                  className="w-full sm:w-auto px-5 py-2 rounded-xl font-bold shadow bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white border border-blue-200 transition hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Dashboard
                </button>
              )}
            </div>
            <div className="mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Welcome to the Ultimate Color Prediction Game
              </h2>
              <p className="text-xl mb-8">
                Predict colors, win rewards, and have fun! Join our growing community of players.
              </p>
              {/* Slider Section */}
              <div className="w-full max-w-2xl mx-auto mb-12 relative overflow-hidden h-64 flex items-center justify-center">
                <div
                  ref={sliderRef}
                  className={`flex h-full ${isTransitioning ? 'transition-transform duration-700 ease-in-out' : ''}`}
                  style={{ transform: `translateX(-${current * 100}%)` }}
                >
                  {sliderImages.concat(sliderImages[0]).map((src, idx) => (
                    <img
                      key={src + '-' + idx}
                      src={src}
                      alt={`Slide ${((idx)%sliderImages.length)+1}`}
                      className="object-contain h-full w-full flex-shrink-0 rounded-xl shadow-lg"
                      style={{ minWidth: '100%' }}
                    />
                  ))}
                </div>
                {/* Slider controls removed */}
              </div>
              {/* Play Now Button (Full Width) */}
              <div className="mt-0 w-full flex flex-col items-center">
                <button
                  className="block w-full px-8 py-4 bg-gradient-to-r from-yellow-400 to-pink-500 text-white text-2xl font-bold rounded-xl shadow-lg text-center hover:scale-105 transition-transform"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setActiveTab('login');
                      setModalOpen(true);
                    } else {
                      window.location.href = '/dashboard';
                    }
                  }}
                >
                  Play Now
                </button>
              </div>
              {/* SVG Cards Section */}
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                {cardSvgs.map((src, idx) => (
                  <div key={src} className="flex flex-col items-center aspect-square bg-transparent shadow-none p-0" style={{ minHeight: '144px', minWidth: '144px' }}>
                    <img 
                      src={src} 
                      alt={`Card ${idx+1}`} 
                      className="object-contain"
                      style={{ width: '96%', height: '96%' }}
                    />
                  </div>
                ))}
              </div>
              {/* How to Play section moved below */}
              <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm max-w-2xl mx-auto mt-12">
                <h3 className="text-2xl font-bold mb-4">How to Play</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-primary font-bold mr-3">1</span>
                    <div>
                      <h4 className="font-bold">Create an Account</h4>
                      <p>Register with your mobile number to get started.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-primary font-bold mr-3">2</span>
                    <div>
                      <h4 className="font-bold">Make a Prediction</h4>
                      <p>Choose a color for the next round.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-primary font-bold mr-3">3</span>
                    <div>
                      <h4 className="font-bold">Win Rewards</h4>
                      <p>Correct predictions earn you exciting rewards!</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </main>
          <footer className="mt-24 text-center w-full">
            <p> {new Date().getFullYear()} {siteSettings.siteName || 'Color Prediction Game'}. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
