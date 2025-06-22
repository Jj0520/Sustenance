import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './PasswordInput.css';

const PasswordInput = ({ value, onChange, name, placeholder, required, minLength }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-input-container">
      <input
        type={showPassword ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="password-input"
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
};

export default PasswordInput; 