import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaImage, FaTimes, FaPlus, FaHeart, FaComment, FaArrowLeft } from 'react-icons/fa';
import Comments from './Comments';
import './SocialFeedPage.css';

const SocialFeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNGO = user?.userType === 'recipient' || user?.role === 'ngo';
  
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPosts, setFetchingPosts] = useState(true);
  const [showComments, setShowComments] = useState({});

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setFetchingPosts(true);
      const userData = JSON.parse(localStorage.getItem('user'));
      
      const headers = {};
      if (userData && userData.token) {
        headers['Authorization'] = `Bearer ${userData.token}`;
      }
      
      const response = await fetch('http://localhost:5001/api/social/posts', {
        headers: headers
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setFetchingPosts(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      
      if (!userData || !userData.token) {
        console.error('No user token found for like action');
        return;
      }
      
      const response = await fetch('http://localhost:5001/api/social/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.token}`
        },
        body: JSON.stringify({ post_id: postId })
      });
      
      if (response.ok) {
        const result = await response.json();
        const isLiked = result.liked;
        
        // Update the post state directly instead of refetching all posts
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.post_id === postId 
              ? {
                  ...post,
                  user_has_liked: isLiked,
                  likes_count: isLiked 
                    ? (post.likes_count || 0) + 1 
                    : Math.max((post.likes_count || 1) - 1, 0)
                }
              : post
          )
        );
      } else {
        const errorData = await response.json();
        console.error('Like error response:', errorData);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('post_description', description);
    formData.append('ngo_id', user?.recipient?.recipient_id || user?.user?.id || user?.id);
    if (image) {
      formData.append('image', image);
    }

    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      
      if (!userData || !userData.token) {
        console.error('No user token found for post creation');
        return;
      }

      const response = await fetch('http://localhost:5001/api/social/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`
        },
        body: formData,
      });

      if (response.ok) {
        setDescription('');
        setImage(null);
        setImagePreview(null);
        setShowCreatePost(false);
        // Refresh the feed
        fetchPosts();
      } else {
        const errorData = await response.json();
        console.error('Post creation error response:', errorData);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowCreatePost(false);
    setDescription('');
    setImage(null);
    setImagePreview(null);
  };

  const handleBackToDashboard = () => {
    if (isNGO) {
      navigate('/recipient/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="social-feed-page">
      <div className="feed-section">
        <div className="feed-header">
          <div className="header-top">
            <button 
              className="back-to-dashboard-btn"
              onClick={handleBackToDashboard}
            >
              <FaArrowLeft /> Back to Dashboard
            </button>
          </div>
          <h1>Social Feed</h1>
          <p>Share updates and connect with the community</p>
          
          {isNGO && (
            <button 
              className="create-post-btn"
              onClick={() => setShowCreatePost(true)}
            >
              <FaPlus /> Create Post
            </button>
          )}
        </div>

        {fetchingPosts ? (
          <div className="loading">Loading posts...</div>
        ) : (
          <div className="posts-container">
            {posts.length === 0 ? (
              <div className="no-posts">
                <p>No posts yet. {isNGO ? 'Be the first to share something!' : 'Check back later for updates from NGOs.'}</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.post_id} className="post-card">
                  <div className="post-header">
                    <div className="author-info">
                      {post.author_profile_picture && (
                        <img 
                          src={(() => {
                            // If it's base64 data, use it directly
                            if (post.author_profile_picture.startsWith('data:image')) {
                              return post.author_profile_picture;
                            }
                            // If it's already a full URL, use it as is
                            if (post.author_profile_picture.startsWith('http')) {
                              return post.author_profile_picture;
                            }
                            // Otherwise, construct the URL
                            return `http://localhost:5001/uploads/${post.author_profile_picture}`;
                          })()} 
                          alt={post.author_name}
                          className="author-avatar"
                        />
                      )}
                      <div>
                        <h4>{post.author_name}</h4>
                        <span className="post-date">
                          {new Date(post.date_posted).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="post-content">
                    <p>{post.post_description}</p>
                    {post.image_url && (
                      <img 
                        src={(() => {
                          // If it's base64 data, use it directly
                          if (post.image_url.startsWith('data:image')) {
                            return post.image_url;
                          }
                          if (post.image_url.startsWith('http')) {
                            return post.image_url;
                          }
                          return `http://localhost:5001/uploads/${post.image_url}`;
                        })()} 
                        alt="Post image"
                        className="post-image"
                      />
                    )}
                  </div>
                  
                  <div className="post-actions">
                    <button 
                      className={`action-btn like-btn ${post.user_has_liked ? 'liked' : ''}`}
                      onClick={() => handleLike(post.post_id)}
                    >
                      <FaHeart /> {post.likes_count || 0}
                    </button>
                    <button 
                      className="action-btn comment-btn"
                      onClick={() => toggleComments(post.post_id)}
                    >
                      <FaComment /> {post.comments_count || 0}
                    </button>
                  </div>
                  
                  {showComments[post.post_id] && (
                    <Comments postId={post.post_id} />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Post</h3>
              <button className="close-button" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="post-input">
                <textarea
                  placeholder="What's on your mind?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <div className="character-count">
                  {description.length}/500
                </div>
              </div>

              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    type="button"
                    className="remove-image"
                    onClick={removeImage}
                  >
                    <FaTimes />
                  </button>
                </div>
              )}

              <div className="modal-actions">
                <label className="image-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <FaImage />
                  <span>Add Image</span>
                </label>

                <div className="action-buttons">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="post-button"
                    disabled={!description.trim() || loading}
                  >
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialFeedPage; 