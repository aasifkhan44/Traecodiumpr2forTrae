import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const CommissionSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    level: '',
    percentage: '',
    description: '',
    isActive: true
  });

  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const { level, percentage, description, isActive } = formData;

  // Fetch commission settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch all commission settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/commission-settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      } else {
        setError(data.message || 'Failed to fetch commission settings');
      }
    } catch (err) {
      setError('Server error while fetching commission settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const onChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  // Handle form submission (create/update)
  const onSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await fetch('http://localhost:5000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          level: parseInt(level),
          percentage: parseFloat(percentage),
          description,
          isActive
        })
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setFormData({
          level: '',
          percentage: '',
          description: '',
          isActive: true
        });
        setIsEditing(false);
        setCurrentId(null);
        
        // Refresh settings list
        fetchSettings();
      } else {
        setError(data.message || 'Failed to save commission setting');
      }
    } catch (err) {
      setError('Server error while saving commission setting');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Edit an existing commission setting
  const onEdit = (setting) => {
    setFormData({
      level: setting.level.toString(),
      percentage: setting.percentage.toString(),
      description: setting.description,
      isActive: setting.isActive
    });
    setIsEditing(true);
    setCurrentId(setting._id);
  };

  // Delete a commission setting
  const onDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this commission setting?')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost:5000/api/commission-settings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Refresh settings list
        fetchSettings();
      } else {
        setError(data.message || 'Failed to delete commission setting');
      }
    } catch (err) {
      setError('Server error while deleting commission setting');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-6">Commission Settings</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Form for Adding/Editing Commission Settings */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? 'Edit Commission Setting' : 'Add New Commission Level'}
        </h3>
        
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="level">
                Level
              </label>
              <input
                className="input"
                type="number"
                id="level"
                name="level"
                value={level}
                onChange={onChange}
                placeholder="Enter level number (1-10)"
                required
                min="1"
                max="10"
                disabled={isEditing}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="percentage">
                Commission Percentage
              </label>
              <input
                className="input"
                type="number"
                id="percentage"
                name="percentage"
                value={percentage}
                onChange={onChange}
                placeholder="Enter commission percentage"
                required
                step="0.01"
                min="0"
                max="100"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Description
              </label>
              <input
                className="input"
                type="text"
                id="description"
                name="description"
                value={description}
                onChange={onChange}
                placeholder="Enter a description for this commission level"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={isActive}
                onChange={onChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label className="ml-2 block text-gray-700 text-sm font-bold" htmlFor="isActive">
                Active
              </label>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              className="btn btn-primary mr-2"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Update Setting' : 'Add Setting'}
            </button>
            
            {isEditing && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setFormData({
                    level: '',
                    percentage: '',
                    description: '',
                    isActive: true
                  });
                  setIsEditing(false);
                  setCurrentId(null);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Commission Settings List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Current Commission Levels</h3>
        
        {loading && <p>Loading...</p>}
        
        {!loading && settings.length === 0 ? (
          <p>No commission settings found. Create your first commission level above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">Level</th>
                  <th className="py-3 px-4 text-left">Percentage</th>
                  <th className="py-3 px-4 text-left">Description</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {settings.map((setting) => (
                  <tr key={setting._id}>
                    <td className="py-3 px-4">{setting.level}</td>
                    <td className="py-3 px-4">{setting.percentage}%</td>
                    <td className="py-3 px-4">{setting.description}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${setting.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {setting.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="text-blue-500 hover:text-blue-700 mr-2"
                        onClick={() => onEdit(setting)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => onDelete(setting._id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionSettings;
