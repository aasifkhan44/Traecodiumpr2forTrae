import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';

// Full country code list
const fullCountryCodes = [
  { code: '+1', country: 'USA/Canada' },
  { code: '+7', country: 'Russia/Kazakhstan' },
  { code: '+20', country: 'Egypt' },
  { code: '+27', country: 'South Africa' },
  { code: '+30', country: 'Greece' },
  { code: '+31', country: 'Netherlands' },
  { code: '+32', country: 'Belgium' },
  { code: '+33', country: 'France' },
  { code: '+34', country: 'Spain' },
  { code: '+36', country: 'Hungary' },
  { code: '+39', country: 'Italy' },
  { code: '+40', country: 'Romania' },
  { code: '+41', country: 'Switzerland' },
  { code: '+43', country: 'Austria' },
  { code: '+44', country: 'UK' },
  { code: '+45', country: 'Denmark' },
  { code: '+46', country: 'Sweden' },
  { code: '+47', country: 'Norway' },
  { code: '+48', country: 'Poland' },
  { code: '+49', country: 'Germany' },
  { code: '+51', country: 'Peru' },
  { code: '+52', country: 'Mexico' },
  { code: '+53', country: 'Cuba' },
  { code: '+54', country: 'Argentina' },
  { code: '+55', country: 'Brazil' },
  { code: '+56', country: 'Chile' },
  { code: '+57', country: 'Colombia' },
  { code: '+58', country: 'Venezuela' },
  { code: '+60', country: 'Malaysia' },
  { code: '+61', country: 'Australia' },
  { code: '+62', country: 'Indonesia' },
  { code: '+63', country: 'Philippines' },
  { code: '+64', country: 'New Zealand' },
  { code: '+65', country: 'Singapore' },
  { code: '+66', country: 'Thailand' },
  { code: '+81', country: 'Japan' },
  { code: '+82', country: 'South Korea' },
  { code: '+84', country: 'Vietnam' },
  { code: '+86', country: 'China' },
  { code: '+90', country: 'Turkey' },
  { code: '+91', country: 'India' },
  { code: '+92', country: 'Pakistan' },
  { code: '+93', country: 'Afghanistan' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+95', country: 'Myanmar' },
  { code: '+98', country: 'Iran' },
  { code: '+212', country: 'Morocco' },
  { code: '+213', country: 'Algeria' },
  { code: '+216', country: 'Tunisia' },
  { code: '+218', country: 'Libya' },
  { code: '+220', country: 'Gambia' },
  { code: '+221', country: 'Senegal' },
  { code: '+222', country: 'Mauritania' },
  { code: '+223', country: 'Mali' },
  { code: '+224', country: 'Guinea' },
  { code: '+225', country: 'Ivory Coast' },
  { code: '+226', country: 'Burkina Faso' },
  { code: '+227', country: 'Niger' },
  { code: '+228', country: 'Togo' },
  { code: '+229', country: 'Benin' },
  { code: '+230', country: 'Mauritius' },
  { code: '+231', country: 'Liberia' },
  { code: '+232', country: 'Sierra Leone' },
  { code: '+233', country: 'Ghana' },
  { code: '+234', country: 'Nigeria' },
  { code: '+235', country: 'Chad' },
  { code: '+236', country: 'Central African Republic' },
  { code: '+237', country: 'Cameroon' },
  { code: '+238', country: 'Cape Verde' },
  { code: '+239', country: 'Sao Tome and Principe' },
  { code: '+240', country: 'Equatorial Guinea' },
  { code: '+241', country: 'Gabon' },
  { code: '+242', country: 'Congo' },
  { code: '+243', country: 'DR Congo' },
  { code: '+244', country: 'Angola' },
  { code: '+245', country: 'Guinea-Bissau' },
  { code: '+246', country: 'Diego Garcia' },
  { code: '+248', country: 'Seychelles' },
  { code: '+249', country: 'Sudan' },
  { code: '+250', country: 'Rwanda' },
  { code: '+251', country: 'Ethiopia' },
  { code: '+252', country: 'Somalia' },
  { code: '+253', country: 'Djibouti' },
  { code: '+254', country: 'Kenya' },
  { code: '+255', country: 'Tanzania' },
  { code: '+256', country: 'Uganda' },
  { code: '+257', country: 'Burundi' },
  { code: '+258', country: 'Mozambique' },
  { code: '+260', country: 'Zambia' },
  { code: '+261', country: 'Madagascar' },
  { code: '+262', country: 'Reunion' },
  { code: '+263', country: 'Zimbabwe' },
  { code: '+264', country: 'Namibia' },
  { code: '+265', country: 'Malawi' },
  { code: '+266', country: 'Lesotho' },
  { code: '+267', country: 'Botswana' },
  { code: '+268', country: 'Swaziland' },
  { code: '+269', country: 'Comoros' },
  { code: '+290', country: 'Saint Helena' },
  { code: '+291', country: 'Eritrea' },
  { code: '+297', country: 'Aruba' },
  { code: '+298', country: 'Faroe Islands' },
  { code: '+299', country: 'Greenland' },
];

const Register = ({ setIsAuthenticated, setIsAdmin, isModal }) => {
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+91',
    mobile: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  
  const countryCodes = fullCountryCodes;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { name, countryCode, mobile, password, confirmPassword, referralCode } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Make a real API call to the backend
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name, 
          countryCode, 
          mobile, 
          password,
          referralCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Registration failed');
      }
      
      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', 'false'); // New users are not admins by default
      localStorage.setItem('countryCode', countryCode);
      localStorage.setItem('mobile', mobile);
      
      setIsAuthenticated(true);
      setIsAdmin(false);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  const inputClass = `input ${isModal ? 'text-gray-900 placeholder-gray-400' : ''}`;

  return (
    isModal ? (
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6" style={{ color: 'red' }}>Register</h2>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Full Name
            </label>
            <input
              className={inputClass}
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={onChange}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mobile">
              Mobile Number
            </label>
            <div className="flex">
              <select
                className={`${inputClass} mr-2 w-1/3`}
                id="countryCode"
                name="countryCode"
                value={countryCode}
                onChange={onChange}
                required
              >
                {countryCodes.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code} ({country.country})
                  </option>
                ))}
              </select>
              <input
                className={`${inputClass} w-2/3`}
                type="tel"
                id="mobile"
                name="mobile"
                value={mobile}
                onChange={onChange}
                placeholder="Enter your mobile number"
                required
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className={inputClass}
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={onChange}
              placeholder="Enter your password"
              required
              minLength="6"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              className={inputClass}
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={onChange}
              placeholder="Confirm your password"
              required
              minLength="6"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="referralCode">
              Referral Code (Optional)
            </label>
            <input
              className={inputClass}
              type="text"
              id="referralCode"
              name="referralCode"
              value={referralCode}
              onChange={onChange}
              placeholder="Enter referral code if you have one"
            />
          </div>
          <div className="flex items-center justify-between mb-4">
            <button
              type="submit"
              className={`btn btn-primary w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </span>
              ) : (
                'Register'
              )}
            </button>
          </div>
          <p className="text-center text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80">
              Login
            </Link>
          </p>
        </form>
      </div>
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center text-primary mb-6">Register for Color Prediction Game</h2>
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
              <p>{error}</p>
            </div>
          )}
          <form onSubmit={onSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Full Name
              </label>
              <input
                className="input"
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={onChange}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mobile">
                Mobile Number
              </label>
              <div className="flex">
                <select
                  className="input mr-2 w-1/3"
                  id="countryCode"
                  name="countryCode"
                  value={countryCode}
                  onChange={onChange}
                  required
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.code} ({country.country})
                    </option>
                  ))}
                </select>
                <input
                  className="input w-2/3"
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={mobile}
                  onChange={onChange}
                  placeholder="Enter your mobile number"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                className="input"
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={onChange}
                placeholder="Enter your password"
                required
                minLength="6"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                className="input"
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={onChange}
                placeholder="Confirm your password"
                required
                minLength="6"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="referralCode">
                Referral Code (Optional)
              </label>
              <input
                className="input"
                type="text"
                id="referralCode"
                name="referralCode"
                value={referralCode}
                onChange={onChange}
                placeholder="Enter referral code if you have one"
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <button
                type="submit"
                className={`btn btn-primary w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </span>
                ) : (
                  'Register'
                )}
              </button>
            </div>
            
            <p className="text-center text-gray-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-primary/80">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    )
  );
};

export default Register;
