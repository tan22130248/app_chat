import "../../styles/chatItem.css";

export type Conversation = {
    name: string;
    actionTime: string;
};
type ChatGroupItemProps = {
    chat: Conversation;
};

export default function ChatGroupItem({ chat, onClick }: ChatGroupItemProps & { onClick?: () => void }) {

    const displayTime = (() => {
        try {
            if (!chat.actionTime) return "";
            const d = new Date(chat.actionTime);
            if (isNaN(d.getTime())) return chat.actionTime || "";
            return d.toLocaleString();
        } catch (e) {
            return chat.actionTime || "";
        }
    })();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div
            className="chat-item"
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div className="chat-item-avatar">
                <div className="avatar-placeholder">{chat.name.charAt(0)}</div>
            </div>
            <div className="chat-item-content">
                <div className="chat-item-top">
                    <h3 className="chat-item-name">{chat.name}</h3>
                    <span className="chat-item-time">{displayTime}</span>
                </div>
                <div className="chat-item-bottom">
                    <p className="chat-item-message">{(chat as any).lastMessage || ""}</p>
                </div>
            </div>
        </div>
    );
}
