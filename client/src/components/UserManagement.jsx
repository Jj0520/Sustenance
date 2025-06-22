import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import './UserManagement.css';
import { buildApiUrl } from '../../config/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  // Add delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Add error state
  const [error, setError] = useState({ show: false, message: '' });

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

    // Fetch users using the admin endpoint
    const fetchUsers = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/admin/users'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError({
          show: true,
          message: "Failed to fetch users. Please check your permissions."
        });
      }
    };

    fetchUsers();
  }, [navigate, token]);

  // Handle edit click
  const handleEditClick = (user) => {
    setEditingId(user.id);
    setEditForm(user);
  };

  // Handle edit save
  const handleSaveEdit = async (id) => {
    try {
      console.log('Saving edit for id:', id);
      console.log('Edit form data:', editForm);
      
      const response = await fetch(buildApiUrl(`/api/admin/users/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const updatedUser = await response.json();
      console.log('Updated user:', updatedUser);
      
      setUsers(users.map(user => user.id === id ? updatedUser : user));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating user:', error);
      setError({
        show: true,
        message: `Failed to update user: ${error.message}`
      });
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  // Handle actual delete
  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${userToDelete.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userToDelete.id));
        setShowDeleteConfirm(false);
        setUserToDelete(null);
      } else {
        const data = await response.json();
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        // Show error message
        setError({
          show: true,
          message: data.message || "This user cannot be deleted as they have existing donations in the system."
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setError({
        show: true,
        message: "Failed to delete user. Network error or unauthorized access."
      });
    }
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="user-management">
      <div className="analytics-header">
        <button className="back-to-dashboard-btn" onClick={() => navigate('/admin')}>
          ← Back to Dashboard
        </button>
        <h2>User Management</h2>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ opacity: 1, color: '#fff', fontWeight: 500 }}>
                <td>{user.id}</td>
                <td>
                  {editingId === user.id ? (
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                    />
                  ) : (
                    user.name
                  )}
                </td>
                <td>
                  {editingId === user.id ? (
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                    />
                  ) : (
                    user.email
                  )}
                </td>
                <td>
                  {editingId === user.id ? (
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleEditChange}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="donor">Donor</option>
                    </select>
                  ) : (
                    user.role
                  )}
                </td>
                <td>
                  {editingId === user.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(user.id)}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(user)}>Edit</button>
                      <button onClick={() => handleDeleteClick(user)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete user {userToDelete?.name}?</p>
            <div className="delete-confirm-buttons">
              <button onClick={handleConfirmDelete}>Yes, Delete</button>
              <button onClick={() => {
                setShowDeleteConfirm(false);
                setUserToDelete(null);
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message Modal */}
      {error.show && (
        <div className="error-modal-overlay">
          <div className="error-modal">
            <h3>Cannot Delete User</h3>
            <p>{error.message}</p>
            <button onClick={() => setError({ show: false, message: '' })}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 