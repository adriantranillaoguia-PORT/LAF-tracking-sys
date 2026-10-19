import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabase';
import ItemThumb from './ItemThumb';

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ItemDetailsModal({ item, onClose, isAdmin = false, supabaseClient = supabase }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    let active = true;

    const loadDetails = async () => {
      setLoading(true);
      try {
        const [{ data: authData }, { data, error }] = await Promise.all([
          supabaseClient.auth.getUser(),
          supabaseClient
            .from('item_comments')
            .select('*')
            .eq('item_id', item.id)
            .order('created_at', { ascending: true }),
        ]);

        if (!active) return;

        setCurrentUser(authData?.user || null);
        if (error) {
          console.error('Comment load error:', error);
          setFeedback({ type: 'error', text: error.message || 'Unable to load comments right now.' });
        } else {
          setComments(data || []);
        }
      } catch {
        if (!active) return;
        console.error('Comment load error: request failed.');
        setFeedback({ type: 'error', text: 'Unable to load comments right now.' });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDetails();
    return () => { active = false; };
  }, [item.id, supabaseClient]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const postComment = async (event) => {
    event.preventDefault();
    const comment = commentText.trim();

    if (!comment) {
      setFeedback({ type: 'error', text: 'Please write a comment before posting.' });
      return;
    }

    setPosting(true);
    setFeedback({ type: '', text: '' });

    try {
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError) console.error('Comment authentication error:', userError);
      if (userError || !user) {
        setFeedback({ type: 'error', text: 'You must be logged in to comment.' });
        return;
      }

      const { data, error } = await supabaseClient
        .from('item_comments')
        .insert({ item_id: item.id, user_id: user.id, comment })
        .select('*')
        .single();

      if (error) {
        console.error('Comment insert error:', error);
        setFeedback({ type: 'error', text: error.message || 'Unable to post comment. Please try again.' });
        return;
      }

      setCurrentUser(user);
      setComments((previous) => [...previous, data]);
      setCommentText('');
      setFeedback({ type: 'success', text: 'Comment posted successfully.' });

      const { data: refreshedComments, error: refreshError } = await supabaseClient
        .from('item_comments')
        .select('*')
        .eq('item_id', item.id)
        .order('created_at', { ascending: true });

      if (refreshError) {
        console.error('Comment refresh error:', refreshError);
      } else {
        setComments(refreshedComments || []);
      }
    } catch (error) {
      console.error('Comment insert error:', error);
      setFeedback({ type: 'error', text: error?.message || 'Unable to post comment. Please try again.' });
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (commentId) => {
    setDeletingId(commentId);
    setFeedback({ type: '', text: '' });

    try {
      const { error } = await supabaseClient
        .from('item_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments((previous) => previous.filter((comment) => comment.id !== commentId));
      setFeedback({ type: 'success', text: 'Comment deleted.' });
    } catch {
      setFeedback({ type: 'error', text: 'Unable to delete comment. Please try again.' });
    } finally {
      setDeletingId(null);
    }
  };

  const isLost = item.kind === 'lost';

  return createPortal((
    <div className="item-details-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="item-details-dialog" role="dialog" aria-modal="true" aria-labelledby="item-details-title">
        <header className="item-details-heading">
          <div>
            <span className={`details-kind-badge ${isLost ? 'details-kind-lost' : 'details-kind-found'}`}>
              {isLost ? 'Lost' : 'Found'}
            </span>
            <h2 id="item-details-title">{item.title}</h2>
          </div>
          <button type="button" className="details-close" onClick={onClose} aria-label="Close item details">×</button>
        </header>

        <div className="item-details-body">
          <ItemThumb
            imageUrl={item.photo_url || item.image_url || null}
            title={item.title}
            className="item-details-photo"
          />
          <div className="item-details-copy">
            <dl className="item-details-facts">
              <div><dt>Category</dt><dd>{item.category || 'Other'}</dd></div>
              <div><dt>Location</dt><dd>{item.location || 'Not specified'}</dd></div>
              <div><dt>Date</dt><dd>{item.date_happened || 'Not specified'}</dd></div>
              <div><dt>Status</dt><dd className={`details-status details-status-${item.status}`}>{item.status || 'Open'}</dd></div>
            </dl>
            <div className="item-details-description">
              <h3>Description</h3>
              <p>{item.description || 'No description provided.'}</p>
            </div>
            <p className="item-details-contact"><strong>Contact</strong><span>{item.contact || 'Not provided'}</span></p>
          </div>
        </div>

        <section className="comments-section" aria-labelledby="comments-title">
          <h3 id="comments-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.1A7.5 7.5 0 1 1 20 11.5Z" />
              <path d="M8.5 11.5h7M8.5 14.5h4" />
            </svg>
            Comments
          </h3>

          {loading ? (
            <p className="comments-state" role="status">Loading comments...</p>
          ) : comments.length === 0 ? (
            <div className="comments-state">
              <strong>Comments</strong>
              <p>No comments yet.</p>
              <span>Be the first to comment on this item.</span>
            </div>
          ) : (
            <div className="comments-list">
              {comments.map((comment) => (
                <article className="comment-entry" key={comment.id}>
                  <div className="comment-entry-header">
                    <strong>{comment.user_id && comment.user_id === currentUser?.id
                      ? (currentUser.email || 'You')
                      : 'Community member'}</strong>
                    <time dateTime={comment.created_at}>{formatTimestamp(comment.created_at)}</time>
                  </div>
                  <p>{comment.comment}</p>
                  {isAdmin && (
                    <button
                      type="button"
                      className="comment-delete-button"
                      onClick={() => deleteComment(comment.id)}
                      disabled={deletingId === comment.id}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                      </svg>
                      {deletingId === comment.id ? 'Deleting...' : 'Delete Comment'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          <form className="comment-form" onSubmit={postComment}>
            <label htmlFor="item-comment-input">Write a comment...</label>
            <textarea
              id="item-comment-input"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Write a comment..."
              rows={3}
            />
            <div className="comment-form-footer">
              {feedback.text && <p className={`comment-feedback comment-feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
              <button type="submit" className="comment-submit-button" disabled={posting || !commentText.trim()}>
                {posting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  ), document.body);
}