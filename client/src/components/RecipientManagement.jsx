import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './RecipientManagement.css';
import { AuthContext } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';

const RecipientManagement = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser?.user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetchApplications();
  }, [navigate]);

  const fetchApplications = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/recipients/applications'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('Received applications data:', data);
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch applications');
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (recipientId, newStatus) => {
    try {
      const response = await fetch(buildApiUrl(`/api/recipients/applications/${recipientId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state
      setApplications(applications.map(app => 
        app.recipient_id === recipientId 
          ? { ...app, status: newStatus }
          : app
      ));

      toast.success(`Application ${newStatus} successfully`);
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Error updating status:', error);
    }
  };

  const handleToggleStatus = async (recipientId, currentStatus) => {
    try {
      const action = currentStatus === 'approved' ? 'disable' : 'enable';
      const response = await fetch(buildApiUrl(`/api/recipients/toggle-status/${recipientId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle status');
      }

      const result = await response.json();
      
      // Update local state
      setApplications(applications.map(app => 
        app.recipient_id === recipientId 
          ? { ...app, status: result.recipient.status }
          : app
      ));

      toast.success(`NGO ${action}d successfully`);
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Error toggling status:', error);
    }
  };

  const viewDocument = async (recipientId) => {
    try {
      setLoadingDocument(true);
      const response = await fetch(buildApiUrl(`/api/recipients/document/${recipientId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDocumentUrl(url);
    } catch (error) {
      toast.error('Failed to fetch document');
      console.error('Error fetching document:', error);
    } finally {
      setLoadingDocument(false);
    }
  };

  const openModal = async (application) => {
    setSelectedApplication(application);
    setShowModal(true);
    await viewDocument(application.recipient_id);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedApplication(null);
    if (documentUrl) {
      window.URL.revokeObjectURL(documentUrl);
      setDocumentUrl(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-badge-approved';
      case 'rejected':
        return 'status-badge-rejected';
      case 'pending':
        return 'status-badge-pending';
      case 'disabled':
        return 'status-badge-disabled';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="loading">Loading applications...</div>;
  }

  return (
    <div className="recipient-management">
      <div className="analytics-header">
        <button className="back-to-dashboard-btn" onClick={() => navigate('/admin')}>
          ← Back to Dashboard
        </button>
        <h2>NGO Applications</h2>
      </div>

      <div className="applications-grid">
        {applications.map((application) => (
          <div 
            key={application.recipient_id} 
            className="application-card"
            onClick={() => openModal(application)}
          >
            <div className="application-header">
              <h3>{application.ngo_name}</h3>
              <span className={`status-badge ${getStatusBadgeClass(application.status)}`}>
                {application.status}
              </span>
            </div>
            <div className="application-details">
              <p><strong>Email:</strong> {application.email}</p>
              <p><strong>Founded:</strong> {new Date(application.founded_date).toLocaleDateString()}</p>
              <p><strong>Description:</strong> {application.description}</p>
            </div>
          </div>
        ))}

        {applications.length === 0 && (
          <div className="no-applications">
            No applications found
          </div>
        )}
      </div>

      {showModal && selectedApplication && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={closeModal}>&times;</button>
            <div className="modal-layout">
              <div className="modal-main-content">
                <h2>{selectedApplication.ngo_name}</h2>
                <div className="modal-section">
                  <h3>Organization Details</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Email</label>
                      <p>{selectedApplication.email}</p>
                    </div>
                    <div className="info-item">
                      <label>Founded Date</label>
                      <p>{new Date(selectedApplication.founded_date).toLocaleDateString()}</p>
                    </div>
                    <div className="info-item">
                      <label>Status</label>
                      <p className={getStatusBadgeClass(selectedApplication.status)}>
                        {selectedApplication.status}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="modal-section">
                  <h3>Description</h3>
                  <p>{selectedApplication.description}</p>
                </div>

                {selectedApplication.status === 'pending' && (
                  <div className="modal-section">
                    <div className={`status-buttons ${selectedApplication.status === 'pending' ? 'two-buttons' : ''}`}>
                      <button
                        className="approve-button"
                        onClick={() => handleStatusUpdate(selectedApplication.recipient_id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => handleStatusUpdate(selectedApplication.recipient_id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {selectedApplication.status === 'approved' && (
                  <div className="modal-section">
                    <div className={`status-buttons ${selectedApplication.status === 'pending' ? 'two-buttons' : ''}`}>
                      <button
                        className="disable-button"
                        onClick={() => handleToggleStatus(selectedApplication.recipient_id, 'approved')}
                      >
                        Disable NGO
                      </button>
                    </div>
                  </div>
                )}

                {selectedApplication.status === 'disabled' && (
                  <div className="modal-section">
                    <div className={`status-buttons ${selectedApplication.status === 'pending' ? 'two-buttons' : ''}`}>
                      <button
                        className="enable-button"
                        onClick={() => handleToggleStatus(selectedApplication.recipient_id, 'disabled')}
                      >
                        Enable NGO
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-document">
                {loadingDocument ? (
                  <div className="document-loading">Loading document...</div>
                ) : documentUrl ? (
                  <iframe
                    src={documentUrl}
                    className="document-preview"
                    title="Document Preview"
                  />
                ) : (
                  <div className="document-loading">No document available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipientManagement; 