import { useState } from 'react';
import { Link } from 'react-router-dom';

const Register = ({ setIsAuthenticated, setIsAdmin }) => {
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+91',
    mobile: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  
  // List of common country codes
  const countryCodes = [
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+91', country: 'India' },
    { code: '+86', country: 'China' },
    { code: '+971', country: 'UAE' },
    { code: '+65', country: 'Singapore' },
    { code: '+61', country: 'Australia' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+81', country: 'Japan' },
  ];

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
      const response = await fetch('http://localhost:5000/api/auth/register', {
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

  return (
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
  );
};

export default Register;
