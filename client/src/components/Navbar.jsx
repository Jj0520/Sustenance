import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeLink, setActiveLink] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const path = location.pathname;
    setActiveLink(path === "/" ? "home" : path.slice(1));
    
    // Parse user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [location]);

  const handleLinkClick = (linkName) => {
    setActiveLink(linkName);
  };

  const handleLogout = () => {
    // Clear all auth-related data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Reset user state
    setUser(null);
    
    // Navigate to home page
    navigate('/');
  };

  const getUserName = () => {
    if (!user) return '';
    
    // Handle recipient user type
    if (user.userType === 'recipient') {
      return user.recipient?.ngo_name || 'NGO User';
    }
    
    // Handle donor/admin user type
    return user.user?.name || 'User';
  };

  // Check if user is a regular user (not admin or NGO)
  const isRegularUser = user && !user.userType && !user.user?.isAdmin;

  return (
    <nav className="navbar">
      <div className="logo">SUSTENANCE</div>
      <div className="menu">
        <Link
          to="/"
          className={activeLink === "home" ? "active" : ""}
          onClick={() => handleLinkClick("home")}
        >
          Home
        </Link>
        
        {user ? (
          <>
            <span className="user-greeting">Welcome,&nbsp;<strong>{getUserName()}</strong></span>
            {user && <Link
              to={user.userType === 'recipient' ? '/recipient/dashboard' : '/dashboard'}
              className={activeLink === "dashboard" ? "active" : ""}
              onClick={() => handleLinkClick("dashboard")}
            >
              Dashboard
            </Link>}
            {isRegularUser && (
              <Link
                to="/chatbot"
                className={activeLink === "chatbot" ? "active" : ""}
                onClick={() => handleLinkClick("chatbot")}
              >
                Chat Assistant
              </Link>
            )}
            <button 
              className="logout-btn" 
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className={activeLink === "login" ? "active" : ""}
              onClick={() => handleLinkClick("login")}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={activeLink === "register" ? "active" : ""}
              onClick={() => handleLinkClick("register")}
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
