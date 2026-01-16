import { useEffect, useRef, useState } from "react";
import { getRoomChatMes, sendMessage as sendChatMessage, joinRoom } from "../../api/chatApi";
import wsService from "../../api/wsService";
import "../../styles/chatGroup.css";
import { Send, Plus, Users } from "lucide-react";
import InviteModal from "./InviteModal";
import { useAppDispatch } from "../../redux/hooks";
import EmojiPicker from "../EmojiPicker";
import ImageUploader from "../ImageUploader";
import MessageBubble from "../MessageBubble";
import MemberModal from "./MemberModal";

interface ChatMessage {
    id: number;
    name: string;
    mes: string;
    createAt: string;
    type?: "invite" | "normal";
    inviteRoom?: string;
}

interface Props {
    roomId: string;
    currentUser: string;
}
export type User = {
    id: number;
    name: string;
};
type GetRoomChatMesResponse = {
    status: string;
    event: string;
    data: {
        id: number;
        name: string;
        own: string;
        userList: User[];
    };
};

export default function ChatWindow({ roomId, currentUser }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachOptions, setShowAttachOptions] = useState(false);
    const [openImagePicker, setOpenImagePicker] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const dispatch = useAppDispatch();
    // xdem thành viên modal
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [members, setMembers] = useState<User[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    // useRef giá trị thay đổi không re render component lại 
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const attachRef = useRef<HTMLDivElement | null>(null);
    const loadRoomMessages = async () => {
        try {
            console.log(`[ChatWindow] Loading messages for room: ${roomId}`);
            await wsService.ensureConnection();
            const res: any = await getRoomChatMes(roomId);
            console.log(`[ChatWindow] Loaded messages:`, res.data.chatData);
            const sortedMessages = res.data.chatData.sort(
                (a: ChatMessage, b: ChatMessage) => new Date(a.createAt).getTime() - new Date(b.createAt).getTime()
            );
            console.log(`[ChatWindow] Sorted messages:`, sortedMessages);
            setMessages(sortedMessages);
        } catch (err) {
            console.error("[ChatWindow] Load room messages failed", err);
        }
    };
    // lấy thành viên
    const getRoomMembers = (response: GetRoomChatMesResponse): User[] => {
        if (response?.status !== "success" || response?.event !== "GET_ROOM_CHAT_MES") {
            return [];
        }
        return response.data?.userList;
    };
    const handleViewMembers = async () => {
        try {
            setLoadingMembers(true);
            const res = await getRoomChatMes(roomId);
            const memberList = getRoomMembers(res);
            setMembers(memberList);
            console.log(`member >>`, members)
        } catch (error) {
            console.error("Load members fail", error);
        } finally {
            setLoadingMembers(false);
        }
    };
    const handleImageSelect = async (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setOpenImagePicker(false);
    };

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
                    out += e.textContent || '';
                }
            }
        });
        return out.trim();
    };

    const sendMessage = async () => {
        let messageContent = serializeContent();
        if (!messageContent && !selectedImage) return;

        if (!messageContent && selectedImage) {
            messageContent = selectedImage;
        }

        const newMs: ChatMessage = {
            id: Date.now(),
            name: currentUser,
            mes: messageContent,
            createAt: new Date().toISOString(),
            type: "normal",
        };

        setMessages(prev => [...prev, newMs]);
        if (contentRef.current) contentRef.current.innerHTML = "";
        setInput("");
        setSelectedImage(null);

        try {
            await sendChatMessage("room", roomId, messageContent);
        } catch (err) {
            console.error("Send message failed", err);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
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
            'ok_hand': '👌',
            'sweat_smile': '😅',
            'sweat': '😓',
            'joy': '😂',
            'kissing_heart': '😘',
            'sunglasses': '😎',
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
            'shushing_face': '🤫'
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
        setShowEmojiPicker(false);
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

    // Load messages when roomId changes
    useEffect(() => {
        if (!roomId) return;
        console.log(`[ChatWindow] Room changed to: ${roomId}`);
        loadRoomMessages();
    }, [roomId]);

    const handleAcceptInvite = async (inviteRoom: string) => {
        try {
            console.log(`[INVITE] Accepting invite for room "${inviteRoom}"...`);
            await joinRoom(inviteRoom);
            console.log(`[INVITE] Successfully joined room "${inviteRoom}"`);
            dispatch({ type: "chat/fetchGroupList" });
        } catch (err) {
            console.error(`[INVITE] Failed to join room "${inviteRoom}":`, err);
        }
    };


    useEffect(() => {
        if (!roomId) return;

        const unsubscribe = wsService.on("SEND_CHAT", (res: any) => {
            if (
                res.status !== "success" ||
                !res.data ||
                res.data.to !== roomId
            ) return;

            // tránh lặp tin nhắn của chính mình
            if (res.data.from === currentUser) return;

            // Kiểm tra nếu là tin nhắn mời
            const isInvite = res.data.mes.startsWith("[INVITE]");
            const inviteRoom = isInvite ? res.data.mes.replace("[INVITE]", "") : undefined;

            if (isInvite) {
                console.log(`[INVITE] Received invite message from "${res.data.from}" for room "${inviteRoom}"`);
            }

            const newMsg: ChatMessage = {
                id: Date.now(),
                name: res.data.name,
                mes: res.data.mes,
                createAt: res.data.createAt || new Date().toISOString(),
                type: isInvite ? "invite" : "normal",
                inviteRoom: inviteRoom,
            };

            setMessages(prev => [...prev, newMsg]);
        });

        return () => unsubscribe();
    }, [roomId, currentUser]);
    useEffect(() => {
        // scrollIntoView cuộn element vào vùng nhìn tháy 
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="chat-window">
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                roomName={roomId}
                currentUser={currentUser}
            />
            <div className="chat-window-header">
                <div className="chat-window-user">
                    <div className="avatar-circle">{roomId.charAt(0)}</div>
                    <div className="user-meta">
                        <div className="user-name">{roomId}</div>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="header-invite-btn"
                        title="Mời người vào nhóm"
                    >
                        <Plus size={20} />
                    </button>
                    <button
                        onClick={() => {
                            setShowMemberModal(true)
                            handleViewMembers()
                        }}
                        className="header-invite-btn"
                        title="Xem thành viên"
                    >
                        <Users size={20} />
                    </button>
                </div>
            </div>
            <div className="chat-message-container">
                {messages.map(msg => {
                    const isMe = msg.name === currentUser;
                    return (
                        <div
                            key={msg.id}
                            className={`chat-message-wrapper ${isMe ? "me" : "other"}`}
                        >
                            {!isMe && <div className="sender">{msg.name}</div>}
                            <MessageBubble
                                text={msg.mes}
                                isOwn={isMe}
                                senderName={msg.name}
                                onJoinRoom={handleAcceptInvite}
                                joinedRooms={new Set()}
                            />
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {selectedImage && (
                <div className="selected-image-preview">
                    <img src={selectedImage} alt="Preview" />
                    <button
                        className="remove-image-btn"
                        onClick={() => setSelectedImage(null)}
                        title="Xóa ảnh"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="chat-input-wrapper">
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
                            sendMessage();
                        }
                    }}
                    data-placeholder="Nhập tin nhắn..."
                    tabIndex={0}
                />
                <button onClick={sendMessage} className="btn-send"><Send size={18} /></button>
            </div>

            {showEmojiPicker && (
                <EmojiPicker
                    onEmojiSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                />
            )}
            <MemberModal
                show={showMemberModal}
                onClose={() => setShowMemberModal(false)}
                members={members}
                loading={loadingMembers}
            />
        </div>
    );
}
