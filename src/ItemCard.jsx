import React, { useState } from 'react';
import ItemThumb from './ItemThumb';
import ItemDetailsModal from './ItemDetailsModal';

function MetadataIcon({ name }) {
  const paths = {
    tag: <><path d="M20 13 13 20l-9-9V4h7l9 9Z" /><circle cx="8" cy="8" r="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M11 17h2" /></>,
  };

  return (
    <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/**
 * ItemCard renders a single lost or found item formatted as a luggage tag.
 * Admin actions (mark claimed, delete) are displayed only when an admin is signed in.
 */
export default function ItemCard({ item, isAdmin, onClaim, onDelete }) {
  const [showDetails, setShowDetails] = useState(false);
  const isLost = item.kind === 'lost';
  const isClaimed = item.status === 'claimed';

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.title}"? This cannot be undone.`
    );
    if (confirmed) {
      onDelete(item.id);
    }
  };

  return (
    <article
      className={`tag-card ${isLost ? 'tag-lost' : 'tag-found'} ${
        isClaimed ? 'tag-claimed' : ''
      }`}
    >
      <div className="tag-header">
        <span
          className={`tag-badge ${
            isLost ? 'tag-badge-lost' : 'tag-badge-found'
          }`}
        >
          {isLost ? 'Lost' : 'Found'}
        </span>
        <button type="button" className="item-open-button" onClick={() => setShowDetails(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          View Details
        </button>
      </div>

      <ItemThumb
        imageUrl={item.photo_url || item.image_url || null}
        title={item.title}
        className="tag-image-wrapper"
      />

      <div className="tag-content">
        <h3 className="tag-title">{item.title}</h3>

        <div className="tag-metadata">
          <div className="meta-row">
            <MetadataIcon name="tag" />
            <span className="meta-label">Category:</span>
            <span className="meta-value">{item.category}</span>
          </div>

          <div className="meta-row">
            <MetadataIcon name="calendar" />
            <span className="meta-label">
              {isLost ? 'Last seen:' : 'Found on:'}
            </span>
            <span className="meta-value">{item.date_happened}</span>
          </div>

          <div className="meta-row">
            <MetadataIcon name="pin" />
            <span className="meta-label">Location:</span>
            <span className="meta-value">{item.location}</span>
          </div>
        </div>

        {item.description && (
          <p className="tag-description">{item.description}</p>
        )}

        <div className="tag-contact">
          <MetadataIcon name="phone" />
          <span className="meta-label">Contact: </span>
          <span className="meta-value">{item.contact}</span>
        </div>
      </div>

      {isAdmin && (
        <div className="tag-admin-actions">
          {!isClaimed && (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => onClaim(item.id)}
            >
              Mark claimed
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger btn-small"
            onClick={handleDelete}
          >
            Delete item
          </button>
        </div>
      )}
      {showDetails && <ItemDetailsModal item={item} onClose={() => setShowDetails(false)} isAdmin={isAdmin} />}
    </article>
  );
}
