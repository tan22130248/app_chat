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

function truncate(s: string, n = 50) {
    if (!s) return '';
    return s.length > n ? s.substring(0, n) + '...' : s;
}

export function formatPreviewMessage(mes: string, senderDisplayName: string) {
    if (!mes) return `${senderDisplayName}: `;

    // Thử sử dụng JSON (thông điệp gọi/báo hiệu)

    try {
        const obj = JSON.parse(mes);
        if (obj && obj.kind) {
            const kind: string = obj.kind;
            if (kind.startsWith('WEBRTC_')) {
                // Các tin nhắn báo hiệu (ICE/OFFER/ANSWER) không nên xuất hiện trong các cuộc trò chuyện gần đây.
                return { skip: true };
            }
            if (kind === 'CALL_REQUEST') {
                const callType = obj.callType || '';
                return { text: `${senderDisplayName}: Yêu cầu gọi${callType ? ' (' + callType + ')' : ''}` };
            }
            if (kind === 'CALL_ACCEPT') return { text: `${senderDisplayName}: Đồng ý cuộc gọi` };
            if (kind === 'CALL_END') return { text: `${senderDisplayName}: Kết thúc cuộc gọi` };
            return { text: `${senderDisplayName}: ${kind}` };
        }
    } catch (e) {
    }

    // Thay thế các thẻ biểu tượng như [icon]name bằng biểu tượng cảm xúc
    let replaced = mes.replace(/\[icon\](\w+)/g, (_, tag) => emojiMap[tag] || emojiMap[tag] || '😊');

    // Phát hiện URL hình ảnh
    const imgRegex = /(https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?)/i;
    if (imgRegex.test(replaced) || /^https?:\/\//i.test(replaced) && /\.(png|jpe?g|gif|webp|svg)/i.test(replaced)) {
        return { text: `${senderDisplayName}: Ảnh` };
    }

    // Nếu toàn bộ thông báo trông giống như một URL nhưng không phải hình ảnh, hãy hiển thị 'Liên kết'
    const urlRegex = /^https?:\/\//i;
    if (urlRegex.test(replaced)) {
        return { text: `${senderDisplayName}: Link` };
    }

    return { text: `${senderDisplayName}: ${truncate(replaced)}` };
}

export default formatPreviewMessage;
