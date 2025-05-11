import '../styles/pages/MessengerPage.css';
import LeftMenuMessenger from "../components/LeftMenuMessenger";
import Chat from "../components/Chat";
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import CreateChatModal from '../components/CreateChatModal';

function MessengerPage() {
    const { chatId } = useParams();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    return (
        <div id="messenger-page-container">
            <LeftMenuMessenger onCreateChat={() => setCreateModalOpen(true)} />
            {chatId ? <Chat chatId={chatId} /> : <div className="messenger-placeholder">Выберите чат</div>}
            {isCreateModalOpen && (
                <CreateChatModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onChatCreated={() => setCreateModalOpen(false)}
                />
            )}
        </div>
    );
}

export default MessengerPage;