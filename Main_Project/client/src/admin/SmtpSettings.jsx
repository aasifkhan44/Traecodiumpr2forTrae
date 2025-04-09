import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSave, FaEnvelope, FaServer, FaUser, FaLock, FaPortrait } from 'react-icons/fa';

// Use the environment variable or fallback to default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const SmtpSettings = () => {
  const [settings, setSettings] = useState({
    host: '',
    port: 587,
    secure: false,
    auth: {
      user: '',
      pass: ''
    },
    fromEmail: '',
    fromName: ''
  });
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please log in.');
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/admin/smtp-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching SMTP settings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load SMTP settings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('auth.')) {
      const authField = name.split('.')[1];
      setSettings(prev => ({
        ...prev,
        auth: {
          ...prev.auth,
          [authField]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : (name === 'port' ? parseInt(value, 10) : value)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!settings.host || !settings.port || !settings.auth.user || 
        !settings.auth.pass || !settings.fromEmail || !settings.fromName) {
      toast.error('All fields are required');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please log in.');
        return;
      }
      
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/smtp-settings`, 
        settings,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (res.data.success) {
        toast.success('SMTP settings saved successfully');
      }
    } catch (err) {
      console.error('Error saving SMTP settings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save SMTP settings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testSmtpConnection = async () => {
    // Check if SMTP settings have been saved
    if (!settings.host || !settings.port || !settings.auth.user || 
        !settings.auth.pass) {
      toast.error('Please enter SMTP server details before testing connection');
      return;
    }

    try {
      setIsTestingConnection(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please log in.');
        return;
      }
      
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/test-smtp-connection`,
        {}, // No body needed
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (res.data.success) {
        toast.success(`SMTP connection successful to ${res.data.smtp.host}:${res.data.smtp.port}`);
      } else {
        toast.error(res.data.message || 'Failed to connect to SMTP server');
      }
    } catch (err) {
      console.error('Error testing SMTP connection:', err);
      const errorMessage = err.response?.data?.message || 'Failed to test SMTP connection';
      toast.error(errorMessage);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    
    // Check if SMTP settings have been saved
    if (!settings.host || !settings.port || !settings.auth.user || 
        !settings.auth.pass || !settings.fromEmail || !settings.fromName) {
      toast.error('Please save SMTP settings before sending test email');
      return;
    }

    try {
      setIsTesting(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please log in.');
        return;
      }
      
      const res = await axios.post(`${API_BASE_URL}/api/admin/test-email`, 
        { email: testEmail },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (res.data.success) {
        toast.success('Test email sent successfully');
      } else {
        toast.error(res.data.message || 'Failed to send test email');
      }
    } catch (err) {
      console.error('Error sending test email:', err);
      const errorMessage = err.response?.data?.message || 'Failed to send test email';
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <FaEnvelope className="mr-2" /> SMTP Email Settings
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block mb-2 font-medium">SMTP Host</label>
            <input
              type="text"
              name="host"
              value={settings.host}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="smtp.example.com"
              required
            />
          </div>
          
          <div>
            <label className="block mb-2 font-medium">Port</label>
            <input
              type="number"
              name="port"
              value={settings.port}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="587"
              required
            />
          </div>
          
          <div>
            <label className="block mb-2 font-medium">Username</label>
            <input
              type="text"
              name="auth.user"
              value={settings.auth.user}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block mb-2 font-medium">Password</label>
            <input
              type="password"
              name="auth.pass"
              value={settings.auth.pass}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="********"
              required
            />
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="secure"
                checked={settings.secure}
                onChange={handleInputChange}
                className="mr-2"
              />
              Use SSL/TLS
            </label>
          </div>
          
          <div>
            <label className="block mb-2 font-medium">From Email</label>
            <input
              type="email"
              name="fromEmail"
              value={settings.fromEmail}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="noreply@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block mb-2 font-medium">From Name</label>
            <input
              type="text"
              name="fromName"
              value={settings.fromName}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Your App Name"
              required
            />
          </div>
        </div>
        
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Test Configuration</h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block mb-2 font-medium">Test Email Address</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="your@email.com"
              />
            </div>
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={isTesting || !testEmail}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {isTesting ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            type="button" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2" 
            disabled={isTestingConnection}
            onClick={testSmtpConnection}
          >
            {isTestingConnection ? (
              <span>Testing Connection...</span>
            ) : (
              <>
                <span>Test Connection</span>
              </>
            )}
          </button>
          <button 
            type="submit" 
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark flex items-center justify-center gap-2" 
            disabled={loading}
          >
            {loading ? (
              <span>Saving...</span>
            ) : (
              <>
                <FaSave />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SmtpSettings;
