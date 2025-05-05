import React, { useState } from 'react';
import '../styles/pages/TaskDashboard.css';

const AddSectionModal = ({ isOpen, onClose, onAddSection }) => {
    const [newSectionName, setNewSectionName] = useState('');

    const handleAddSection = () => {
        if (newSectionName.trim()) {
            onAddSection(newSectionName);
            setNewSectionName('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="create-project-modal-overlay">
            <div className="create-project-modal">
                <div className="create-project-modal-title">Добавить раздел</div>
                <div className="create-project-modal-label">Название раздела</div>
                <input 
                    className="create-project-modal-input" 
                    value={newSectionName} 
                    onChange={(e) => setNewSectionName(e.target.value)} 
                    placeholder="Введите название раздела"
                    autoFocus
                />
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button 
                        className="create-project-modal-add-participant" 
                        onClick={handleAddSection}
                    >
                        Добавить
                    </button>
                    <button 
                        className="create-project-modal-add-participant" 
                        style={{ background: '#f5f5f5', color: '#333' }} 
                        onClick={onClose}
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSectionModal; 