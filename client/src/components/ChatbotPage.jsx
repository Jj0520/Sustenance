import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BackToDashboard from './BackToDashboard';
import './ChatbotPage.css';

const ChatbotPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([{
    type: 'bot',
    content: "Hey! I'm Sora 👋 Need help with donations or have questions about the platform? Just ask!"
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef(null);

  // Check user authentication and type
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);
    // Redirect if user is admin or NGO
    if (user.userType === 'recipient' || user.user?.isAdmin) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Prevent body scrolling when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // Cleanup: restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get user data and token from localStorage
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const token = user?.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Convert messages to history format expected by backend
      const history = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await axios.post('http://localhost:5001/api/chat', {
        message: inputMessage,
        history: history
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const botMessage = {
        type: 'bot',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Handle authentication errors specifically
      if (error.response?.status === 401) {
        const errorMessage = {
          type: 'bot',
          content: "Looks like your session expired. Please log in again to continue chatting with me!",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        // Optionally redirect to login after a delay
        setTimeout(() => navigate('/login'), 3000);
      } else {
        const errorMessage = {
          type: 'bot',
          content: "Oops! Something went wrong on my end. Mind trying that again?",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="chatbot-page">
      <div className="back-to-dashboard-wrapper">
        <BackToDashboard />
      </div>
      <div className="chatbot-container">
        <div className="chat-header">
          <h2>Chat with <span className="sora-name">Sora</span></h2>
          <p>Your friendly donation assistant</p>
        </div>
        
        <div 
          className="messages-container" 
          ref={messagesContainerRef}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.type === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-content">
                {message.content}
                {message.timestamp && (
                  <span className="message-time">
                    {formatTime(message.timestamp)}
                  </span>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot-message">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="input-container">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask Sora anything..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !inputMessage.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatbotPage; 