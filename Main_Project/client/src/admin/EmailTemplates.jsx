import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaSave, FaEnvelope, FaEdit, FaCode, FaTimes } from 'react-icons/fa';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import Editor from '@monaco-editor/react';
import api from '../utils/api';

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('welcome');
  const [formData, setFormData] = useState({
    subject: '',
    htmlContent: '',
    textContent: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');

  const templateTypes = [
    { name: 'welcome', label: 'Welcome Email' },
    { name: 'reset-password', label: 'Password Reset' },
    { name: 'notification', label: 'Notifications' },
    { name: 'transaction', label: 'Transactions' },
    { name: 'custom', label: 'Custom' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (templates.length > 0) {
      const currentTemplate = templates.find(t => t.name === activeTab);
      if (currentTemplate) {
        setFormData({
          subject: currentTemplate.subject,
          htmlContent: currentTemplate.htmlContent,
          textContent: currentTemplate.textContent || '',
          isActive: currentTemplate.isActive
        });
      }
    }
  }, [activeTab, templates]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/email-templates');
      if (res.data.success) {
        setTemplates(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditorChange = (value) => {
    setFormData(prev => ({
      ...prev,
      htmlContent: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.put(`/admin/email-templates/${activeTab}`, formData);
      
      if (res.data.success) {
        toast.success('Template saved successfully');
        fetchTemplates();
      }
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <FaEnvelope className="mr-2" /> Email Templates
      </h2>
      
      <Tabs selectedIndex={templateTypes.findIndex(t => t.name === activeTab)} 
            onSelect={index => setActiveTab(templateTypes[index].name)}>
        <TabList>
          {templateTypes.map(template => (
            <Tab key={template.name}>{template.label}</Tab>
          ))}
        </TabList>
        
        {templateTypes.map(template => (
          <TabPanel key={template.name}>
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="mb-4">
                <label className="block mb-2 font-medium">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Email subject"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-2 font-medium">HTML Content</label>
                <div className="border rounded overflow-hidden" style={{ height: '400px' }}>
                  <Editor
                    height="100%"
                    defaultLanguage="html"
                    value={formData.htmlContent}
                    onChange={handleEditorChange}
                    options={{ minimap: { enabled: false } }}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block mb-2 font-medium">Text Content (Optional)</label>
                <textarea
                  name="textContent"
                  value={formData.textContent}
                  onChange={handleChange}
                  className="w-full p-2 border rounded h-32"
                  placeholder="Plain text version"
                />
              </div>
              
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="mr-2"
                  id={`active-${template.name}`}
                />
                <label htmlFor={`active-${template.name}`}>Active</label>
              </div>
              
              <button
                type="button"
                onClick={handlePreview}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
              >
                <FaEdit className="mr-2" />
                Preview
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center ml-2"
              >
                <FaSave className="mr-2" />
                {loading ? 'Saving...' : 'Save Template'}
              </button>
            </form>
          </TabPanel>
        ))}
      </Tabs>
      
      {previewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-medium">Email Preview</h3>
              <button 
                onClick={() => setPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            
            <div className="p-4 border-b">
              <div className="flex space-x-2">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-3 py-1 rounded ${previewMode === 'desktop' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3 py-1 rounded ${previewMode === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                  Mobile
                </button>
                <button
                  onClick={() => setPreviewMode('html')}
                  className={`px-3 py-1 rounded ${previewMode === 'html' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                  HTML Source
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {previewMode === 'html' ? (
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
                  {formData.htmlContent}
                </pre>
              ) : (
                <div className={`${previewMode === 'mobile' ? 'max-w-md mx-auto' : ''}`}>
                  <div 
                    className="bg-white p-4 border rounded"
                    dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
