import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaImage, FaTimes, FaPlus, FaHeart, FaComment, FaArrowLeft } from 'react-icons/fa';
import Comments from './Comments';
import './SocialFeedPage.css';
import { buildApiUrl } from '../../config/api';

const SocialFeedPage = () => {
  const { user, token } = useContext(AuthContext);
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
      const response = await fetch(buildApiUrl('/api/social/posts'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setFetchingPosts(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await fetch(buildApiUrl('/api/social/like'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
      const response = await fetch(buildApiUrl('/api/social/posts'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
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

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return buildApiUrl(`/uploads/${imagePath}`);
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
                      <img 
                        src={getImageUrl(post.author_profile_picture) || '/default-avatar.png'} 
                        alt={post.author_name}
                        className="author-avatar"
                      />
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
                        src={getImageUrl(post.image_url)} 
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