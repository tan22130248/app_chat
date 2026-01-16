import React, { useState, useMemo } from 'react';

interface Props {
  text: string;
  isOwn: boolean;
  senderName?: string;
  onJoinRoom?: (roomName: string) => void;
  joinedRooms?: Set<string>;
}

const MessageBubble: React.FC<Props> = ({ text, isOwn, senderName, onJoinRoom, joinedRooms }) => {
  const [expanded, setExpanded] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  // Kiểm tra xem tin nhắn có chứa URL hình ảnh Cloudinary hay không
  const imageUrlPattern = /https:\/\/res\.cloudinary\.com\/.*?\/image\/upload\/.*?\.(jpg|jpeg|png|gif|webp)/g;
  const hasImage = imageUrlPattern.test(text);
  const imageUrl = text.match(imageUrlPattern)?.[0];

  // Kiểm tra xem có phải tin nhắn mời không
  const isInviteMessage = useMemo(() => {
    return text.startsWith("[INVITE]");
  }, [text]);

  const inviteRoomName = useMemo(() => {
    if (!isInviteMessage) return null;
    return text.replace("[INVITE]", "");
  }, [text, isInviteMessage]);

  const handleJoinClick = async () => {
    if (!inviteRoomName || !onJoinRoom) return;
    setJoinLoading(true);
    try {
      console.log(`[INVITE] User clicking accept button for room "${inviteRoomName}"`);
      onJoinRoom(inviteRoomName);
    } finally {
      setJoinLoading(false);
    }
  };

  // Phân tích và hiển thị biểu tượng [icon]định dạng tên
  const isSignaling = useMemo(() => {
    try {
      const j = JSON.parse(text);
      return j && typeof j === 'object' && !!j.kind;
    } catch (e) {
      return false;
    }
  }, [text]);

  const signalingKind = useMemo(() => {
    if (!isSignaling) return null;
    try {
      const j = JSON.parse(text);
      return j.kind || null;
    } catch (e) {
      return null;
    }
  }, [text, isSignaling]);

  const renderMessage = (msg: string) => {
    // Regex để tìm tất cả các mẫu tên [icon]
    const iconPattern = /\[icon\](\w+)/g;
    const parts = msg.split(iconPattern);

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
      'ok_hand': '👌',
      'sweat_smile': '😅',
      'sweat': '😓',
      'joy': '😂',
      'kissing_heart': '😘',
      'smirk': '😏',
      'unamused': '😒',
      'stuck_out_tongue_winking_eye': '😜',
      'stuck_out_tongue': '😛',
      'sleeping': '😴',
      'worried': '😟',
      'frowning': '☹️',
      'anguished': '😧',
      'open_mouth': '😮',
      'grimacing': '😬',
      'confused': '😕',
      'hushed': '😯',
      'expressionless': '😑',
      'no_mouth': '😶',
      'sunglasses': '😎',
      'blush': '😊',
      'innocent': '😇',
      'rage': '😠',
      'disappointed': '😞',
      'sob': '😭',
      'cold_sweat': '😰',
      'scream': '😱',
      'astonished': '😲',
      'flushed': '😳',
      'mask': '😷',
      'dizzy_face': '😵',
      'kissing': '😗',
      'kissing_smiling_eyes': '😙',
      'stuck_out_tongue_closed_eyes': '😝',
      'nauseated_face': '🤢',
      'sneezing_face': '🤧',
      'vomiting_face': '🤮',
      'money_mouth_face': '🤑',
      'clown_face': '🤡',
      'cowboy_hat_face': '🤠',
      'hugging_face': '🤗',
      'thinking_face': '🤔',
      'hand_over_mouth': '🤭',
      'shushing_face': '🤫',
      'symbols': '🆘'
    };
    
    const elements: React.ReactNode[] = [];
    
    // Xử lý các phần được tách bằng icon pattern
    parts.forEach((part, index) => {
      if (index % 2 === 0) {
        // Chỉ mục chẵn = văn bản
        // Kiểm tra xem có chứa URL hình ảnh không
        const imageUrlMatches = part.match(imageUrlPattern) || [];
        
        if (imageUrlMatches.length > 0) {
          // Có hình ảnh, tách văn bản và hình ảnh
          const textParts = part.split(imageUrlPattern);
          
          textParts.forEach((text, textIdx) => {
            if (text.trim()) {
              elements.push(<span key={`text-${index}-${textIdx}`}>{text}</span>);
            }
            // Thêm hình ảnh sau mỗi phần văn bản (ngoại trừ phần cuối)
            if (textIdx < imageUrlMatches.length) {
              elements.push(
                <div key={`img-${index}-${textIdx}`} style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <img 
                    src={imageUrlMatches[textIdx]} 
                    alt="Message attachment" 
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                  />
                </div>
              );
            }
          });
        } else if (part.trim()) {
          // Không có hình ảnh, chỉ có văn bản
          elements.push(<span key={`text-${index}`}>{part}</span>);
        }
      } else {
        // Chỉ mục lẻ = biểu tượng (được chụp bởi icon pattern)
        const iconName = part;
        const emoji = emojiMap[iconName] || '😊';
        elements.push(
          <span key={`emoji-${index}`} className="msg-emoji" title={iconName}>
            {emoji}
          </span>
        );
      }
    });
    
    return elements.length > 0 ? elements : null;
  };
  
  // Hiển thị tin nhắn mời dạng đẹp
  if (isInviteMessage) {
    const isAlreadyJoined = joinedRooms && joinedRooms.has(inviteRoomName || '');
    
    return (
      <div className={`msg-row ${isOwn ? 'sent' : 'received'}`}>
        <div className={`msg-bubble invite-bubble ${isOwn ? 'own' : ''}`}>
          <div className="invite-message-content">
            <div className="invite-message-text">
              💌 <strong>{senderName}</strong> mời bạn tham gia nhóm <strong>{inviteRoomName}</strong>
            </div>
            {!isOwn && (
              isAlreadyJoined ? (
                <div className="invite-already-joined">
                  ✓ Bạn đã tham gia nhóm này
                </div>
              ) : (
                <button
                  onClick={handleJoinClick}
                  disabled={joinLoading}
                  className="invite-join-btn"
                >
                  {joinLoading ? "⏳ Đang tham gia..." : "✓ Chấp nhận mời"}
                </button>
              )
            )}
          </div>
          <div className="msg-time">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    );
  }
  
  // Nếu là thông báo tín hiệu, hãy hiển thị giao diện người dùng nhỏ gọn
  if (isSignaling) {
    const parsed = (() => { try { return JSON.parse(text); } catch { return null; } })();
    
    // Ẩn các tin nhắn signaling chi tiết (ICE/Offer/Answer) khỏi giao diện
    if (parsed?.kind === 'WEBRTC_ICE' || parsed?.kind === 'WEBRTC_OFFER' || parsed?.kind === 'WEBRTC_ANSWER') {
      console.log('[WebRTC signaling hidden]', parsed);
      return null; // Không hiển thị ICE/Offer/Answer trên chat
    }


    const friendly = (k: string | null) => {
      if (!k) return 'Signaling';
      const map: Record<string,string> = {
        'WEBRTC_OFFER': 'WebRTC Offer',
        'WEBRTC_ANSWER': 'WebRTC Answer',
        'WEBRTC_ICE': 'Gửi ICE Candidate',
        'CALL_REQUEST': 'Yêu cầu gọi',
        'CALL_ACCEPT': 'Người nhận đồng ý',
        'CALL_END': 'Kết thúc cuộc gọi'
      };
      return map[k] || k;
    };

    return (
      <div className={`msg-row ${isOwn ? 'sent' : 'received'}`}>
        <div className={`msg-bubble signaling ${isOwn ? 'own' : ''}`}>
          <div className="msg-text signaling-header">
            <strong>{friendly(signalingKind)}</strong>
            {signalingKind === 'CALL_REQUEST' && parsed?.callType ? (<span className="call-type"> • {parsed.callType}</span>) : null}
            {/*<button className="show-details-btn" onClick={() => setExpanded(s => !s)} style={{marginLeft:12}}>*/}
            {/*  {expanded ? 'Ẩn' : 'Chi tiết'}*/}
            {/*</button>*/}
          </div>
          {expanded && (
            <pre className="msg-signaling-pre">{JSON.stringify(parsed, null, 2)}</pre>
          )}
          <div className="msg-time">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`msg-row ${isOwn ? 'sent' : 'received'}`}>
      <div className={`msg-bubble ${isOwn ? 'own' : ''}`}>
        <div className="msg-text">{renderMessage(text)}</div>
        <div className="msg-time">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
};

export default MessageBubble;
