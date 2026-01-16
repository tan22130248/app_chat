import { Moon } from "lucide-react";
import ChatGroupItem, { Conversation } from "./ChatGroupItem";

interface GroupListPanelProps {
    searchQuery: string;
    setSearchQuery: (v: string) => void;

    showSuggestions: boolean;
    setShowSuggestions: (v: boolean) => void;

    isDarkMode: boolean;
    setIsDarkMode: () => void;

    isLoading: boolean;
    filteredChats: Conversation[];

    onlineStatuses: Record<string, boolean>;
    handleSelectChat: (name: string) => void;
}


const GroupListPanel = ({
    searchQuery,
    setSearchQuery,
    setShowSuggestions,
    isDarkMode,
    setIsDarkMode,
    isLoading,
    filteredChats,
    onlineStatuses,
    handleSelectChat
}: GroupListPanelProps) => {
    console.log(`panel nhận room >>`, filteredChats)
    return (
        <>
            <div className="chat-list-panel">
                <div className="chat-list-header">
                    <div className="chat-list-title-search">
                        <h2>Chats</h2>
                        <div className="search-wrapper">
                            <input
                                type="text"
                                placeholder="Tìm kiếm"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSuggestions(e.target.value.trim() !== "");
                                }}
                                className="search-box-input"
                            />
                        </div>
                    </div>

                    <div className="chat-list-header-actions">
                        <button
                            className={`dark-toggle ${isDarkMode ? 'active' : ''}`}
                            onClick={() => setIsDarkMode()}
                            title="Chế độ ban đêm"
                        >
                            <Moon size={16} />
                        </button>
                    </div>
                </div>
                <div className="chat-list-body">
                    {isLoading ? (
                        <div className="chat-list-loading">Đang tải...</div>
                    ) : filteredChats.length === 0 ? (
                        <div className="chat-list-empty">{searchQuery.trim() ? "Không tìm thấy" : "Chưa có cuộc chat nào"}</div>
                    ) : (
                        filteredChats.map((chat) => (
                            <ChatGroupItem
                                key={chat.name}
                                chat={chat}
                                onClick={() => handleSelectChat(chat.name)}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    )
}
export default GroupListPanel;