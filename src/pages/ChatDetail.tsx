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
    fetchUserList, setIncomingCall
} from "../redux/slices/chatSlice";
import WebSocketService from "../api/wsService";
import {joinRoom} from "../api/chatApi";
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
    const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // === TRẠNG THÁI CUỘC GỌI ===
    const [showCallModal, setShowCallModal] = useState(false);
    const [callStatus, setCallStatus] = useState<'ringing' | 'accepted' | 'ended'>('ringing');
    const [isInitiator, setIsInitiator] = useState(false);
    const [currentCallType, setCurrentCallType] = useState<'audio' | 'video'>('audio');
    const [showVideoCallScreen, setShowVideoCallScreen] = useState(false);

    // ===== ZEGO VIDEO CALL =====
    const [showZegoVideo, setShowZegoVideo] = useState(false);
    const [zegoRoomId, setZegoRoomId] = useState<string>("");

    const getVideoRoomId = (a: string, b: string) =>
        ["video", a, b].sort().join("-");

    useEffect(() => {
        if (incomingCall && incomingCall.callerName === name) {
            console.log("[DEBUG INCOMING] Call từ:", incomingCall.callerName, "Type:", incomingCall.callType || "không có type");

            const callType = incomingCall.callType || 'audio'; // fallback nếu không có

            setIsInitiator(false);

            if (callType === 'video') {
                // Incoming là VIDEO CALL → hiện modal nhưng chuẩn bị cho Zego
                setShowCallModal(true);
                setCallStatus('ringing');
                // Optional: có thể set state riêng để biết là video incoming
                // Ví dụ: setIsVideoIncoming(true);
                console.log("[DEBUG] Incoming VIDEO call → modal ringing hiện, chờ accept");
            } else {
                // Incoming là AUDIO CALL → hiện modal audio bình thường
                setShowCallModal(true);
                setCallStatus('ringing');
                console.log("[DEBUG] Incoming AUDIO call → modal audio ringing");
            }
        }
    }, [incomingCall, name]);
    useEffect(() => {
        if (activeCall && activeCall.peerName === name) {
            setIsInitiator(!!activeCall.initiator);
            setShowCallModal(true);
            setCallStatus(activeCall.status);
            if (activeCall.status === 'accepted' && activeCall.initiator) {
                (async () => {
                    try {
                        const callType = activeCall.callType || 'audio';
                        if (callType === 'video') {
                            setShowVideoCallScreen(true);
                            setShowCallModal(false);
                        } else {
                            // Audio call – giữ nguyên logic gốc
                            const stream = await startLocalStream();
                            const pc = createPeerConnection();
                            if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream));
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            handleSendCall('WEBRTC_OFFER', offer.sdp || '');
                        }
                    } catch (err) {
                        console.error('[Call] offer create error', err);
                    }
                })();
            }
        } else if (!activeCall) {
            if (showCallModal) {
                setCallStatus('ended');
                stopCallCleanup();
                setTimeout(() => setShowCallModal(false), 300);
            }
        }
    }, [activeCall, name]);

    useEffect(() => {
        if (name) {
            setPage(1);
            dispatch(fetchPeopleMessages({name, page: 1}) as any);
            dispatch(checkUserStatus(name) as any);
        }
    }, [name, dispatch]);

    useEffect(() => {
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

    const handleSendCall = async (kind: string, callType: string) => {
        const callPayload = {kind} as any;
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
        setShowCallModal(false);

        handleSendCall('CALL_ACCEPT', '');
        dispatch(setActiveCall({
            peerName: name,
            callType: callType,
            status: 'accepted',
            initiator: false
        }));

        startLocalStream().catch(() => {
        });
    };
    const handleAcceptVideoCall = () => {
        if (!incomingCall) return;

        const data = JSON.parse(incomingCall.mes || '{}');
        if (!data.roomId) return;

        console.log("[VIDEO] ACCEPT – room:", data.roomId);

        setShowCallModal(false);
        setCallStatus('accepted');

        setZegoRoomId(data.roomId);
        setShowZegoVideo(true);

        handleSendCall(
            'CALL_ACCEPT_VIDEO',
            JSON.stringify({roomId: data.roomId})
        );

        dispatch(setActiveCall({
            peerName: name,
            callType: 'video',
            status: 'accepted',
            initiator: false
        }));
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
    const initiateVideoCall = () => {
        const roomId = ['zego', username, name].sort().join('-');

        setZegoRoomId(roomId);
        setIsInitiator(true);
        setCallStatus('ringing');
        setShowCallModal(true);

        dispatch(sendChatMessage({
            type: 'people',
            to: name,
            mes: JSON.stringify({
                kind: 'CALL_REQUEST',
                callType: 'video',
                roomId,
            }),
        }));

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
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
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
            const {formatPreviewMessage} = await import('../utils/messagePreview');
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
                    recentChats.push({name: chatName, lastMessage: lastMessageText, time: now});
                }
                recentChats.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
                localStorage.setItem("recentChats", JSON.stringify(recentChats));
                window.dispatchEvent(new CustomEvent("updateRecentChats", {detail: recentChats}));
            }
        } catch (err) {
            console.warn('[ChatDetail] Failed to update recent chats locally', err);
        }
        dispatch(fetchUserList() as any);
    };

    const handleJoinRoom = async (roomName: string) => {
        try {
            console.log(`[INVITE] ChatDetail: Joining room "${roomName}"...`);
            await joinRoom(roomName);
            console.log(`[INVITE] ChatDetail: Successfully joined room "${roomName}"`);

            // Thêm vào danh sách nhóm đã join
            setJoinedRooms(prev => {
                const newSet = new Set(prev);
                newSet.add(roomName);
                return newSet;
            });

            // Hiện thông báo thành công
            const successMsg = `✓ Bạn ${username} đã tham gia nhóm ${roomName}`;
            setNotification({type: 'success', message: successMsg});
            console.log(`[INVITE] ${successMsg}`);

            // Tự động ẩn thông báo sau 3 giây
            setTimeout(() => setNotification(null), 3000);

            // Gửi tin nhắn vào nhóm thông báo
            const joinMessage = `${username} đã chấp nhận vào nhóm`;
            dispatch(sendChatMessage({type: "room", to: roomName, mes: joinMessage}));
            console.log(`[INVITE] Sent join message to room "${roomName}": "${joinMessage}"`);

            dispatch(fetchUserList() as any);
        } catch (err) {
            console.error(`[INVITE] ChatDetail: Failed to join room "${roomName}":`, err);
            const errorMsg = `✗ Không thể tham gia nhóm ${roomName}`;
            setNotification({type: 'error', message: errorMsg});
            setTimeout(() => setNotification(null), 3000);
        }
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
            const {formatPreviewMessage} = await import('../utils/messagePreview');
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
                    recentChats.push({name: chatName, lastMessage: lastMessageText, time: now});
                }
                recentChats.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
                localStorage.setItem("recentChats", JSON.stringify(recentChats));
                window.dispatchEvent(new CustomEvent("updateRecentChats", {detail: recentChats}));
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

        const sel = document.getSelection();
        if (!sel || !contentRef.current) return;
        const span = document.createElement('span');
        span.contentEditable = 'false';
        span.dataset.icon = nameTag;
        span.className = 'inline-icon';
        span.innerText = fallback;

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
            range = document.createRange();
            range.selectNodeContents(contentRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        if (!range) return;
        range.deleteContents();
        range.insertNode(span);
        range.setStartAfter(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
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

    useEffect(() => {
        const unsub = WebSocketService.on('SEND_CHAT', async (data: any) => {
            if (!(data.status === 'success' && data.data)) return;
            const msg = {
                name: data.data.from || data.data.name || 'Unknown',
                to: data.data.to || '',
                mes: data.data.mes || '',
            };
            if (!(msg.name === name || msg.to === name || msg.to === (username || ''))) return;
            try {
                const content = JSON.parse(msg.mes);
                if (!content.kind) return;
                if (content.kind === 'CALL_REQUEST') {
                    dispatch(setIncomingCall({
                        callerName: msg.name,
                        callType: content.callType || 'audio',
                        mes: JSON.stringify({roomId: content.roomId}),
                    }));
                    return;
                }

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
                if (content.kind === 'CALL_ACCEPT_VIDEO') {
                    const data = JSON.parse(content.callType || '{}');
                    if (!data.roomId) return;

                    // 👉 CALLER VÀO PHÒNG ZEGO
                    setZegoRoomId(data.roomId);
                    setShowZegoVideo(true);

                    setCallStatus('accepted');
                    setShowCallModal(false);
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

                {notification && (
                    <div className={`join-notification notification-${notification.type}`}>
                        {notification.message}
                    </div>
                )}

                <div className="load-more-container">
                    <button className="load-more-btn" onClick={loadMore}>Xem tin nhắn cũ</button>
                </div>

                {sortedMessages.map((m: any, idx: number) => {
                    const isOwn = m.name === username;
                    return (
                        <MessageBubble
                            key={m.id || `${m.name}-${m.createAt}-${idx}`}
                            text={m.mes}
                            isOwn={isOwn}
                            senderName={m.name}
                            onJoinRoom={handleJoinRoom}
                            joinedRooms={joinedRooms}
                        />
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
                onAccept={
                    incomingCall?.callType === 'video'
                        ? handleAcceptVideoCall
                        : handleAcceptCall
                }
                onReject={handleRejectCall}
                onEnd={handleEndCall}
                onClose={() => setShowCallModal(false)}
            />
            {showZegoVideo && zegoRoomId && (
                <VideoCallScreen
                    roomId={zegoRoomId}
                    username={username}
                    peerName={name}
                    onEndCall={() => {
                        console.log("[DEBUG] End Zego call từ VideoCallScreen");
                        setShowZegoVideo(false);
                        setZegoRoomId("");
                        handleEndCall();
                    }}
                />
            )}
            <audio ref={remoteAudioRef as any} style={{display: 'none'}}/>
        </div>
    );
}