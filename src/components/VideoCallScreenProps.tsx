import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import '../styles/videoCallScreen.css';

interface VideoCallScreenProps {
    peerName: string;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onEndCall: () => void;
    isInitiator: boolean;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
                                                             peerName,
                                                             localStream,
                                                             remoteStream,
                                                             onEndCall,
                                                             isInitiator,
                                                         }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.error("Local video play failed:", e));
            console.log('[VideoCallScreen] Local stream set');
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            console.log('[VideoCallScreen] Setting remote stream:', remoteStream.getTracks().map(t => `${t.kind}(${t.enabled})`));
            remoteVideoRef.current.srcObject = remoteStream;
            // Don't call play() with autoPlay attribute already set
            // remoteVideoRef.current.play().catch(e => console.error("Remote video play failed:", e));
            console.log("Remote video assigned");
        }
    }, [remoteStream]);

    useEffect(() => {
        localStream?.getAudioTracks().forEach(t => t.enabled = isMicOn);
    }, [isMicOn, localStream]);

    useEffect(() => {
        localStream?.getVideoTracks().forEach(t => t.enabled = isCameraOn);
    }, [isCameraOn, localStream]);
    useEffect(() => {
        if (remoteStream) {
            console.log("Remote stream received in VideoCallScreen:", remoteStream.getTracks());
        }
    }, [remoteStream]);
    return (
        <div className="video-call-fullscreen">
            {/* Remote video - fullscreen */}
            <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="remote-video"
                onLoadedMetadata={() => console.log('[VideoCallScreen] ✅ Remote video metadata loaded')}
                onPlay={() => console.log('[VideoCallScreen] ✅ Remote video playing')}
                onCanPlay={() => console.log('[VideoCallScreen] Remote video can play')}
                onError={(e) => console.error('[VideoCallScreen] ❌ Remote video error:', e)}
            />

            <div className="call-info">
                <h2>{peerName}</h2>
                <p>{isInitiator ? 'Đang gọi video...' : 'Đang kết nối...'}</p>
            </div>

            {/* Local video - small corner */}
            <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="local-video"
                onLoadedMetadata={() => console.log('[VideoCallScreen] ✅ Local video metadata loaded')}
            />

            <div className="call-controls">
                <button onClick={() => setIsMicOn(!isMicOn)} className="ctrl-btn">
                    {isMicOn ? <Mic size={28} /> : <MicOff size={28} />}
                </button>

                <button onClick={onEndCall} className="ctrl-btn end-btn">
                    <PhoneOff size={32} />
                </button>

                <button onClick={() => setIsCameraOn(!isCameraOn)} className="ctrl-btn">
                    {isCameraOn ? <VideoIcon size={28} /> : <VideoOff size={28} />}
                </button>
            </div>
        </div>
    );
};

export default VideoCallScreen;