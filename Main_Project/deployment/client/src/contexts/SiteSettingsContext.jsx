import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { API_BASE_URL } from '../utils/api';

// Create the context
const SiteSettingsContext = createContext();

// Provider component
export const SiteSettingsProvider = ({ children }) => {
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'Color Prediction Game',
    logoUrl: '/images/logo.png',
    faviconUrl: '/favicon.ico'
  });
  const [loading, setLoading] = useState(true);
  
  // Fetch site settings on mount
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await api.get('/site-settings');
        if (response.data.success && response.data.data) {
          setSiteSettings(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching site settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSiteSettings();
  }, []);
  
  // Update document title when site name changes
  useEffect(() => {
    if (siteSettings.siteName) {
      document.title = siteSettings.siteName;
    }
    
    // Update favicon if provided
    if (siteSettings.faviconUrl) {
      const link = document.querySelector("link[rel~='icon']");
      if (link) {
        link.href = siteSettings.faviconUrl;
      }
    }
  }, [siteSettings]);
  
  return (
    <SiteSettingsContext.Provider value={{ siteSettings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

// Custom hook for using the site settings
export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};

export default SiteSettingsContext;
