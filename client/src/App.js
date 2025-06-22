import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import Login from './components/Login';
import RegisterUser from './components/RegisterUser';
import RegisterRecipient from './components/RegisterRecipient';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import EditProfile from './components/EditProfile';
import Donate from './components/Donate';
import DonateGoods from './components/DonateGoods';
import DonationManagement from './components/DonationManagement';
import SignTransactions from './components/SignTransactions';
import MyDonations from './components/MyDonations';
import RecipientDashboard from './components/RecipientDashboard';
import RecipientManagement from './components/RecipientManagement';
import RecipientDonations from './components/RecipientDonations';
import RecipientProfile from './components/RecipientProfile';
import RecipientAnalytics from './components/RecipientAnalytics';
import ChatbotPage from './components/ChatbotPage';
import SocialFeedPage from './components/SocialFeedPage';
import MyCertificates from './components/MyCertificates';
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import AdminAnalytics from './components/AdminAnalytics';
import './index.css';

function App() {
  return (
    <AuthProvider>
    <AptosWalletAdapterProvider
      autoConnect={true}
      network="testnet"
      onError={(error) => {
        console.error('Wallet error:', error);
      }}
    >
      <Router>
        <div className="App">
          <Navbar />
          <AppContent />
          <ConditionalFooter />
        </div>
      </Router>
    </AptosWalletAdapterProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const location = useLocation();
  
  return (
    <>
      <TransitionGroup>
        <CSSTransition
          key={location.key}
          timeout={300}
          classNames="page"
        >
          <main className="main-content">
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterUser />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/recipients" element={<RecipientManagement />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/donate" element={<Donate />} />
              <Route path="/donate/goods" element={<DonateGoods />} />
              <Route path="/admin/donations" element={<DonationManagement />} />
              <Route path="/admin/SignTransactions" element={<SignTransactions />} />
              <Route path="/mydonations" element={<MyDonations />} />
              <Route path="/recipient/register" element={<RegisterRecipient />} />
              <Route path="/recipient/dashboard" element={<RecipientDashboard />} />
              <Route path="/recipient/donations" element={<RecipientDonations />} />
              <Route path="/recipient/profile" element={<RecipientProfile />} />
              <Route path="/recipient/reports" element={<RecipientAnalytics />} />
              <Route path="/chatbot" element={<ChatbotPage />} />
              <Route path="/social-feed" element={<SocialFeedPage />} />
              <Route path="/certificates" element={<MyCertificates />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
            </Routes>
          </main>
        </CSSTransition>
      </TransitionGroup>
    </>
  );
}

function ConditionalFooter() {
  const location = useLocation();
  
  // Hide footer on chatbot page
  if (location.pathname === '/chatbot') {
    return null;
  }
  
  return <Footer />;
}

export default App; 