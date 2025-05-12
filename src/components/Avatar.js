import React from 'react';
import Girl from '../assets/icons/profile_picture.svg';

/**
 * Компонент аватара пользователя
 * @param {Object} props
 * @param {string} props.name - Имя пользователя для отображения инициалов и генерации фона
 * @param {string} [props.src] - URL изображения аватара
 * @param {string} [props.size='medium'] - Размер аватара: 'small', 'medium', 'large'
 * @param {Object} [props.style] - Дополнительные стили
 * @returns {JSX.Element}
 */
const Avatar = ({ name, src, size = 'medium', style = {} }) => {
    const sizes = {
        small: { width: '24px', height: '24px', fontSize: '10px' },
        medium: { width: '36px', height: '36px', fontSize: '14px' },
        large: { width: '48px', height: '48px', fontSize: '18px' }
    };
    
    const sizeStyle = sizes[size] || sizes.medium;
    
    const generateColor = (name) => {
        if (!name) return '#E0E0E0';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    };
    
    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };
    
    const containerStyle = {
        ...sizeStyle,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: generateColor(name),
        color: '#FFFFFF',
        fontWeight: 'bold',
        ...style
    };
    
    return (
        <div style={containerStyle}>
            {src ? (
                <img 
                    src={src} 
                    alt={name || 'Avatar'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
            ) : (
                getInitials(name)
            )}
        </div>
    );
};

export default Avatar; 