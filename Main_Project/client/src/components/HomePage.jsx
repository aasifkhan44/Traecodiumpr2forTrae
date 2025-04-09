import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

const HomePage = () => {
  const { siteSettings } = useSiteSettings();

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
                onError={(e) => e.target.style.display = 'none'}
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

        <main className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Welcome to the Ultimate Color Prediction Game
            </h2>
            <p className="text-xl mb-8">
              Predict colors, win rewards, and have fun! Join our growing community of players.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/register" 
                className="px-8 py-3 bg-white text-primary text-lg font-medium rounded-md hover:bg-gray-100 transition-colors"
              >
                Get Started
              </Link>
              <Link 
                to="/login" 
                className="px-8 py-3 border-2 border-white text-white text-lg font-medium rounded-md hover:bg-white hover:text-primary transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
          <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm">
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
          <p>© {new Date().getFullYear()} {siteSettings.siteName || 'Color Prediction Game'}. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
