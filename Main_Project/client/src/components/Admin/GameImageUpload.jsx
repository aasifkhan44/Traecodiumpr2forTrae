import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const GameImageUpload = ({ gameIdentifier, imageType, currentImageUrl, onImageUpdate }) => {
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || '');
  const [loading, setLoading] = useState(false);

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should not exceed 5MB');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', imageType); // 'logo' or 'card'

      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/admin/games/${gameIdentifier}/image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data && response.data.success) {
        const imageUrl = response.data.data[imageType === 'logo' ? 'thumbnailUrl' : 'cardImageUrl'];
        setPreviewUrl(imageUrl);
        onImageUpdate(imageUrl);
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {imageType === 'logo' ? 'Game Logo' : 'Game Card'}
      </label>
      <div className="flex items-center space-x-4">
        <div className="relative">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`Game ${imageType}`}
              className="w-24 h-24 object-cover rounded-lg"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id={`${gameIdentifier}-${imageType}-upload`}
            disabled={loading}
          />
          <label
            htmlFor={`${gameIdentifier}-${imageType}-upload`}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {loading ? 'Uploading...' : 'Upload Image'}
          </label>
        </div>
      </div>
    </div>
  );
};

export default GameImageUpload;