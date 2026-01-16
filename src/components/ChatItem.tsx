import React from "react";
import "../styles/chatItem.css";

type ChatType = "people" | "group";
interface ChatItemProps {
    chat: {
        id: number;
        name: string;
        lastMessage: string;
        time: string;
        unreadCount: number;
        online?: boolean;
        type: ChatType;
    };
}

export default function ChatItem({ chat }: ChatItemProps) {
    const formatChatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return timeStr;

        const now = new Date();
        const isSameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();

        if (isSameDay) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    return (
        <div className="chat-item">
            <div className="chat-item-avatar">
                <div className="avatar-placeholder">{chat.name.charAt(0)}</div>
            </div>
            <div className="chat-item-content">
                <div className="chat-item-top">
                    <h3 className="chat-item-name">{chat.name}</h3>
                    <span className="chat-item-time">{formatChatTime(chat.time)}</span>
                </div>
                <div className="chat-item-bottom">
                    <p className="chat-item-message">{chat.lastMessage}</p>
                    {chat.type === "people" && (
                        <span
                            className={`chat-item-status-indicator ${chat.online ? "online" : "offline"}`}
                            title={chat.online ? "online" : "offline"}
                        />
                    )}
                    {chat.unreadCount > 0 && (
                        <span className="chat-item-badge">{chat.unreadCount}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
