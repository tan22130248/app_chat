import React, {useState, useEffect, useRef} from "react";
import {Phone, Video, Send} from 'lucide-react';
import {useAppSelector, useAppDispatch} from "../redux/hooks";
import {
    sendChatMessage,
    fetchPeopleMessages,
    checkUserStatus,
    addMessage,
    clearIncomingCall,
    setActiveCall,
    clearActiveCall,
    fetchUserList
} from "../redux/slices/chatSlice";
import WebSocketService from "../api/wsService";
import "../styles/chatDetail.css";
import MessageBubble from "../components/MessageBubble";
import EmojiPicker from "../components/EmojiPicker";
import ImageUploader from "../components/ImageUploader";
import CallModal from "../components/CallModal";
import VideoCallScreen from "../components/VideoCallScreenProps";

interface Props {
    name: string;
    onClose: () => void;
}

export default function ChatDetail({name, onClose}: Props) {
    const dispatch = useAppDispatch();
    const {messages, incomingCall, activeCall} = useAppSelector(state => state.chat);
    const [page, setPage] = useState(1);
    const [inputValue, setInputValue] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const {username} = useAppSelector((s: any) => s.auth);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const onlineStatuses = useAppSelector((s: any) => s.chat.onlineStatuses || {});
    const online = onlineStatuses[name];
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showAttachOptions, setShowAttachOptions] = useState(false);
    const [openImagePicker, setOpenImagePicker] = useState(false);
    const attachRef = useRef<HTMLDivElement | null>(null);

    // === TRẠNG THÁI CUỘC GỌI ===
    const [showCallModal, setShowCallModal] = useState(false);
    const [callStatus, setCallStatus] = useState<'ringing' | 'accepted' | 'ended'>('ringing');
    const [isInitiator, setIsInitiator] = useState(false);
    const [currentCallType, setCurrentCallType] = useState<'audio' | 'video'>('audio');
    const [showVideoCallScreen, setShowVideoCallScreen] = useState(false);
    const [isVideoCall, setIsVideoCall] = useState(false); // đánh dấu đang gọi video
    const [videoRemoteStream, setVideoRemoteStream] = useState<MediaStream | null>(null);
    const videoPcRef = useRef<RTCPeerConnection | null>(null);
    const videoLocalStreamRef = useRef<MediaStream | null>(null);
    const videoRemoteStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pendingWebRTCOfferRef = useRef<string | null>(null);

    // Tự động hiển thị phương thức khi có cuộc gọi đến từ người này
    useEffect(() => {
        if (incomingCall && incomingCall.callerName === name) {
            setIsInitiator(false);
            setShowCallModal(true);
            setCallStatus('ringing');
        }
    }, [incomingCall, name]);

    useEffect(() => {
        if (activeCall && activeCall.peerName === name) {
            setIsInitiator(!!activeCall.initiator);
            setCallStatus(activeCall.status);
            
            // For video calls, if already in progress, just update display
            if (activeCall.callType === 'video' && isVideoCall) {
                if (activeCall.status === 'accepted') {
                    setShowCallModal(false);
                    setShowVideoCallScreen(true);
                }
                return;
            }
            
            // For audio calls
            if (activeCall.callType === 'audio' || !isVideoCall) {
                setShowCallModal(true);
                if (activeCall.status === 'accepted' && activeCall.initiator) {
                    (async () => {
                        try {
                            const stream = await startLocalStream();
                            const pc = createPeerConnection();
                            if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream));
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            handleSendCall('WEBRTC_OFFER', offer.sdp || '');
                        } catch (err) {
                            console.error('[Audio Call] offer create error', err);
                        }
                    })();
                }
            }
        } else if (!activeCall) {
            // No active call, close modal
            if (showCallModal) {
                setCallStatus('ended');
                stopCallCleanup();
                setTimeout(() => setShowCallModal(false), 300);
            }
        }
    }, [activeCall, name, isVideoCall]);

    useEffect(() => {
        if (name) {
            setPage(1);
            dispatch(fetchPeopleMessages({name, page: 1}) as any);
            dispatch(checkUserStatus(name) as any);
        }
    }, [name, dispatch]);

    useEffect(() => {
        // Only auto-scroll to bottom on initial load (page 1). When loading older pages, keep user's scroll position.
        if (page === 1) {
            messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
        }
    }, [messages.length, page]);

    const contentRef = useRef<HTMLDivElement | null>(null);
    // Tham chiếu WebRTC
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    const serializeContent = () => {
        const el = contentRef.current;
        if (!el) return '';
        let out = '';
        el.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                out += node.textContent || '';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const e = node as HTMLElement;
                const iconName = e.dataset?.icon;
                if (iconName) {
                    out += `[icon]${iconName}`;
                } else {
                    out += e.innerText || '';
                }
            }
        });
        return out.trim();
    };

    const clearContent = () => {
        if (contentRef.current) contentRef.current.innerHTML = '';
    };

    // === TRÌNH XỬ LÝ CUỘC GỌI ===
    const handleSendCall = async (kind: string, callType: string) => {
        const callPayload = {kind} as any;
        // Cho phép truyền sdp hoặc candidate trong tham số callType cho các mục đích sử dụng cũ
        if (kind === 'WEBRTC_OFFER' || kind === 'WEBRTC_ANSWER') {
            callPayload.sdp = callType;
        } else if (kind === 'WEBRTC_ICE') {
            try {
                callPayload.candidate = JSON.parse(callType);
            } catch (err) {
                callPayload.candidate = callType;
            }
        } else {
            callPayload.callType = callType;
        }
        const jsonMessage = JSON.stringify(callPayload);
        dispatch(sendChatMessage({type: 'people', to: name, mes: jsonMessage}));
        dispatch(fetchUserList() as any);
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        const callType = incomingCall.callType || 'audio';
        setCurrentCallType(callType);
        setCallStatus('accepted');
        
        dispatch(setActiveCall({
            peerName: name,
            callType: callType,
            status: 'accepted',
            initiator: false
        }));

        // Send CALL_ACCEPT signal with callType
        handleSendCall('CALL_ACCEPT', callType);

        if (callType === 'video') {
            try {
                console.log('[Video] Receiver accepting video call');
                
                // Get camera and audio for video call with retry logic
                let stream: MediaStream | null = null;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: { 
                            facingMode: "user",
                            width: { min: 640, ideal: 1280, max: 1920 },
                            height: { min: 480, ideal: 720, max: 1080 }
                        }
                    });
                } catch (permErr: any) {
                    console.warn('[Video] Permission error, retrying with basic constraints:', permErr.name);
                    // Retry with basic constraints
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: true
                    });
                }
                
                if (!stream) {
                    throw new Error('Failed to get media stream');
                }
                
                console.log('[Video] Got local stream with tracks:', stream.getTracks().map(t => `${t.kind}(${t.enabled})`));
                videoLocalStreamRef.current = stream;
                setIsVideoCall(true);

                // Create PeerConnection and add tracks
                console.log('[Video] Creating PeerConnection for receiver');
                const pc = createVideoPeerConnection();
                
                console.log('[Video] Adding tracks to PC:', stream.getTracks().map(t => t.kind));
                const addedTracks: boolean[] = [];
                stream.getTracks().forEach(t => {
                    if (!t.enabled) {
                        console.warn(`[Video] ⚠️  ${t.kind} track is DISABLED! Enabling it...`);
                        t.enabled = true;
                    }
                    console.log(`[Video] Adding ${t.kind} track, enabled: ${t.enabled}`);
                    try {
                        const sender = pc.addTrack(t, stream!);
                        addedTracks.push(true);
                        console.log(`[Video] ✅ ${t.kind} track added successfully, sender:`, sender);
                    } catch (trackErr) {
                        console.error(`[Video] ❌ Failed to add ${t.kind} track:`, trackErr);
                        addedTracks.push(false);
                    }
                });
                
                if (addedTracks.some(x => !x)) {
                    console.error('[Video] ❌ Some tracks failed to add!');
                }

                // Show video screen immediately
                setShowCallModal(false);
                setShowVideoCallScreen(true);

                // If we have buffered OFFER, process it now
                if (pendingWebRTCOfferRef.current) {
                    console.log('[Video] Processing buffered WEBRTC_OFFER');
                    const sdp = pendingWebRTCOfferRef.current;
                    pendingWebRTCOfferRef.current = null;
                    
                    try {
                        console.log('[Video] Setting remote description (buffered OFFER)');
                        await pc.setRemoteDescription({type: 'offer', sdp: sdp});
                        console.log('[Video] Creating answer for buffered offer');
                        const answer = await pc.createAnswer();
                        console.log('[Video] Setting local description (answer)');
                        await pc.setLocalDescription(answer);
                        console.log('[Video] Sending WEBRTC_ANSWER');
                        handleSendCall('WEBRTC_ANSWER', answer.sdp || '');
                    } catch (e) {
                        console.error('[Video] Error processing buffered OFFER:', e);
                    }
                } else {
                    console.log('[Video] No buffered OFFER - waiting for WEBRTC_OFFER from initiator');
                }
            } catch (err: any) {
                console.error("Video call error:", err);
                
                // Better error message based on error type
                let errorMsg = "Không thể bật camera. Vui lòng kiểm tra quyền truy cập.";
                if (err.name === 'NotReadableError') {
                    errorMsg = "Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng nó.";
                } else if (err.name === 'NotAllowedError') {
                    errorMsg = "Bạn đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.";
                } else if (err.name === 'NotFoundError') {
                    errorMsg = "Không tìm thấy camera trên thiết bị này.";
                }
                
                alert(errorMsg);
                handleRejectCall();
            }
        } else {
            // Audio call
            setShowCallModal(true);
            startLocalStream().catch((err) => {
                console.error('Audio stream error:', err);
            });
        }
    };
    const createVideoPeerConnection = () => {
        if (videoPcRef.current) return videoPcRef.current;

        console.log('[Video] Creating new RTCPeerConnection');
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
            ]
        });

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                console.log('[Video] Sending ICE candidate');
                handleSendCall('WEBRTC_ICE', JSON.stringify(e.candidate));
            }
        };

        pc.ontrack = (e) => {
            console.log('[Video] ⭐ REMOTE TRACK RECEIVED:', e.track.kind, 'enabled:', e.track.enabled, 'readyState:', e.track.readyState);
            const stream = e.streams[0];
            if (!stream) {
                console.warn('[Video] ❌ ontrack called but stream is empty!');
                // Create stream if it doesn't exist
                const newStream = new MediaStream();
                newStream.addTrack(e.track);
                console.log('[Video] Created new stream with track');
                videoRemoteStreamRef.current = newStream;
                setVideoRemoteStream(newStream);
                return;
            }
            console.log('[Video] Stream has tracks:', stream.getTracks().map(t => `${t.kind}(${t.enabled})`));
            videoRemoteStreamRef.current = stream;
            setVideoRemoteStream(stream);
            console.log('[Video] ✅ Remote stream set to state, stream:', stream);
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[Video] ICE connection state:', pc.iceConnectionState);
        };

        pc.onconnectionstatechange = () => {
            console.log('[Video] 📊 Connection state:', pc.connectionState, 'ICE state:', pc.iceConnectionState);
            
            if (pc.connectionState === 'connected') {
                console.log('[Video] ✅ Connection established successfully!');
            }
            
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
                console.warn('[Video] ❌ Connection lost, state:', pc.connectionState);
                setShowVideoCallScreen(false);
                setShowCallModal(false);
                setCallStatus('ended');
                setIsVideoCall(false);

                if (videoPcRef.current) {
                    videoPcRef.current.close();
                    videoPcRef.current = null;
                }

                if (videoLocalStreamRef.current) {
                    videoLocalStreamRef.current.getTracks().forEach(track => track.stop());
                    videoLocalStreamRef.current = null;
                }

                handleSendCall('CALL_END', '');
            }
        };

        videoPcRef.current = pc;
        return pc;
    };
    const handleRejectCall = () => {
        setShowCallModal(false);
        setCallStatus('ended');
        dispatch(clearIncomingCall());
        dispatch(clearActiveCall());
        stopCallCleanup();
        handleSendCall('CALL_END', '');
    };

    const handleEndCall = () => {
        setShowCallModal(false);
        setCallStatus('ended');
        dispatch(clearIncomingCall());
        dispatch(clearActiveCall());
        stopCallCleanup();
        handleSendCall('CALL_END', '');
    };
    const initiateVideoCall = async () => {
        try {
            console.log('[Video] Initiator starting video call');
            setCurrentCallType('video');
            setIsVideoCall(true);
            setIsInitiator(true);
            setCallStatus('ringing');

            // Get camera immediately with retry logic
            let stream: MediaStream | null = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: { 
                        facingMode: "user",
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 480, ideal: 720, max: 1080 }
                    }
                });
            } catch (permErr: any) {
                console.warn('[Video] Permission error, retrying with basic constraints:', permErr.name);
                // Retry with basic constraints
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });
            }
            
            if (!stream) {
                throw new Error('Failed to get media stream');
            }
            
            console.log('[Video] Initiator got local stream with tracks:', stream.getTracks().map(t => `${t.kind}(${t.enabled})`));
            videoLocalStreamRef.current = stream;

            // Show video call screen immediately (not CallModal)
            setShowVideoCallScreen(true);

            // Create PeerConnection and add tracks BEFORE creating offer
            console.log('[Video] Initiator creating PeerConnection');
            const pc = createVideoPeerConnection();
            
            console.log('[Video] Initiator adding tracks to PC:', stream.getTracks().map(t => t.kind));
            const addedTracks: boolean[] = [];
            stream.getTracks().forEach(t => {
                if (!t.enabled) {
                    console.warn(`[Video] ⚠️  ${t.kind} track is DISABLED! Enabling it...`);
                    t.enabled = true;
                }
                console.log(`[Video] Initiator adding ${t.kind} track, enabled: ${t.enabled}`);
                try {
                    const sender = pc.addTrack(t, stream!);
                    addedTracks.push(true);
                    console.log(`[Video] ✅ ${t.kind} track added successfully, sender:`, sender);
                } catch (trackErr) {
                    console.error(`[Video] ❌ Failed to add ${t.kind} track:`, trackErr);
                    addedTracks.push(false);
                }
            });
            
            if (addedTracks.some(x => !x)) {
                console.error('[Video] ❌ Some tracks failed to add!');
            }

            // Create and send offer
            console.log('[Video] Initiator creating offer');
            const offer = await pc.createOffer();
            console.log('[Video] Initiator setting local description');
            await pc.setLocalDescription(offer);

            // Send CALL_REQUEST to notify
            console.log('[Video] Initiator sending CALL_REQUEST');
            handleSendCall('CALL_REQUEST', 'video');
            
            // Send SDP offer after a small delay to ensure receiver is ready
            setTimeout(() => {
                console.log('[Video] Initiator sending WEBRTC_OFFER');
                handleSendCall('WEBRTC_OFFER', offer.sdp || '');
            }, 100);
        } catch (err: any) {
            console.error('[Video Call] Failed to initiate:', err);
            
            // Better error message based on error type
            let errorMsg = "Không thể bật camera. Vui lòng kiểm tra quyền truy cập.";
            if (err.name === 'NotReadableError') {
                errorMsg = "Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng nó.";
            } else if (err.name === 'NotAllowedError') {
                errorMsg = "Bạn đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.";
            } else if (err.name === 'NotFoundError') {
                errorMsg = "Không tìm thấy camera trên thiết bị này.";
            }
            
            alert(errorMsg);
            setIsVideoCall(false);
            setShowVideoCallScreen(false);
        }
    };

    const startLocalStream = async () => {
        if (localStreamRef.current) return localStreamRef.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.warn('[Call] getUserMedia failed', err);
            throw err;
        }
    };

    const createPeerConnection = () => {
        if (pcRef.current) return pcRef.current;
        const pc = new RTCPeerConnection();
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                // gửi ứng viên thông qua tín hiệu
                handleSendCall('WEBRTC_ICE', JSON.stringify(e.candidate));
            }
        };
        pc.ontrack = (e) => {
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = e.streams[0];
                remoteAudioRef.current.play().catch(() => {
                });
            }
        };
        pcRef.current = pc;
        return pc;
    };

    const stopCallCleanup = () => {
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        if (videoPcRef.current) { videoPcRef.current.close(); videoPcRef.current = null; }

        if (videoLocalStreamRef.current) {
            videoLocalStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            videoLocalStreamRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        setVideoRemoteStream(null);
        setIsVideoCall(false);
        setShowVideoCallScreen(false);
    };

    const handleSend = async () => {
        const msg = serializeContent().trim();
        if (!msg) return;
        dispatch(addMessage({
            mes: msg,
            name: username,
            createAt: new Date().toISOString(),
            isOwn: true,
        }));

        clearContent();
        dispatch(sendChatMessage({type: 'people', to: name, mes: msg}));
        // Cập nhật recentChats cục bộ ngay khi gửi để giao diện sidebar phản ánh tin nhắn của chính mình
        try {
            // Lazy import util to avoid circular issues
            const { formatPreviewMessage } = await import('../utils/messagePreview');
            const recentChatsStr = localStorage.getItem("recentChats");
            const recentChats = recentChatsStr ? JSON.parse(recentChatsStr) : [];
            const preview = formatPreviewMessage(msg, 'Bạn');
            if (!(preview as any).skip) {
                const lastMessageText = (preview as any).text || `Bạn: ${msg}`;
                const chatName = name; // recipient
                const existingIndex = recentChats.findIndex((c: any) => c.name === chatName);
                const now = new Date().toISOString();
                if (existingIndex !== -1) {
                    recentChats[existingIndex] = {
                        ...recentChats[existingIndex],
                        lastMessage: lastMessageText,
                        time: now,
                    };
                } else {
                    recentChats.push({ name: chatName, lastMessage: lastMessageText, time: now });
                }
                recentChats.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
                localStorage.setItem("recentChats", JSON.stringify(recentChats));
                window.dispatchEvent(new CustomEvent("updateRecentChats", { detail: recentChats }));
            }
        } catch (err) {
            console.warn('[ChatDetail] Failed to update recent chats locally', err);
        }
        dispatch(fetchUserList() as any);
    };
    const handleImageSelect = async (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setOpenImagePicker(false);
    };

    const handleSendWithImage = async () => {
        if (!selectedImage) return;

        const msg = inputValue.trim() ? `${inputValue} ${selectedImage}` : selectedImage;

        dispatch(addMessage({
            mes: msg,
            name: username,
            createAt: new Date().toISOString(),
            isOwn: true,
        }));

        setInputValue("");
        setSelectedImage(null);
        dispatch(sendChatMessage({type: "people", to: name, mes: msg}));
        // Cập nhật recentChats cục bộ khi gửi kèm ảnh
        try {
            const { formatPreviewMessage } = await import('../utils/messagePreview');
            const recentChatsStr = localStorage.getItem("recentChats");
            const recentChats = recentChatsStr ? JSON.parse(recentChatsStr) : [];
            const preview = formatPreviewMessage(msg, 'Bạn');
            if (!(preview as any).skip) {
                const lastMessageText = (preview as any).text || `Bạn: ${msg}`;
                const chatName = name;
                const existingIndex = recentChats.findIndex((c: any) => c.name === chatName);
                const now = new Date().toISOString();
                if (existingIndex !== -1) {
                    recentChats[existingIndex] = {
                        ...recentChats[existingIndex],
                        lastMessage: lastMessageText,
                        time: now,
                    };
                } else {
                    recentChats.push({ name: chatName, lastMessage: lastMessageText, time: now });
                }
                recentChats.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
                localStorage.setItem("recentChats", JSON.stringify(recentChats));
                window.dispatchEvent(new CustomEvent("updateRecentChats", { detail: recentChats }));
            }
        } catch (err) {
            console.warn('[ChatDetail] Failed to update recent chats locally', err);
        }
        dispatch(fetchUserList() as any);
    };

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!attachRef.current) return;
            if (showAttachOptions && !attachRef.current.contains(e.target as Node)) {
                setShowAttachOptions(false);
            }
        };
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, [showAttachOptions]);

    const handleEmojiSelect = (emoji: string) => {
        // biểu tượng cảm xúc có định dạng [biểu tượng]tên
        const nameTag = emoji.replace(/\[icon\]/, '');
        const emojiMap: Record<string, string> = {
            'smile': '😊',
            'grin': '😃',
            'laughing': '😄',
            'heart_eyes': '😍',
            'wink': '😉',
            'cool': '😎',
            'thinking': '🤔',
            'wave': '👋',
            'clap': '👏',
            'pray': '🙏',
            '+1': '👍',
            '-1': '👎',
            'phone': '📱',
            'computer': '💻',
            'camera': '📷',
            'fire': '🔥',
            'star': '⭐',
            'heart': '❤️',
            'broken_heart': '💔',
            'ok_hand': '👌'
        };

        const fallback = emojiMap[nameTag] || '😊';

        // Chèn một thẻ span có thuộc tính data-icon vào vị trí con trỏ trong phần tử contenteditable.
        const sel = document.getSelection();
        if (!sel || !contentRef.current) return;
        const span = document.createElement('span');
        span.contentEditable = 'false';
        span.dataset.icon = nameTag;
        span.className = 'inline-icon';
        span.innerText = fallback;

        // Nếu vùng chọn hiện tại không nằm trong contentRef, hãy di chuyển con trỏ đến cuối contentRef
        let range: Range | null = null;
        try {
            if (sel.rangeCount > 0 && contentRef.current.contains(sel.anchorNode)) {
                range = sel.getRangeAt(0).cloneRange();
            } else {
                range = document.createRange();
                range.selectNodeContents(contentRef.current);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } catch (err) {
            // Phương án dự phòng: đặt phạm vi thành cuối
            range = document.createRange();
            range.selectNodeContents(contentRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        if (!range) return;
        range.deleteContents();
        range.insertNode(span);
        // Di chuyển con trỏ sau nút đã chèn
        range.setStartAfter(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Đảm bảo ô nhập liệu luôn được tập trung
        contentRef.current.focus();
    };

    const sortedMessages = [...messages].sort((a, b) => {
        if (!a.createAt || !b.createAt) return 0;
        return new Date(a.createAt).getTime() - new Date(b.createAt).getTime();
    });

    const loadMore = () => {
        if (!name) return;
        const next = page + 1;
        setPage(next);
        dispatch(fetchPeopleMessages({name, page: next}) as any);
    };

    // Lắng nghe trực tiếp các thông báo tín hiệu để chúng ta có thể xử lý các thông báo WEBRTC_* messages
    useEffect(() => {
        const unsub = WebSocketService.on('SEND_CHAT', async (data: any) => {
            if (!(data.status === 'success' && data.data)) return;
            const msg = {
                name: data.data.from || data.data.name || 'Unknown',
                to: data.data.to || '',
                mes: data.data.mes || '',
            };
            // Chỉ xử lý tin nhắn giữa người dùng hiện tại và cuộc trò chuyện đang mở
            if (!(msg.name === name || msg.to === name || msg.to === (username || ''))) return;
            try {
                const content = JSON.parse(msg.mes);
                if (!content.kind) return;

                // === PHẦN AUDIO GỐC – GIỮ NGUYÊN 100% ===
                if (content.kind === 'WEBRTC_OFFER') {
                    (async () => {
                        await startLocalStream();
                        const pc = createPeerConnection();
                        if (localStreamRef.current) {
                            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
                        }
                        await pc.setRemoteDescription({type: 'offer', sdp: content.sdp});
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        handleSendCall('WEBRTC_ANSWER', answer.sdp || '');
                    })().catch(e => console.error(e));
                } else if (content.kind === 'WEBRTC_ANSWER') {
                    (async () => {
                        if (pcRef.current) {
                            await pcRef.current.setRemoteDescription({type: 'answer', sdp: content.sdp});
                        }
                    })().catch(e => console.error(e));
                } else if (content.kind === 'WEBRTC_ICE') {
                    (async () => {
                        if (pcRef.current && content.candidate) {
                            try {
                                await pcRef.current.addIceCandidate(content.candidate);
                            } catch (err) {
                                console.warn('addIceCandidate failed', err);
                            }
                        }
                    })();
                }
                if (content.kind === 'WEBRTC_OFFER' && isVideoCall) {
                    (async () => {
                        try {
                            // If we haven't accepted the call yet (no PC created), buffer the offer
                            if (!videoPcRef.current && !callStatus.includes('accepted')) {
                                console.log('[Video] Buffering WEBRTC_OFFER - waiting for acceptance');
                                pendingWebRTCOfferRef.current = content.sdp;
                                return;
                            }
                            
                            // Use existing PC if available, otherwise create new one
                            console.log('[Video] Handling WEBRTC_OFFER');
                            const pc = videoPcRef.current || createVideoPeerConnection();
                            console.log('[Video] Setting remote description (OFFER)');
                            await pc.setRemoteDescription({type: 'offer', sdp: content.sdp});
                            console.log('[Video] Creating answer');
                            const answer = await pc.createAnswer();
                            console.log('[Video] Setting local description (ANSWER)');
                            await pc.setLocalDescription(answer);
                            console.log('[Video] Sending WEBRTC_ANSWER');
                            handleSendCall('WEBRTC_ANSWER', answer.sdp || '');
                        } catch (e) {
                            console.error('[Video] WEBRTC_OFFER handler error:', e);
                        }
                    })();
                } else if (content.kind === 'WEBRTC_ANSWER' && isVideoCall) {
                    (async () => {
                        try {
                            console.log('[Video] Handling WEBRTC_ANSWER');
                            if (videoPcRef.current) {
                                console.log('[Video] Setting remote description (ANSWER)');
                                await videoPcRef.current.setRemoteDescription({type: 'answer', sdp: content.sdp});
                                console.log('[Video] ✅ ANSWER set successfully');
                            } else {
                                console.warn('[Video] ❌ No PeerConnection to set ANSWER');
                            }
                        } catch (e) {
                            console.error('[Video] WEBRTC_ANSWER handler error:', e);
                        }
                    })();
                } else if (content.kind === 'WEBRTC_ICE' && isVideoCall) {
                    if (videoPcRef.current && content.candidate) {
                        try {
                            videoPcRef.current.addIceCandidate(content.candidate);
                        } catch (err) {
                            console.warn('[Video] addIceCandidate failed:', err);
                        }
                    }
                }

                if (content.kind === 'CALL_ACCEPT') {
                    if (msg.to && msg.to === username) {
                        dispatch(setActiveCall({
                            peerName: msg.name,
                            callType: content.callType || 'audio',
                            status: 'accepted',
                            initiator: true
                        }));
                    }
                    if (msg.name && msg.name === username) {
                        dispatch(setActiveCall({
                            peerName: msg.to,
                            callType: content.callType || 'audio',
                            status: 'accepted',
                            initiator: false
                        }));
                    }
                }
                if (content.kind === 'CALL_END') {
                    dispatch(clearIncomingCall());
                    dispatch(clearActiveCall());
                    stopCallCleanup();
                    setCallStatus('ended');
                    setTimeout(() => setShowCallModal(false), 300);
                }
            } catch (err) {
                // bỏ qua
            }
        });
        return () => unsub();
    }, [name, username]);
    return (
        <div className="chat-window-inner">
            <div className="chat-window-header">
                <div className="chat-window-user">
                    <div className="avatar-circle">{name.charAt(0)}</div>
                    <div className="user-meta">
                        <div className="user-name">{name}</div>
                        <div className={`user-sub ${online ? 'online' : 'offline'}`}>
                            {online === null ? 'Đang kiểm tra...' : (online ? 'online' : 'offline')}
                        </div>
                    </div>
                </div>
                <div className="chat-window-actions">
                    <button className="action-btn" title="Gọi thoại" onClick={() => {
                        setIsInitiator(true);
                        setShowCallModal(true);
                        setCallStatus('ringing');
                        // Gửi CALL_REQUEST
                        handleSendCall('CALL_REQUEST', 'audio');
                    }}>
                        <Phone size={18}/>
                    </button>
                    <button className="action-btn" title="Gọi video" onClick={initiateVideoCall}>
                        <Video size={18}/>
                    </button>
                </div>
            </div>

            <div className="chat-window-messages">

                <div className="load-more-container">
                    <button className="load-more-btn" onClick={loadMore}>Xem tin nhắn cũ</button>
                </div>

                {sortedMessages.map((m: any, idx: number) => {
                    const isOwn = m.name === username;
                    return (
                        <MessageBubble key={m.id || `${m.name}-${m.createAt}-${idx}`} text={m.mes} isOwn={isOwn}
                                       senderName={m.name}/>
                    );
                })}

                <div ref={messagesEndRef}/>
            </div>

            {selectedImage && (
                <div className="selected-image-preview">
                    <img src={selectedImage} alt="Preview"/>
                    <button
                        className="remove-image-btn"
                        onClick={() => setSelectedImage(null)}
                        title="Xóa ảnh"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="chat-window-input">
                <div className="attach-wrap" ref={attachRef}>
                    <button
                        className="btn-attach"
                        onClick={() => setShowAttachOptions((s) => !s)}
                        title="Thêm"
                    >
                        ➕
                    </button>
                    {showAttachOptions && (
                        <div className="attach-popover">
                            <button className="attach-option" onClick={() => {
                                setShowEmojiPicker(true);
                                setShowAttachOptions(false);
                            }}>
                                icon
                            </button>
                            <button className="attach-option" onClick={() => {
                                setOpenImagePicker(true);
                                setShowAttachOptions(false);
                            }}>
                                ảnh
                            </button>
                        </div>
                    )}
                </div>
                <ImageUploader
                    onImageSelect={handleImageSelect}
                    open={openImagePicker}
                />
                <div
                    ref={contentRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="input-content"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            selectedImage ? handleSendWithImage() : handleSend();
                        }
                    }}
                    data-placeholder={`Nhập tin nhắn tới ${name}...`}
                    tabIndex={0}
                />
                <button className="btn-send" onClick={selectedImage ? handleSendWithImage : handleSend} title="Gửi">
                    <Send size={18}/>
                </button>
            </div>

            {showEmojiPicker && (
                <EmojiPicker
                    onEmojiSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                />
            )}

            {/* GỌI MODAL */}
            <CallModal
                visible={showCallModal}
                callType={isInitiator ? 'initiator' : 'receiver'}
                recipientName={name}
                callerName={username || ''}
                callStatus={callStatus}
                onAccept={handleAcceptCall}
                onReject={handleRejectCall}
                onEnd={handleEndCall}
                onClose={() => setShowCallModal(false)}
            />
            {showVideoCallScreen && (
                <VideoCallScreen
                    peerName={name}
                    localStream={videoLocalStreamRef.current}
                    remoteStream={videoRemoteStream}
                    onEndCall={() => {
                        setShowVideoCallScreen(false);
                        handleEndCall();
                        if (videoPcRef.current) {
                            videoPcRef.current.close();
                            videoPcRef.current = null;
                        }
                        setVideoRemoteStream(null);
                    }}
                    isInitiator={isInitiator}
                />
            )}
            {/* phần tử âm thanh từ xa cho luồng đến */}
            <audio ref={remoteAudioRef as any} style={{display: 'none'}}/>
        </div>
    );
}