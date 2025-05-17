import React from 'react';
import '../../styles/components/call/CallBanner.css';

export default function CallBanner({ callState, onJoinRoom, onEndCall }) {
  if (!callState?.isCallActive) return null;

  return (
    <div className="call-banner" onClick={onJoinRoom}>
      <span className="call-status-text">
        Групповой звонок • нажмите, чтобы присоединиться
      </span>
      {/* маленькая кнопка «положить трубку» */}
      <button
        className="call-banner-end"
        onClick={(e) => { e.stopPropagation(); onEndCall(); }}
      >
        ✕
      </button>
    </div>
  );
} 