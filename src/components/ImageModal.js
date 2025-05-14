import React, { useEffect } from 'react';
import '../styles/components/ImageModal.css';

function ImageModal({ image, onClose }) {
    // Close modal when Escape key is pressed
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Prevent scrolling of background content when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div className="image-modal-overlay" onClick={onClose}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="image-modal-close" onClick={onClose}>×</button>
                <img 
                    src={image.src} 
                    alt={image.alt || 'Full size image'} 
                    className="image-modal-img" 
                />
            </div>
        </div>
    );
}

export default ImageModal; 