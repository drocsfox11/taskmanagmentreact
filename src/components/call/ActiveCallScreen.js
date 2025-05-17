import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMicrophone, 
  faMicrophoneSlash, 
  faVideo, 
  faVideoSlash, 
  faPhoneSlash,
  faVolumeUp,
  faVolumeXmark,
  faVolumeHigh,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/components/call/ActiveCallScreen.css';

const ActiveCallScreen = ({ 
  remoteStream, 
  localStream,
  callType,
  chatName,
  isAudioMuted,
  isVideoDisabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  callService
}) => {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [audioVolume, setAudioVolume] = useState(1.0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [audioPlaybackFailed, setAudioPlaybackFailed] = useState(false);
  const [rtcStats, setRtcStats] = useState({
    audioBytesReceived: 0,
    packetsLost: 0,
    lastUpdated: null
  });
  const [debugInfo, setDebugInfo] = useState({
    remoteStreamTracks: 0,
    localStreamTracks: 0,
    hasAudioTrack: false,
    audioTrackEnabled: false,
    audioTrackMuted: false
  });

  // Проверяем наличие аудиотреков каждую секунду
  useEffect(() => {
    const checkAudioInterval = setInterval(() => {
      if (remoteStream) {
        const tracks = remoteStream.getTracks();
        const audioTracks = tracks.filter(t => t.kind === 'audio');
        const audioTrack = audioTracks.length > 0 ? audioTracks[0] : null;
        
        setDebugInfo({
          remoteStreamTracks: tracks.length,
          localStreamTracks: localStream ? localStream.getTracks().length : 0,
          hasAudioTrack: audioTracks.length > 0,
          audioTrackEnabled: audioTrack ? audioTrack.enabled : false,
          audioTrackMuted: audioTrack ? audioTrack.muted : false
        });
        
        // Пытаемся включить аудиотрек, если он существует
        if (audioTrack && !audioTrack.enabled) {
          console.log('Enabling disabled audio track');
          audioTrack.enabled = true;
        }
        
        // Check if track is muted - this is different from enabled
        if (audioTrack && audioTrack.muted) {
          console.log('Audio track is muted - this may prevent sound from playing');
          
          // Add onunmute listener if not already added
          if (!audioTrack._hasUnmuteListener) {
            audioTrack.onunmute = () => {
              console.log('Audio track unmuted event triggered');
              // Force audio element to re-evaluate
              if (remoteAudioRef.current) {
                console.log('Re-applying srcObject after unmute');
                const currentStream = remoteAudioRef.current.srcObject;
                remoteAudioRef.current.srcObject = null;
                setTimeout(() => {
                  remoteAudioRef.current.srcObject = currentStream;
                  remoteAudioRef.current.play().catch(e => console.error('Play after unmute failed:', e));
                }, 10);
              }
            };
            audioTrack._hasUnmuteListener = true;
          }
        }
      }
    }, 1000);
    
    return () => clearInterval(checkAudioInterval);
  }, [remoteStream, localStream]);

  // Set up video and audio streams
  useEffect(() => {
    // Подробно логируем remoteStream при каждом его изменении
    if (remoteStream) {
      const tracks = remoteStream.getTracks();
      console.log('ActiveCallScreen received remoteStream:', {
        id: remoteStream.id,
        active: remoteStream.active,
        trackCount: tracks.length,
        audioTracks: tracks.filter(t => t.kind === 'audio').length,
        videoTracks: tracks.filter(t => t.kind === 'video').length
      });
      
      // Подробная информация о каждом треке
      tracks.forEach((track, idx) => {
        console.log(`Track ${idx} details:`, {
          kind: track.kind,
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          constraints: track.getConstraints(),
          settings: track.getSettings()
        });
      });
    } else {
      console.warn('ActiveCallScreen: remoteStream is null or undefined');
    }
    
    // Set up video elements
    if (remoteVideoRef.current && remoteStream) {
      console.log('Setting remote video stream with ID:', remoteStream.id);
      remoteVideoRef.current.srcObject = remoteStream;
      
      // Логируем состояние видео элемента
      console.log('Remote video element state:', {
        readyState: remoteVideoRef.current.readyState,
        networkState: remoteVideoRef.current.networkState,
        paused: remoteVideoRef.current.paused,
        currentSrc: remoteVideoRef.current.currentSrc,
        videoWidth: remoteVideoRef.current.videoWidth,
        videoHeight: remoteVideoRef.current.videoHeight
      });
    }
    
    if (localVideoRef.current && localStream) {
      console.log('Setting local video stream with ID:', localStream.id);
      localVideoRef.current.srcObject = localStream;
    }
    
    // Set up audio element - only one time when remoteStream changes
    if (remoteAudioRef.current && remoteStream) {
      console.log('Setting up audio with remoteStream ID:', remoteStream.id);
      
      // Проверка на аудиотреки и их статус
      const audioTracks = remoteStream.getAudioTracks();
      console.log('Audio tracks in remoteStream:', audioTracks.map(track => ({
        id: track.id,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
      })));
      
      // Параметры аудио
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.volume = audioVolume;
      remoteAudioRef.current.muted = false;
      
      // Важно: устанавливаем srcObject только один раз
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        console.log('Setting new audio srcObject');
        remoteAudioRef.current.srcObject = remoteStream;
        
        // После установки нового srcObject, пробуем воспроизвести после короткой задержки
        setTimeout(() => {
          const playPromise = remoteAudioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('Audio playback started successfully after short delay');
              setAudioPlaybackFailed(false);
            }).catch(err => {
              console.error('Failed to play audio after delay:', err);
              setAudioPlaybackFailed(true);
              
              // Try with muted first if autoplay was blocked
              if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                console.log('Trying with muted first...');
                remoteAudioRef.current.muted = true;
                
                remoteAudioRef.current.play()
                  .then(() => {
                    console.log('Muted playback successful, unmuting...');
                    setTimeout(() => {
                      remoteAudioRef.current.muted = false;
                      console.log('Audio unmuted, should be audible now');
                    }, 500);
                  })
                  .catch(muteErr => {
                    console.error('Even muted playback failed:', muteErr);
                    setAudioPlaybackFailed(true);
                  });
              }
            });
          }
        }, 100);
      }
      
      // Логируем состояние аудио элемента
      console.log('Remote audio element state:', {
        readyState: remoteAudioRef.current.readyState,
        networkState: remoteAudioRef.current.networkState,
        paused: remoteAudioRef.current.paused,
        currentSrc: remoteAudioRef.current.currentSrc,
        volume: remoteAudioRef.current.volume,
        muted: remoteAudioRef.current.muted
      });
    }
  }, [remoteStream, localStream, audioVolume]);
  
  // Ручной запуск аудио при нажатии на кнопку
  const handleManualAudioStart = () => {
    if (!remoteAudioRef.current || !remoteStream) return;
    
    console.log('Ручной запуск аудио');
    remoteAudioRef.current.muted = false;
    remoteAudioRef.current.volume = 1.0;
    
    remoteAudioRef.current.play()
      .then(() => {
        console.log('Аудио запущено вручную');
        setAudioPlaybackFailed(false);
      })
      .catch(err => {
        console.error('Ручной запуск аудио не удался:', err);
      });
  };
  
  // Toggle remote audio volume on/off
  const toggleRemoteAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    setAudioVolume(isAudioEnabled ? 0 : 1.0);
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isAudioEnabled ? 0 : 1.0;
    }
  };

  // Add stats monitoring effect
  useEffect(() => {
    if (!callService || !callService.peerConnection) return;
    
    const statsInterval = setInterval(async () => {
      try {
        const stats = await callService.peerConnection.getStats();
        let inboundAudioStats = null;
        let outboundAudioStats = null;
        let candidatePairStats = null;
        
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            inboundAudioStats = report;
          }
          else if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            outboundAudioStats = report;
          }
          else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            candidatePairStats = report;
          }
        });
        
        // Log comprehensive diagnostics
        console.log('WebRTC Stats Summary:', {
          inbound: inboundAudioStats ? {
            bytesReceived: inboundAudioStats.bytesReceived,
            packetsReceived: inboundAudioStats.packetsReceived,
            packetsLost: inboundAudioStats.packetsLost,
            jitter: inboundAudioStats.jitter,
            timestamp: inboundAudioStats.timestamp
          } : 'No inbound audio data',
          
          outbound: outboundAudioStats ? {
            bytesSent: outboundAudioStats.bytesSent,
            packetsSent: outboundAudioStats.packetsSent,
            timestamp: outboundAudioStats.timestamp
          } : 'No outbound audio data',
          
          connection: candidatePairStats ? {
            localCandidate: candidatePairStats.localCandidateId,
            remoteCandidate: candidatePairStats.remoteCandidateId,
            availableOutgoingBitrate: candidatePairStats.availableOutgoingBitrate,
            state: candidatePairStats.state
          } : 'No active connection'
        });
        
        if (inboundAudioStats) {
          setRtcStats({
            audioBytesReceived: inboundAudioStats.bytesReceived,
            packetsLost: inboundAudioStats.packetsLost || 0,
            lastUpdated: new Date().toTimeString().split(' ')[0]
          });
        }
        
        // Warning for no audio transmission
        if (outboundAudioStats && outboundAudioStats.bytesSent === 0) {
          console.warn('WARNING: No audio data is being sent! Check microphone.');
        }
        
        // Check for ICE connection issues
        if (!candidatePairStats && callService.peerConnection.iceConnectionState !== 'checking') {
          console.warn('WARNING: No active ICE candidate pair found.');
        }
      } catch (err) {
        console.error('Error fetching WebRTC stats:', err);
      }
    }, 2000);
    
    return () => clearInterval(statsInterval);
  }, [callService]);

  // Add a function to try forcing audio to play when needed
  const forceAudioPlay = useCallback(() => {
    if (!remoteAudioRef.current || !remoteStream) return;
    
    console.log('Attempting to force audio playback');
    
    // Make sure audio is not muted in the HTML element
    remoteAudioRef.current.muted = false;
    remoteAudioRef.current.volume = 1.0;
    
    // Try a trick to "wake up" the browser audio system
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(remoteStream);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    source.disconnect();
    
    // Try to play the audio element
    remoteAudioRef.current.play()
      .then(() => {
        console.log('Forced audio playback successful');
        setAudioPlaybackFailed(false);
      })
      .catch(err => {
        console.error('Forced audio playback failed:', err);
        setAudioPlaybackFailed(true);
      });
  }, [remoteStream]);
  
  // Add a button to manually try to force unmute tracks
  const forceUnmuteAudioTracks = useCallback(() => {
    if (!remoteStream) return;
    
    const audioTracks = remoteStream.getAudioTracks();
    console.log('Attempting to force unmute audio tracks:', audioTracks.length);
    
    if (audioTracks.length > 0) {
      // Try various techniques to unmute the track
      audioTracks.forEach(track => {
        console.log('Track before force:', {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
        
        // Explicitly enable the track
        track.enabled = true;
        
        // Some implementations respond to this alternating pattern
        if (track.muted) {
          const origEnabled = track.enabled;
          track.enabled = false;
          setTimeout(() => {
            track.enabled = origEnabled;
          }, 10);
        }
      });
      
      // After trying to unmute tracks, try to restart audio playback
      forceAudioPlay();
    }
  }, [remoteStream, forceAudioPlay]);

  return (
    <div className="active-call-container">
      <div className="active-call-header">
        <h3>Разговор с {chatName}</h3>
        
        {/* Debug info */}
        <div className="call-debug-info">
          <small>
            Tracks: {debugInfo.remoteStreamTracks} | 
            Audio: {debugInfo.hasAudioTrack ? 'Yes' : 'No'} | 
            Enabled: {debugInfo.audioTrackEnabled ? 'Yes' : 'No'} |
            Muted: {debugInfo.audioTrackMuted ? 'Yes' : 'No'}
          </small>
          <small>
            Bytes Received: {rtcStats.audioBytesReceived} | 
            Packets Lost: {rtcStats.packetsLost} |
            Updated: {rtcStats.lastUpdated}
          </small>
        </div>
        
        {/* Кнопка для ручного запуска аудио если автозапуск не удался */}
        {audioPlaybackFailed && (
          <>
          <button 
            className="manual-audio-start-btn"
            onClick={handleManualAudioStart}
          >
            <FontAwesomeIcon icon={faTriangleExclamation} /> Нажмите чтобы включить звук
          </button>
            <button 
              className="manual-audio-start-btn"
              onClick={forceUnmuteAudioTracks}
              style={{ marginTop: '5px', backgroundColor: '#3498db' }}
            >
              <FontAwesomeIcon icon={faVolumeHigh} /> Принудительно включить аудио
            </button>
          </>
        )}
      </div>
      
      {/* Выделенный аудио элемент для удаленного потока */}
      <audio 
        ref={remoteAudioRef}
        autoPlay
        playsInline
        muted={false} 
        controls  // Add controls for debugging
        style={{ display: 'none' }} // Hide the controls in production
      />
      
      <div className="active-call-content">
        {callType === 'VIDEO' && (
          <div className="active-call-videos">
            {/* Remote Video (Full screen) */}
            <div className="remote-video-container">
              <video 
                ref={remoteVideoRef} 
                className="remote-video" 
                autoPlay 
                playsInline
              />
              
              {/* Display user name when video is disabled */}
              <div className="remote-user-info">
                <div className="remote-user-avatar">
                  {chatName.charAt(0).toUpperCase()}
                </div>
                <div className="remote-user-name">{chatName}</div>
              </div>
            </div>
            
            {/* Local Video (Small pip) */}
            <div className="local-video-container">
              <video 
                ref={localVideoRef} 
                className="local-video" 
                autoPlay 
                playsInline 
                muted 
              />
            </div>
          </div>
        )}
        
        {callType === 'AUDIO' && (
          <div className="audio-call-display">
            <div className="audio-call-avatar">
              {chatName.charAt(0).toUpperCase()}
            </div>
            <div className="audio-call-name">{chatName}</div>
          </div>
        )}
      </div>
      
      <div className="active-call-controls">
        <button 
          className={`call-control-btn ${isAudioMuted ? 'muted' : ''}`} 
          onClick={onToggleAudio}
          title={isAudioMuted ? "Включить микрофон" : "Выключить микрофон"}
        >
          <FontAwesomeIcon icon={isAudioMuted ? faMicrophoneSlash : faMicrophone} />
        </button>
        
        {callType === 'VIDEO' && (
          <button 
            className={`call-control-btn ${isVideoDisabled ? 'disabled' : ''}`} 
            onClick={onToggleVideo}
            title={isVideoDisabled ? "Включить видео" : "Выключить видео"}
          >
            <FontAwesomeIcon icon={isVideoDisabled ? faVideoSlash : faVideo} />
          </button>
        )}
        
        <button 
          className={`call-control-btn ${isAudioEnabled ? '' : 'disabled'}`} 
          onClick={toggleRemoteAudio}
          title={isAudioEnabled ? "Выключить звук" : "Включить звук"}
        >
          <FontAwesomeIcon icon={isAudioEnabled ? faVolumeUp : faVolumeXmark} />
        </button>
        
        <button 
          className="call-control-btn end-call" 
          onClick={onEndCall}
          title="Завершить звонок"
        >
          <FontAwesomeIcon icon={faPhoneSlash} />
        </button>
      </div>
    </div>
  );
};

export default ActiveCallScreen; 