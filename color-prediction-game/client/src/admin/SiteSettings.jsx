import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSave, FaSpinner, FaImage, FaCog, FaFont } from 'react-icons/fa';
import { Card, Spinner } from 'react-bootstrap';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';

const SiteSettings = () => {
  const [settings, setSettings] = useState({
    siteName: '',
    logoUrl: '',
    faviconUrl: ''
  });
  
  const [originalSettings, setOriginalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLogo, setPreviewLogo] = useState('');
  
  // Load site settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);
  
  // Function to fetch site settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/site-settings`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.success) {
        const data = response.data.data;
        setSettings(data);
        setOriginalSettings(data);
        setPreviewLogo(data.logoUrl);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
      toast.error('Failed to load site settings', {
        position: "top-center"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value
    });
    
    // Update preview for logo
    if (name === 'logoUrl') {
      setPreviewLogo(value);
    }
  };
  
  // Function to save settings
  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/site-settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.success) {
        toast.success('Site settings updated successfully', {
          position: "top-center"
        });
        setOriginalSettings(settings);
      } else {
        toast.error(response.data.message || 'Failed to update settings', {
          position: "top-center"
        });
      }
    } catch (error) {
      console.error('Error saving site settings:', error);
      toast.error('Failed to save settings', {
        position: "top-center"
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Check if form has changes
  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };
  
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <Spinner animation="border" variant="primary" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }
  
  return (
    <div className="container py-4">
      <h2 className="mb-4 d-flex align-items-center">
        <FaCog className="mr-2" /> Site Settings
      </h2>
      
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">General Settings</h5>
        </Card.Header>
        <Card.Body>
          <form onSubmit={saveSettings}>
            {/* Site Name */}
            <div className="mb-3">
              <label className="form-label d-flex align-items-center">
                <FaFont className="mr-2" /> Site Name
              </label>
              <input
                type="text"
                className="form-control"
                name="siteName"
                value={settings.siteName}
                onChange={handleChange}
                placeholder="Enter site name"
                required
              />
              <small className="text-muted">
                This will be displayed in the header and browser title
              </small>
            </div>
            
            {/* Logo URL */}
            <div className="mb-3">
              <label className="form-label d-flex align-items-center">
                <FaImage className="mr-2" /> Logo URL
              </label>
              <input
                type="text"
                className="form-control"
                name="logoUrl"
                value={settings.logoUrl}
                onChange={handleChange}
                placeholder="Enter logo URL"
              />
              <small className="text-muted">
                Enter the URL for your site logo
              </small>
              
              {/* Logo Preview */}
              {previewLogo && (
                <div className="mt-2 p-2 border rounded text-center">
                  <p className="mb-1 text-muted">Logo Preview:</p>
                  <img 
                    src={previewLogo} 
                    alt="Logo Preview" 
                    style={{ maxHeight: '60px' }} 
                    onError={() => setPreviewLogo('/images/logo-placeholder.png')}
                  />
                </div>
              )}
            </div>
            
            {/* Favicon URL */}
            <div className="mb-3">
              <label className="form-label d-flex align-items-center">
                <FaImage className="mr-2" /> Favicon URL
              </label>
              <input
                type="text"
                className="form-control"
                name="faviconUrl"
                value={settings.faviconUrl}
                onChange={handleChange}
                placeholder="Enter favicon URL"
              />
              <small className="text-muted">
                Enter the URL for your site favicon (shown in browser tabs)
              </small>
            </div>
            
            {/* Submit Button */}
            <div className="d-flex justify-content-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !hasChanges()}
              >
                {saving ? (
                  <>
                    <FaSpinner className="fa-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SiteSettings;
