import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Certificate.css';

const Certificate = ({ donation, onClose }) => {
  const userData = JSON.parse(localStorage.getItem('user'));
  const donorName = userData?.user?.name || 'Anonymous Donor';

  const generatePDF = async () => {
    const certificate = document.getElementById('donation-certificate');
    
    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const canvas = await html2canvas(certificate, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    // Create A4 landscape PDF
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate dimensions to fit the certificate with some margin
    const margin = 20;
    const availableWidth = pdfWidth - (2 * margin);
    const availableHeight = pdfHeight - (2 * margin);
    
    const imgAspectRatio = canvas.width / canvas.height;
    const pageAspectRatio = availableWidth / availableHeight;
    
    let finalWidth, finalHeight;
    
    if (imgAspectRatio > pageAspectRatio) {
      // Image is wider than page
      finalWidth = availableWidth;
      finalHeight = availableWidth / imgAspectRatio;
    } else {
      // Image is taller than page
      finalHeight = availableHeight;
      finalWidth = availableHeight * imgAspectRatio;
    }
    
    // Center the image
    const offsetX = (pdfWidth - finalWidth) / 2;
    const offsetY = (pdfHeight - finalHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
    pdf.save(`donation-certificate-${donation.id}.pdf`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="certificate-modal">
      <div className="certificate-container">
        <div id="donation-certificate" className="certificate">
          <div className="certificate-header">
            <div className="header-logo">
              <img src="/Sustenance.png" alt="Sustenance Logo" className="certificate-logo-img" />
            </div>
            <h1>Certificate of Donation</h1>
            <div className="logo">SUSTENANCE</div>
          </div>
          
          <div className="certificate-text">
            This is to certify that a donation was made by <span className="donor-name">{donorName}</span> and was verified on the Aptos blockchain
          </div>

          <hr style={{ border: 'none', borderTop: '1.5px solid #b7cbb2', margin: '0 0 18px 0' }} />
            
          <div className="certificate-mainbox">
            <div className="mainbox-col details">
              <div className="detail-row">
                <span className="label">Donor:</span>
                <span className="value">{donorName}</span>
              </div>
              <div className="detail-row">
                <span className="label">Donation ID:</span>
                <span className="value">{donation.id}</span>
              </div>
              <div className="detail-row">
                <span className="label">{donation.donation_type === 'money' ? 'Amount:' : 'Item Type:'}</span>
                <span className="value">
                  {donation.donation_type === 'money' 
                    ? `$${parseFloat(donation.amount || 0).toFixed(2)}`
                    : donation.item_type
                  }
                </span>
              </div>
              {donation.donation_type !== 'money' && (
                <div className="detail-row">
                  <span className="label">Quantity:</span>
                  <span className="value">{donation.quantity}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="label">Date:</span>
                <span className="value">{formatDate(donation.created_at)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Recipient:</span>
                <span className="value">{donation.recipient_name}</span>
              </div>
            </div>
            <div className="mainbox-divider"></div>
            <div className="mainbox-col verification">
              <div style={{ fontWeight: 700, color: '#2c5530', marginBottom: 8, fontSize: 15 }}>Verified on Aptos Blockchain</div>
              <div className="qr-code">
                <QRCodeCanvas 
                  value={`https://explorer.aptoslabs.com/txn/${donation.transaction_hash}?network=testnet`}
                  size={120}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="hash-details">
                <p>Transaction Hash:</p>
                <p className="hash">{donation.transaction_hash}</p>
                <p className="verify-text">Scan to verify on Aptos Explorer</p>
              </div>
            </div>
          </div>

          <div className="certificate-footer">
            <div className="footer-content">
              <div className="footer-logo">
                <img src="/Sustenance.png" alt="Sustenance Logo" className="footer-logo-img" />
              </div>
              <p className="footer-text">
                This certificate is automatically generated and verified through the Aptos blockchain.
              </p>
            </div>
            <div className="seal">
              <div className="seal-inner">VERIFIED</div>
            </div>
          </div>
        </div>

        <div className="certificate-actions">
          <button onClick={generatePDF} className="download-btn">
            Download Certificate
          </button>
          <button onClick={onClose} className="close-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Certificate; 