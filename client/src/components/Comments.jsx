import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { format } from 'date-fns';
import './Comments.css';
import { buildApiUrl } from '../config/api';

const Comments = ({ postId }) => {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(buildApiUrl(`/api/social/posts/${postId}/comments`));
      setComments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await axios.post(buildApiUrl(`/api/social/posts/${postId}/comments`), {
        content: newComment,
        userId: user.id
      }, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      setComments([...comments, response.data]);
      setNewComment('');
      
      // Refresh comments after successful submission
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
    }
  };

  const getProfilePicUrl = (profilePic) => {
    if (!profilePic) {
      return '/default-avatar.png';
    }
    return buildApiUrl(`/uploads/${profilePic}`);
  };

  if (loading) {
    return <div className="loading-comments">Loading comments...</div>;
  }

  return (
    <div className="comments-container">
      <form onSubmit={handleSubmit} className="comment-form">
        <img
          src={(() => {
            // Get the actual user's profile picture
            const profilePic = user?.user?.photo_url || user?.recipient?.profile_image;
            if (profilePic) {
              // If it's base64 data, use it directly
              if (profilePic.startsWith('data:image')) {
                return profilePic;
              }
              // If it's already a full URL, use it as is
              if (profilePic.startsWith('http')) {
                return profilePic;
              }
              // Otherwise, construct the URL
              return getProfilePicUrl(profilePic);
            }
            return getProfilePicUrl(null); // No fallback, just show nothing if no profile pic
          })()}
          alt="Your profile"
          className="comment-form-avatar"
          style={{ display: user?.user?.photo_url || user?.recipient?.profile_image ? 'block' : 'none' }}
        />
        <div className="comment-input-container">
        <textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="comment-submit"
        >
          Comment
        </button>
        </div>
      </form>

      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.comment_id} className="comment">
            {comment.user_profile_picture && (
            <img
                src={getProfilePicUrl(comment.user_profile_picture)}
              alt={comment.username}
              className="comment-avatar"
            />
            )}
            <div className="comment-content">
              <div className="comment-header">
                <span className="comment-username">{comment.username}</span>
                <span className="comment-date">
                  {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <p className="comment-text">{comment.comment_text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments; 