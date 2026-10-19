import { useEffect, useMemo, useState } from 'react';

export default function ItemThumb({ imageUrl, title, className = '' }) {
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const initials = useMemo(() => {
    if (!title) return '??';

    const words = title.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  }, [title]);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!isExpanded) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const shouldShowImage = Boolean(imageUrl) && !hasError;

  const handleImageError = () => setHasError(true);

  return (
    <>
      <div
        className={`item-thumb ${className}`.trim()}
        onClick={shouldShowImage ? () => setIsExpanded(true) : undefined}
        role={shouldShowImage ? 'button' : undefined}
        tabIndex={shouldShowImage ? 0 : -1}
        onKeyDown={(event) => {
          if (shouldShowImage && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setIsExpanded(true);
          }
        }}
      >
        {shouldShowImage ? (
          <img
            src={imageUrl}
            alt={title || 'Item photo'}
            loading="lazy"
            className="item-thumb-image"
            onError={handleImageError}
          />
        ) : (
          <span className="item-thumb-fallback">{initials}</span>
        )}
      </div>

      {shouldShowImage && isExpanded && (
        <div
          className="item-thumb-modal-backdrop"
          onClick={() => setIsExpanded(false)}
          role="presentation"
        >
          <div
            className="item-thumb-modal"
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Item photo'}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="item-thumb-modal-close"
              onClick={() => setIsExpanded(false)}
              aria-label="Close full-size image"
            >
              ×
            </button>
            <img src={imageUrl} alt={title || 'Item photo'} className="item-thumb-modal-image" />
          </div>
        </div>
      )}
    </>
  );
}
