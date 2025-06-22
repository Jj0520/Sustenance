import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BackToDashboard from './BackToDashboard';
import './Donate.css';
import { AuthContext } from '../contexts/AuthContext';
import 'react-toastify/dist/ReactToastify.css';
import { buildApiUrl } from '../../config/api';

const Donate = () => {
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [donationType, setDonationType] = useState(null); // 'money' or 'goods'
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [todayStr] = useState(new Date().toISOString().split('T')[0]);
  const [goods, setGoods] = useState({
    item_type: '',
    quantity: '',
    description: '',
    condition: 'New', // Default value
    pickup_address: '',
    preferred_date: todayStr,
    preferred_time: ''
  });
  const [recipientFilter, setRecipientFilter] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [donationMessage, setDonationMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [receiptFile, setReceiptFile] = useState(null);
  const [bankTransferSubmitted, setBankTransferSubmitted] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [profileRecipient, setProfileRecipient] = useState(null);

  const amounts = [10, 25, 50, 100, 250];
  const itemTypes = ["Food", "Clothing", "Electronics", "Furniture", "Books", "Toys", "Medical Supplies", "Other"];
  const conditionOptions = ["New", "Like New", "Good", "Fair", "Used"];

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch approved recipients from the database
    const fetchRecipients = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/recipients/approved'));
        const data = await response.json();
        console.log('Received recipients:', data);
        
        // Transform the data to match our component's expected format
        const formattedRecipients = data.map(recipient => ({
          id: recipient.recipient_id,
          name: recipient.ngo_name,
          description: recipient.description, // Backend already aliases ngo_description as description
          category: 'General', // Default category since we don't have categories in the database
          image: recipient.profile_image || `https://placehold.co/600x400/607D8B/FFF?text=${encodeURIComponent(recipient.ngo_name)}`,
          bank_name: recipient.bank_name,
          bank_account_number: recipient.bank_account_number,
          bank_account_holder: recipient.bank_account_holder
        }));

        setRecipients(formattedRecipients);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recipients:', error);
        toast.error('Failed to load recipients');
        setLoading(false);
      }
    };

    fetchRecipients();
  }, [navigate, user]);

  // If goods.preferred_date is ever empty (e.g. user clears it), reset to today
  useEffect(() => {
    if (!goods.preferred_date) {
      setGoods(g => ({ ...g, preferred_date: todayStr }));
    }
    // eslint-disable-next-line
  }, [goods.preferred_date]);

  // Helper function to generate consistent colors based on category
  const getColorForCategory = (category) => {
    const categoryColors = {
      'Food & Hunger': '4CAF50',
      'Housing': '2196F3',
      'Education': 'FF9800',
      'Environment': '8BC34A',
      'Healthcare': 'E91E63',
      'General': '607D8B'
    };
    
    return categoryColors[category] || '607D8B';
  };

  const handleBackClick = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    // Validate that input is a number and not negative
    if (!isNaN(value) && Number(value) >= 0) {
      setCustomAmount(value);
      setSelectedAmount(null);
    }
  };

  const handleGoodsChange = (e) => {
    const { name, value } = e.target;
    setGoods({ ...goods, [name]: value });
  };

  const handleDonationTypeSelect = (type) => {
    setDonationType(type);
    setBankTransferSubmitted(false);
    setReceiptFile(null);
  };

  const handleSelectRecipient = (recipient) => {
    setSelectedRecipient(recipient);
  };

  const handleFilterChange = (e) => {
    setRecipientFilter(e.target.value.toLowerCase());
  };

  const handleViewProfile = (recipient, e) => {
    e.stopPropagation(); // Prevent card selection when clicking View Profile
    setProfileRecipient(recipient);
    setShowProfileOverlay(true);
  };

  const handleCloseProfile = () => {
    setShowProfileOverlay(false);
    setProfileRecipient(null);
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF or image file (JPG, PNG)');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setReceiptFile(file);
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      // Validate recipient selection
      if (!selectedRecipient) {
        toast.error('Please select a recipient organization');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate donation type selection
      if (!donationType) {
        toast.error('Please select a donation type');
        return;
      }
      
      if (donationType === 'money') {
        // Validate amount selection for money donation
        const amount = selectedAmount || parseFloat(customAmount);
        if (!amount || amount <= 0) {
          toast.error('Please select or enter a valid donation amount');
          return;
        }
      } else if (donationType === 'goods') {
        // Validate goods donation details
        if (!goods.item_type || !goods.description || !goods.quantity) {
          toast.error('Please fill in all required fields for goods donation');
          return;
        }
        
        if (!goods.pickup_address) {
          toast.error('Please provide a pickup address');
          return;
        }
        
        if (!goods.preferred_date || !goods.preferred_time) {
          toast.error('Please specify preferred pickup date and time');
          return;
        }
      }
      
      setStep(3);
    } else if (step === 3) {
      if (donationType === 'money' && !bankTransferSubmitted) {
        // For monetary donations, first show bank details
        setBankTransferSubmitted(true);
      } else {
        handleDonateSubmit();
      }
    }
  };

  const handleDonateSubmit = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      // Prepare donation data based on type
      const formData = new FormData();
      
      if (donationType === 'money') {
        // For monetary donations, validate receipt upload
        if (!receiptFile) {
          toast.error('Please upload your payment receipt');
          setLoading(false);
          return;
        }

        formData.append('donation_type', 'money');
        formData.append('amount', selectedAmount || parseFloat(customAmount));
        formData.append('recipient_id', selectedRecipient.id);
        formData.append('message', donationMessage);
        formData.append('receipt', receiptFile);
      } else {
        // For goods donations - use snake_case to match database
        formData.append('donation_type', 'goods');
        formData.append('item_type', goods.item_type);
        formData.append('quantity', goods.quantity);
        formData.append('description', goods.description);
        formData.append('condition', goods.condition);
        formData.append('pickup_address', goods.pickup_address);
        formData.append('preferred_date', goods.preferred_date);
        formData.append('preferred_time', goods.preferred_time);
        formData.append('recipient_id', selectedRecipient.id);
        formData.append('message', donationMessage);
      }

      const response = await fetch(buildApiUrl('/api/donations'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });

      if (!response.ok) {
        throw new Error('Failed to submit donation');
      }

      await response.json();
      toast.success('Donation submitted successfully!');
      setLoading(false);
      
      // Navigate back to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting donation:', error);
      toast.error('Error processing donation. Please try again.');
      setLoading(false);
    }
  };

  const filteredRecipients = recipients.filter(recipient => 
    (recipient.name && recipient.name.toLowerCase().includes(recipientFilter)) || 
    (recipient.description && recipient.description.toLowerCase().includes(recipientFilter)) || 
    (recipient.category && recipient.category.toLowerCase().includes(recipientFilter))
  );

  if (loading && step === 1) {
    return (
      <div className="donate-container">
        <div className="loading-indicator">
          Loading recipients...
        </div>
      </div>
    );
  }

  return (
    <div className="donate-container">
      {step === 1 ? (
        <BackToDashboard />
      ) : (
        <button className="back-button" onClick={handleBackClick}>
          Previous Step
        </button>
      )}

      <div className="donate-box">
        <div className="steps-indicator">
          <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`step-circle ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        {step === 1 && (
          <div className="step-content recipient-selection">
            <h2>Select a Recipient</h2>
            <p className="step-description">Choose an organization you'd like to support</p>
            
            <div className="search-filter">
              <input
                type="text"
                placeholder="Search by name or category..."
                value={recipientFilter}
                onChange={handleFilterChange}
                className="filter-input"
              />
            </div>
            
            <div className="recipients-grid">
              {loading ? (
                <div className="loading-indicator">Loading recipients...</div>
              ) : filteredRecipients.length === 0 ? (
                <p className="no-results">No recipients found matching your search.</p>
              ) : (
                filteredRecipients.map(recipient => (
                  <div 
                    key={recipient.id} 
                    className={`recipient-card ${selectedRecipient?.id === recipient.id ? 'selected' : ''}`}
                    onClick={() => handleSelectRecipient(recipient)}
                  >
                    <div className="recipient-image">
                      <img src={recipient.image} alt={recipient.name} />
                    </div>
                    <div className="recipient-info">
                      <h3>{recipient.name}</h3>
                      <span className="recipient-category">{recipient.category}</span>
                      <p>{recipient.description}</p>
                      <button 
                        className="view-profile-btn"
                        onClick={(e) => handleViewProfile(recipient, e)}
                      >
                        View Profile
                      </button>
                    </div>
                    {selectedRecipient?.id === recipient.id && (
                      <div className="selected-indicator">✓</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content donation-type-selection">
            <h2>Choose Donation Type</h2>
            <p className="step-description">How would you like to donate to {selectedRecipient.name}?</p>
            
            <div className="donation-types">
              <div 
                className={`donation-type-card ${donationType === 'money' ? 'selected' : ''}`}
                onClick={() => handleDonationTypeSelect('money')}
              >
                <div className="donation-type-icon">💰</div>
                <h3>Donate Money</h3>
                <p>Make a monetary contribution to support their cause</p>
              </div>

              <div 
                className={`donation-type-card ${donationType === 'goods' ? 'selected' : ''}`}
                onClick={() => handleDonationTypeSelect('goods')}
              >
                <div className="donation-type-icon">📦</div>
                <h3>Donate Goods</h3>
                <p>Donate food, clothing, or other essential items</p>
              </div>
            </div>
            
            {donationType === 'money' && (
              <div className="money-donation-options">
                <h3>Choose Amount</h3>
                <div className="amount-options">
                  {amounts.map(amount => (
                    <button
                      key={amount}
                      className={`amount-button ${selectedAmount === amount ? 'selected' : ''}`}
                      onClick={() => handleAmountSelect(amount)}
                    >
                      ${amount}
                    </button>
                  ))}
                  
                  <div className="custom-amount">
                    <span className="dollar-sign">$</span>
                    <input
                      type="text"
                      placeholder="Other amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      className={customAmount ? 'has-value' : ''}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {donationType === 'goods' && (
              <div className="goods-donation-options">
                <h3>Item Details</h3>
                <div className="goods-form">
                  <div className="form-group">
                    <label>Item Type*</label>
                    <select
                      name="item_type"
                      value={goods.item_type}
                      onChange={handleGoodsChange}
                      required
                    >
                      <option value="">Select Item Type</option>
                      {itemTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Description*</label>
                    <textarea
                      name="description"
                      value={goods.description}
                      onChange={handleGoodsChange}
                      placeholder="Describe the items you're donating"
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Quantity*</label>
                    <input
                      type="text"
                      name="quantity"
                      value={goods.quantity}
                      onChange={handleGoodsChange}
                      placeholder="e.g., 5, 10"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Condition*</label>
                    <select
                      name="condition"
                      value={goods.condition}
                      onChange={handleGoodsChange}
                      required
                    >
                      {conditionOptions.map(condition => (
                        <option key={condition} value={condition}>{condition}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Pickup Address*</label>
                    <textarea
                      name="pickup_address"
                      value={goods.pickup_address}
                      onChange={handleGoodsChange}
                      placeholder="Enter the address where items can be picked up"
                      rows={2}
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Preferred Pickup Date*</label>
                      <input
                        type="date"
                        name="preferred_date"
                        value={goods.preferred_date}
                        onChange={handleGoodsChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Preferred Pickup Time*</label>
                      <select
                        name="preferred_time"
                        value={goods.preferred_time}
                        onChange={handleGoodsChange}
                        required
                      >
                        <option value="">Select Time</option>
                        <option value="Morning (9AM-12PM)">Morning (9AM-12PM)</option>
                        <option value="Afternoon (12PM-4PM)">Afternoon (12PM-4PM)</option>
                        <option value="Evening (4PM-7PM)">Evening (4PM-7PM)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="donation-message">
              <h3>Add a Message (Optional)</h3>
              <textarea
                placeholder="Add a personal message to the recipient..."
                value={donationMessage}
                onChange={(e) => setDonationMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content payment-selection">
            <h2>{donationType === 'money' ? 'Payment Method' : 'Confirm Donation'}</h2>
            <p className="step-description">Complete your donation to {selectedRecipient.name}</p>
            
            <div className="payment-summary">
              <h3>Donation Summary</h3>
              <div className="summary-details">
                <div className="summary-row">
                  <span>Recipient:</span>
                  <span>{selectedRecipient.name}</span>
                </div>
                <div className="summary-row">
                  <span>Donation Type:</span>
                  <span>{donationType === 'money' ? 'Money' : 'Goods'}</span>
                </div>
                {donationType === 'money' && (
                  <div className="summary-row">
                    <span>Amount:</span>
                    <span>${selectedAmount || customAmount}</span>
                  </div>
                )}
                {donationType === 'goods' && (
                  <>
                    <div className="summary-row">
                      <span>Item Type:</span>
                      <span>{goods.item_type}</span>
                    </div>
                    <div className="summary-row">
                      <span>Description:</span>
                      <span>{goods.description}</span>
                    </div>
                    <div className="summary-row">
                      <span>Quantity:</span>
                      <span>{goods.quantity}</span>
                    </div>
                    <div className="summary-row">
                      <span>Condition:</span>
                      <span>{goods.condition}</span>
                    </div>
                    <div className="summary-row">
                      <span>Pickup Address:</span>
                      <span>{goods.pickup_address}</span>
                    </div>
                    <div className="summary-row">
                      <span>Pickup Date/Time:</span>
                      <span>
                        {goods.preferred_date ? new Date(goods.preferred_date).toLocaleDateString() : ''} 
                        {goods.preferred_time ? ` - ${goods.preferred_time}` : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {donationType === 'money' && !bankTransferSubmitted && (
              <div className="payment-methods">
                <h3>Select Payment Method</h3>
                <div className="payment-options">
                  <div 
                    className="payment-option"
                    onClick={handleContinue}
                  >
                    <div className="payment-icon bank-icon">🏦</div>
                    <div className="payment-label">Bank Transfer Only</div>
                  </div>
                </div>
                <p className="payment-note">
                  We only accept bank transfers for monetary donations to ensure transparency and security.
                </p>
              </div>
            )}

            {donationType === 'money' && bankTransferSubmitted && (
              <div className="bank-transfer-section">
                <h3>Bank Transfer Details</h3>
                <div className="bank-details-card">
                  <div className="bank-info">
                    <h4>Transfer to: {selectedRecipient.name}</h4>
                    <div className="bank-detail-row">
                      <span className="label">Bank Name:</span>
                      <span className="value">{selectedRecipient.bank_name || 'Not provided'}</span>
                    </div>
                    <div className="bank-detail-row">
                      <span className="label">Account Number:</span>
                      <span className="value">{selectedRecipient.bank_account_number || 'Not provided'}</span>
                    </div>
                    <div className="bank-detail-row">
                      <span className="label">Account Holder:</span>
                      <span className="value">{selectedRecipient.bank_account_holder || 'Not provided'}</span>
                    </div>
                    <div className="bank-detail-row amount-row">
                      <span className="label">Amount to Transfer:</span>
                      <span className="value amount">${selectedAmount || customAmount}</span>
                    </div>
                  </div>
                </div>

                <div className="transfer-instructions">
                  <h4>Instructions:</h4>
                  <ol>
                    <li>Transfer the exact amount <strong>${selectedAmount || customAmount}</strong> to the bank account above</li>
                    <li>Take a screenshot or photo of the successful transfer receipt</li>
                    <li>Upload the receipt below as proof of payment</li>
                    <li>Click "Submit Payment Proof" to complete your donation</li>
                  </ol>
                </div>

                <div className="receipt-upload-section">
                  <h4>Upload Payment Receipt</h4>
                  <div className="upload-area">
                    <input
                      type="file"
                      id="receipt-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleReceiptUpload}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="receipt-upload" className="upload-label">
                      <div className="upload-icon">📄</div>
                      <div className="upload-text">
                        {receiptFile ? receiptFile.name : 'Click to upload receipt (PDF, JPG, PNG)'}
                      </div>
                    </label>
                    {receiptFile && (
                      <div className="file-info">
                        <span className="file-size">
                          {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setReceiptFile(null)}
                          className="remove-file"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="upload-note">
                    Please ensure your receipt clearly shows the transfer amount, date, and recipient details.
                  </p>
                </div>
              </div>
            )}
            
            {donationType === 'goods' && (
              <div className="goods-delivery-note">
                <h3>Next Steps</h3>
                <p>
                  After your donation is submitted, {selectedRecipient.name} will be notified
                  and will coordinate with you for the pickup process.
                </p>
                <p>
                  Status updates will be available in your donation history.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="donate-actions">
          <button 
            className="continue-button"
            onClick={handleContinue}
            disabled={loading}
          >
            {loading ? 'Processing...' : 
             step === 3 && donationType === 'money' && !bankTransferSubmitted ? 'Show Bank Details' :
             step === 3 && donationType === 'money' && bankTransferSubmitted ? 'Submit Payment Proof' :
             step === 3 ? 'Complete Donation' : 'Continue'}
          </button>
        </div>
      </div>

      {/* Profile Overlay */}
      {showProfileOverlay && profileRecipient && (
        <div className="profile-overlay" onClick={handleCloseProfile}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <h2>{profileRecipient.name}</h2>
              <button className="close-profile-btn" onClick={handleCloseProfile}>
                ✕
              </button>
            </div>
            
            <div className="profile-content">
              <div className="profile-image-section">
                <img src={profileRecipient.image} alt={profileRecipient.name} />
              </div>
              
              <div className="profile-details">
                <div className="profile-section">
                  <h3>About Us</h3>
                  <p>{profileRecipient.description}</p>
                </div>
                
                <div className="profile-section">
                  <h3>Category</h3>
                  <span className="profile-category">{profileRecipient.category}</span>
                </div>
                
                {(profileRecipient.bank_name || profileRecipient.bank_account_number) && (
                  <div className="profile-section">
                    <h3>Banking Information</h3>
                    <div className="bank-info-preview">
                      {profileRecipient.bank_name && (
                        <p><strong>Bank:</strong> {profileRecipient.bank_name}</p>
                      )}
                      {profileRecipient.bank_account_holder && (
                        <p><strong>Account Holder:</strong> {profileRecipient.bank_account_holder}</p>
                      )}
                      <p className="bank-note">
                        <em>Full banking details will be provided during the donation process</em>
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="profile-section">
                  <h3>How Your Donation Helps</h3>
                  <p>
                    Your generous contribution to {profileRecipient.name} will directly support their mission 
                    and help them continue making a positive impact in the community. Whether you choose to 
                    donate money or goods, every contribution makes a difference.
                  </p>
                </div>
              </div>
            </div>
            

          </div>
        </div>
      )}
    </div>
  );
};

export default Donate; 