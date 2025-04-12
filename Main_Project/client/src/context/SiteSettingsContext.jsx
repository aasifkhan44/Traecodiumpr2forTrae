import { createContext, useContext, useEffect, useState } from 'react';

export const SiteSettingsContext = createContext();

export const SiteSettingsProvider = ({ children }) => {
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    // Simulate API call to fetch site settings
    const fetchSettings = async () => {
      try {
        // In a real implementation, this would come from your API
        const mockSettings = {
          domain: window.location.hostname,
          referralLevels: 3,
          commissionRates: [10, 5, 2]
        };
        
        setSiteSettings(mockSettings);
      } catch (error) {
        console.error('Error loading site settings:', error);
      }
    };

    fetchSettings();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ siteSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => {
  return useContext(SiteSettingsContext);
};