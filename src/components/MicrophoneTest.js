import React, { useEffect, useRef, useState } from 'react';

const MicrophoneTest = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  useEffect(() => {
    async function loadDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        setError(`Error loading devices: ${err.message}`);
      }
    }
    
    loadDevices();
  }, []);
  
  const startRecording = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      const constraints = {
        audio: selectedDevice 
          ? { deviceId: { exact: selectedDevice } } 
          : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(average);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      setIsRecording(true);
      setError(null);
      
    } catch (err) {
      setError(`Error accessing microphone: ${err.message}`);
      console.error('Microphone access error:', err);
    }
  };
  
  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsRecording(false);
    setAudioLevel(0);
  };
  
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Microphone Test</h2>
      
      {error && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Select Microphone:
        </label>
        <select 
          value={selectedDevice} 
          onChange={(e) => setSelectedDevice(e.target.value)}
          disabled={isRecording}
          style={{ 
            width: '100%', 
            padding: '8px', 
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        >
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
            </option>
          ))}
          {devices.length === 0 && (
            <option value="">No microphones found</option>
          )}
        </select>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <div style={{ marginBottom: '5px' }}>Audio Level:</div>
        <div style={{ 
          width: '100%', 
          height: '30px', 
          backgroundColor: '#eee',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, audioLevel * 2)}%`,
            backgroundColor: audioLevel < 1 ? '#f44336' : '#4caf50',
            transition: 'width 0.1s'
          }}></div>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#000',
            fontWeight: 'bold'
          }}>
            {audioLevel.toFixed(1)}
          </div>
        </div>
        {audioLevel < 1 && isRecording && (
          <div style={{ color: '#f44336', fontSize: '14px', marginTop: '5px' }}>
            Warning: No audio detected! Check your microphone.
          </div>
        )}
      </div>
      
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          backgroundColor: isRecording ? '#f44336' : '#2196f3',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        {isRecording ? 'Stop Testing' : 'Start Testing Microphone'}
      </button>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0 }}>Troubleshooting Tips</h3>
        <ul style={{ paddingLeft: '20px' }}>
          <li>Ensure your microphone is properly connected</li>
          <li>Check if your microphone is not muted in system settings</li>
          <li>Try allowing microphone permissions in your browser</li>
          <li>Try selecting a different microphone if available</li>
          <li>Try restarting your browser</li>
        </ul>
      </div>
    </div>
  );
};

export default MicrophoneTest; 