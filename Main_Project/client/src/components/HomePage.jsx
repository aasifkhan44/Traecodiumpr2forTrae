import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

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

const HomePage = () => {
  const { siteSettings } = useSiteSettings();
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const sliderRef = useRef(null);
  const jumping = useRef(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary text-white">
      <div className="container mx-auto px-4 py-16">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center">
            {siteSettings.logoUrl && (
              <img 
                src={siteSettings.logoUrl} 
                alt={siteSettings.siteName || 'Site Logo'} 
                className="h-12 mr-3"
                style={{background: '#fff', borderRadius: 8, padding: 2}}
              />
            )}
            <h1 className="text-3xl font-bold">{siteSettings.siteName || 'Color Prediction Game'}</h1>
          </div>
          <div className="flex space-x-4">
            <Link 
              to="/login" 
              className="px-6 py-2 bg-white text-primary font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              Login
            </Link>
            <Link 
              to="/register" 
              className="px-6 py-2 border-2 border-white text-white font-medium rounded-md hover:bg-white hover:text-primary transition-colors"
            >
              Register
            </Link>
          </div>
        </header>
        <main>
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
            <div className="mt-8">
              <Link
                to="/login"
                className="block w-full px-8 py-4 bg-gradient-to-r from-yellow-400 to-pink-500 text-white text-2xl font-bold rounded-xl shadow-lg text-center hover:scale-105 transition-transform"
              >
                Play Now
              </Link>
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
          </div>
          {/* How to Play section moved below */}
          <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm max-w-2xl mx-auto">
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
        </main>
        <footer className="mt-24 text-center">
          <p> {new Date().getFullYear()} {siteSettings.siteName || 'Color Prediction Game'}. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
