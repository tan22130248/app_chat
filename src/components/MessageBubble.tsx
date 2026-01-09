import React, { useState, useMemo } from 'react';

interface Props {
  text: string;
  isOwn: boolean;
  senderName?: string;
}

const MessageBubble: React.FC<Props> = ({ text, isOwn, senderName }) => {
  const [expanded, setExpanded] = useState(false);
  // Kiểm tra xem tin nhắn có chứa URL hình ảnh Cloudinary hay không
  const imageUrlPattern = /https:\/\/res\.cloudinary\.com\/.*?\/image\/upload\/.*?\.(jpg|jpeg|png|gif|webp)/g;
  const hasImage = imageUrlPattern.test(text);
  const imageUrl = text.match(imageUrlPattern)?.[0];

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
    
    return parts.map((part, index) => {
      // Lẻ chỉ mục = văn bản, chỉ mục chẵn = tên biểu tượng (được chụp bởi nhóm)
      if (index % 2 === 0) {
        // Phần văn bản - loại bỏ URL nếu là hình ảnh
        const textWithoutUrl = part.replace(imageUrlPattern, '').trim();
        return textWithoutUrl ? <span key={index}>{textWithoutUrl}</span> : null;
      } else {
        // Phần tên biểu tượng (từ nhóm chụp)
        const iconName = part;
        // Sử dụng dự phòng biểu tượng cảm xúc thay vì tải ảnh
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
        
        const emoji = emojiMap[iconName] || '😊';
        return (
          <span key={index} className="msg-emoji" title={iconName}>
            {emoji}
          </span>
        );
      }
    });
  };
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
        {imageUrl && (
          <div className="msg-image-container">
            <img src={imageUrl} alt="Chat" className="msg-image" />
          </div>
        )}
        <div className="msg-text">{renderMessage(text)}</div>
        <div className="msg-time">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
};

export default MessageBubble;
