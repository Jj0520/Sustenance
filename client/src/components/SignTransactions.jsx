import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos } from "@aptos-labs/ts-sdk";
import './SignTransactions.css';
import { MODULE_ADDRESS } from '../constants';
import { toast } from 'react-toastify';
import { buildApiUrl } from '../../config/api';

const SignTransactions = () => {
  const [approvedDonations, setApprovedDonations] = useState([]);
  const [approvedMonetaryDonations, setApprovedMonetaryDonations] = useState([]);
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('goods'); // 'goods' or 'monetary'
  const navigate = useNavigate();
  const { connected, account, connect, disconnect, wallet, wallets } = useWallet();
  const { token } = useContext(AuthContext);

  // Initialize Aptos Client
  const client = new Aptos();

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (typeof window.aptos !== 'undefined') {
          // Check if wallet was previously connected
          const isConnected = await window.aptos.isConnected();
          console.log('Wallet connection status:', isConnected);
          
          if (isConnected) {
            const acc = await window.aptos.account();
            console.log('Connected account:', acc);
            setConnectedAccount(acc);
          } else {
            // Try to reconnect if wallet exists
            try {
              await window.aptos.connect();
              const acc = await window.aptos.account();
              console.log('Auto-reconnected account:', acc);
              setConnectedAccount(acc);
            } catch (error) {
              console.log('Auto-reconnect failed:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkWalletConnection();
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetchSignableDonations();
  }, [navigate]);

  const fetchSignableDonations = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/signable-donations'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      // Separate goods and monetary donations
      const goodsDonations = data.filter(donation => donation.donation_type !== 'money');
      const monetaryDonations = data.filter(donation => donation.donation_type === 'money');
      setApprovedDonations(goodsDonations);
      setApprovedMonetaryDonations(monetaryDonations);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleReject = async (donation) => {
    console.log('Reject button clicked!');
    try {
      const response = await fetch(buildApiUrl(`/api/admin/donations/${donation.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (!response.ok) {
        throw new Error('Failed to reject donation');
      }

      // Refresh the donations list
      fetchSignableDonations();
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };

  // Regular signing for goods donations (existing functionality)
  const handleStatusChange = async (donation, newStatus) => {
    console.log('Approve button clicked for goods donation!');
    
    try {
      if (!window.aptos) {
        console.log('Petra wallet not found');
        alert("Please connect your wallet first!");
        return;
      }

      const isConnected = await window.aptos.isConnected();
      if (!isConnected) {
        alert("Please connect your wallet first!");
        return;
      }

      const messageContent = JSON.stringify({
        donationId: donation.id.toString(),
        donor: donation.user_name,
        itemType: donation.item_type,
        quantity: donation.quantity.toString(),
        status: newStatus,
        timestamp: Date.now()
      });

      const transaction = {
        arguments: [messageContent],
        function: `0xc13e62a4b2451363bd7f23ff81a19f26bd8a4b5a99794265e17592d7f3282876::custom_indexer_ex_message_board::create_message`,
        type: "entry_function_payload",
        type_arguments: []
      };

      console.log('Transaction payload:', transaction);
      const pendingTransaction = await window.aptos.signAndSubmitTransaction(transaction);
      console.log('Transaction submitted:', pendingTransaction);

      // Update this part to use the direct route
      const updateResponse = await fetch(buildApiUrl('/api/donations/direct-update-hash'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: donation.id,
          transactionHash: pendingTransaction.hash,
          donation_type: 'goods'
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update transaction hash in database');
      }

      fetchSignableDonations();

    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };

  // Blind signing for monetary donations (new functionality)
  const handleBlindSign = async (donation, newStatus) => {
    console.log('Blind sign for monetary donation!');
    
    try {
      if (!window.aptos) {
        console.log('Petra wallet not found');
        alert("Please connect your wallet first!");
        return;
      }

      const isConnected = await window.aptos.isConnected();
      if (!isConnected) {
        alert("Please connect your wallet first!");
        return;
      }

      // Create blind transaction - only includes donation ID and timestamp, no amount
      const blindMessageContent = JSON.stringify({
        donationId: donation.id.toString(),
        donor: donation.user_name,
        recipient: donation.recipient_name || 'NGO',
        donationType: 'monetary',
        status: newStatus,
        timestamp: Date.now(),
        // Amount is intentionally excluded for blind signing
        note: 'Monetary donation - amount private'
      });

      const transaction = {
        arguments: [blindMessageContent],
        function: `0xc13e62a4b2451363bd7f23ff81a19f26bd8a4b5a99794265e17592d7f3282876::custom_indexer_ex_message_board::create_message`,
        type: "entry_function_payload",
        type_arguments: []
      };

      console.log('Blind transaction payload:', transaction);
      const pendingTransaction = await window.aptos.signAndSubmitTransaction(transaction);
      console.log('Blind transaction submitted:', pendingTransaction);

      // Update this part to use the direct route
      const updateResponse = await fetch(buildApiUrl('/api/donations/direct-update-hash'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: donation.id,
          transactionHash: pendingTransaction.hash,
          donation_type: 'money'
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update transaction hash in database');
      }

      fetchSignableDonations();

    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleConnect = async () => {
    try {
      console.log('Attempting to connect wallet...');
      if (typeof window.aptos !== 'undefined') {
        console.log('Aptos wallet detected');
        try {
          const response = await window.aptos.connect();
          console.log('Connection response:', response);
          
          const acc = await window.aptos.account();
          console.log('Account:', acc);
          setConnectedAccount(acc);
        } catch (error) {
          console.error('Connection error:', error);
        }
      } else {
        console.log('Aptos wallet not found');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('Attempting to disconnect...');
      if (typeof window.aptos !== 'undefined') {
        await window.aptos.disconnect();
        setConnectedAccount(null);
        window.location.reload();
        console.log('Disconnected');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const currentDonations = activeTab === 'goods' ? approvedDonations : approvedMonetaryDonations;

  return (
    <div className="sign-transactions">
      <div className="analytics-header">
        <button className="back-to-dashboard-btn" onClick={() => navigate('/admin')}>
          ← Back to Dashboard
        </button>
        <h2>Sign Transactions</h2>
      </div>

      <div className="header">
        <div className="transaction-tabs">
          <button 
            className={`tab-button ${activeTab === 'goods' ? 'active' : ''}`}
            onClick={() => setActiveTab('goods')}
          >
            📦 Goods Donations ({approvedDonations.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'monetary' ? 'active' : ''}`}
            onClick={() => setActiveTab('monetary')}
          >
            💰 Monetary Donations ({approvedMonetaryDonations.length})
          </button>
        </div>
        <div className="actions-section">
          {!connectedAccount ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleConnect();
              }} 
              className="connect-wallet-button"
            >
              Connect Address
            </button>
          ) : (
            <div className="wallet-status">
              <button className="connect-wallet-button connected">
                Address Connected: {connectedAccount.address.slice(0, 6)}...{connectedAccount.address.slice(-6)}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDisconnect();
                }} 
                className="disconnect-button"
                title="Disconnect wallet"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="signing-info">
        {activeTab === 'goods' ? (
          <div className="info-card">
            <h3>📦 Goods Donations - Regular Signing</h3>
            <p>All donation details including item type, quantity, and description will be recorded on the blockchain for full transparency.</p>
          </div>
        ) : (
          <div className="info-card monetary">
            <h3>💰 Monetary Donations - Blind Signing</h3>
            <p>Only donation ID, donor, recipient, and timestamp will be recorded on the blockchain. The donation amount remains private between the donor and recipient for privacy protection.</p>
          </div>
        )}
      </div>
      
      <div className="table-container">
        {currentDonations.map(donation => (
          <div key={donation.id} className="transaction-row">
            <div className="transaction-details">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'left' }}>ID</th>
                    <th style={{ width: '140px', textAlign: 'left' }}>Donor</th>
                    {activeTab === 'goods' ? (
                      <>
                        <th style={{ width: '100px', textAlign: 'left' }}>Item</th>
                        <th style={{ width: '60px', textAlign: 'left' }}>Qty</th>
                        <th style={{ width: '180px', textAlign: 'left' }}>Description</th>
                        <th style={{ width: '80px', textAlign: 'left' }}>Condition</th>
                      </>
                    ) : (
                      <>
                        <th style={{ width: '240px', textAlign: 'left' }}>Amount</th>
                      </>
                    )}
                    <th style={{ width: '80px', textAlign: 'left' }}>Status</th>
                    <th style={{ minWidth: '180px', textAlign: 'left', verticalAlign: 'middle', paddingRight: '8px' }}>Transaction Hash</th>
                    <th style={{ width: '120px', textAlign: 'left' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '60px', textAlign: 'left' }}>{donation.id}</td>
                    <td style={{ width: '140px', textAlign: 'left' }}>{donation.user_name}</td>
                    {activeTab === 'goods' ? (
                      <>
                        <td style={{ width: '100px', textAlign: 'left' }}>{donation.item_type}</td>
                        <td style={{ width: '60px', textAlign: 'left' }}>{donation.quantity}</td>
                        <td style={{ width: '180px', textAlign: 'left' }}>{donation.description}</td>
                        <td style={{ width: '80px', textAlign: 'left' }}>{donation.condition}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ width: '240px', textAlign: 'left' }} className="amount-private">
                          <span className="private-label">Private</span>
                          <small>Amount hidden for blind signing</small>
                        </td>
                      </>
                    )}
                    <td style={{ width: '80px', textAlign: 'left' }}>{donation.status}</td>
                    <td style={{ minWidth: '180px', textAlign: 'left', verticalAlign: 'middle', paddingRight: '8px' }}>
                      {donation.transaction_hash ? (
                        <a
                          href={`https://explorer.aptoslabs.com/txn/${donation.transaction_hash}?network=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hash-link"
                          style={{ color: '#888', textDecoration: 'underline', whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          {donation.transaction_hash.slice(0, 8)}...{donation.transaction_hash.slice(-6)}
                        </a>
                      ) : '-'}
                    </td>
                    <td style={{ width: '120px', textAlign: 'left' }}>
                      {donation.transaction_hash ? (
                        <span className="on-chain-label" style={{
                          color: '#888',
                          background: '#eee',
                          padding: '4px 10px',
                          borderRadius: '8px'
                        }}>On-Chain</span>
                      ) : donation.status === 'completed' ? (
                        <>
                          <button
                            className="sign-btn"
                            onClick={() => activeTab === 'goods'
                              ? handleStatusChange(donation, 'approved')
                              : handleBlindSign(donation, 'approved')
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="deny-btn"
                            style={{ marginLeft: 8, background: '#f44336', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}
                            onClick={() => handleReject(donation)}
                          >
                            Deny
                        </button>
                        </>
                      ) : donation.status === 'approved' ? (
                        <span className="signed-label">Signed</span>
                      ) : (
                        <span className="not-signable-label">Not signable</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignTransactions; 