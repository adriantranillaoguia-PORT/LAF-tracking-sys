import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getFriendlyUploadError, uploadImage } from '../lib/uploadImage';

const CATEGORIES = [
  'Bag',
  'Phone / Gadget',
  'ID / Cards',
  'Keys',
  'Clothing',
  'Books / Notes',
  'Wallet',
  'Other',
];

/**
 * ItemForm allows public users to report a lost or found item.
 * Photos are uploaded to the public 'item-images' Supabase Storage bucket.
 */
export default function ItemForm({ onSubmitted, onCancel }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [kind, setKind] = useState('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Bag');
  const [dateHappened, setDateHappened] = useState(todayStr);
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const locationLabel =
    kind === 'lost' ? 'Where you last had it' : 'Where you found it';

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return '';
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file.');
      event.target.value = '';
      setPhotoFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Photo must be 5MB or smaller. Please choose a smaller image.');
      event.target.value = '';
      setPhotoFile(null);
      return;
    }

    setErrorMessage(null);

    setPhotoPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    setPhotoFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !location.trim() || !contact.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      let photoUrl = null;

      if (photoFile) {
        try {
          photoUrl = await uploadImage(photoFile);
        } catch (uploadError) {
          console.error('Photo upload failed before insert:', uploadError);
          setErrorMessage(getFriendlyUploadError(uploadError));
          return;
        }
      }

      const baseRecord = {
        kind,
        title: title.trim(),
        description: description.trim() || null,
        category,
        date_happened: dateHappened,
        location: location.trim(),
        contact: contact.trim(),
        status: 'open',
      };

      const candidateRecords = photoUrl
        ? [
            { ...baseRecord, photo_url: photoUrl },
            { ...baseRecord, image_url: photoUrl },
            baseRecord,
          ]
        : [baseRecord];

      let lastError = null;

      for (const record of candidateRecords) {
        const { error: insertError } = await supabase.from('items').insert([record]);

        if (!insertError) {
          if (onSubmitted) onSubmitted();
          return;
        }

        lastError = insertError;

        const lower = insertError.message.toLowerCase();
        if (!lower.includes('photo_url') && !lower.includes('image_url')) {
          throw new Error(`Failed to save item: ${insertError.message}`);
        }
      }

      throw new Error(
        lastError ? `Failed to save item: ${lastError.message}` : 'Failed to save item. Please try again.'
      );
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="form-heading">
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="form-heading" className="modal-title">
            Report an item
          </h2>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>

        {errorMessage && (
          <div className="banner banner-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-group">
            <label id="type-label">Item type</label>
            <div className="type-toggle-group" role="group" aria-labelledby="type-label">
              <button
                type="button"
                className={`type-toggle-btn ${
                  kind === 'lost' ? 'active-lost' : ''
                }`}
                onClick={() => setKind('lost')}
              >
                I lost an item
              </button>
              <button
                type="button"
                className={`type-toggle-btn ${
                  kind === 'found' ? 'active-found' : ''
                }`}
                onClick={() => setKind('found')}
              >
                I found an item
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="item-title">Item name (required)</label>
            <input
              id="item-title"
              type="text"
              required
              placeholder="e.g. Black leather wallet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-category">Category</label>
            <select
              id="item-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="item-date">Date</label>
            <input
              id="item-date"
              type="date"
              value={dateHappened}
              onChange={(e) => setDateHappened(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-location">{locationLabel} (required)</label>
            <input
              id="item-location"
              type="text"
              required
              placeholder="e.g. Science Library, 2nd floor desk"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-contact">Contact info (required)</label>
            <input
              id="item-contact"
              type="text"
              required
              placeholder="e.g. email@example.com or 555-0199"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-description">Description</label>
            <textarea
              id="item-description"
              rows={3}
              placeholder="Include distinctive details like brand, scratches, stickers, or contents"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-photo">Optional photo upload</label>
            <input
              id="item-photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={submitting}
            />

            {photoPreviewUrl && (
              <div className="photo-preview-wrap">
                <img src={photoPreviewUrl} alt="Selected preview" className="photo-preview-image" />
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreviewUrl((previous) => {
                      if (previous) URL.revokeObjectURL(previous);
                      return '';
                    });
                  }}
                  disabled={submitting}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Uploading...' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
