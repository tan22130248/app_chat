import React, {useState, useEffect, useRef} from "react";
import {Moon} from 'lucide-react';
import "../styles/chat.css";
import "../styles/app.css";
import Sidebar from "../components/Sidebar";
import ChatItem from "../components/ChatItem";
import {useAppDispatch, useAppSelector} from "../redux/hooks";
import {
    fetchUserList,
    fetchGroupList,
    fetchPeopleMessages,
    clearMessages,
    checkUserStatus, checkUserExistsStatus
} from "../redux/slices/chatSlice";
import ChatDetail from "./ChatDetail";
import {logoutAsync, reLoginAsync} from "../redux/slices/authSlice";
import WebSocketService from "../api/wsService";
import {logoutDirect} from "../redux/slices/authSlice";
import {setCurrentPerson} from "../redux/slices/chatSlice";
import CreateGroupModal from "../components/group/CreateGroupModal";
import {useNavigate} from "react-router-dom";

export default function ChatScreen() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {userList, isLoading} = useAppSelector((state) => state.chat);
    const { username, reLoginCode } = useAppSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState<"chats" | "groups" | "profile" | "more">("chats");
    const [selectedName, setSelectedName] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);  // Hiện dropdown gợi ý
    const [showCreateChat, setShowCreateChat] = useState(false);

    const [showModelCreateGroup, setShowModelCreateGroup] = useState(false)

    const [newChatUsername, setNewChatUsername] = useState("");
    const [createChatLoading, setCreateChatLoading] = useState(false);
    const [createChatError, setCreateChatError] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [recentChats, setRecentChats] = useState<Array<{
        name: string;
        lastMessage: string;
        time: string;
    }>>([]);
    const onlineStatuses = useAppSelector((s: any) => s.chat.onlineStatuses || {});
    const filteredChats = userList.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const handleNewChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewChatUsername(value);
        setCreateChatError("");

        if (value.trim() === "") {
            setSuggestions([]);
            return;
        }

        const filteredNames = userList
            .filter((user: any) =>
                user.name && user.name.toLowerCase().includes(value.toLowerCase())
            )
            .map((user: any) => user.name);

        setSuggestions(filteredNames);
    };

    const handleSuggestionClick = (name: string) => {
        setNewChatUsername(name);
        setSuggestions([]);
    };

    // ===== TRỊ CÓ CHỮ NHÂN: 2 - Xử lý reconnect WebSocket =====
    useEffect(() => {
        // Đăng ký callback khi WebSocket reconnect
        const reconnectCallback = async () => {
            console.log("[ChatScreen] 🔄 WebSocket reconnected, attempting auto relogin...");
            
            if (username && reLoginCode) {
                try {
                    console.log("[ChatScreen] Auto RE_LOGIN on reconnect");
                    await dispatch(reLoginAsync({ user: username, code: reLoginCode })).unwrap();
                    console.log("[ChatScreen] ✅ Relogin successful on reconnect");
                    
                    // Reload user list sau khi relogin
                    dispatch(fetchUserList() as any);
                } catch (error) {
                    console.warn("[ChatScreen] ❌ Relogin failed on reconnect:", error);
                    // Server sẽ gửi AUTH error, App.tsx sẽ xử lý logout
                }
            }
        };
        
        WebSocketService.addOnReconnectCallback(reconnectCallback);
        
        return () => {
            // Cleanup: không cần unsubscribe vì callback arrays không có unsubscribe
        };
    }, [username, reLoginCode, dispatch]);

    useEffect(() => {
        console.log("[ChatScreen] Fetching user list");
        dispatch(fetchUserList() as any);
        // dispatch(fetchGroupList() as any);
    }, [dispatch]);
    useEffect(() => {
        const saved = localStorage.getItem("recentChats");
        if (saved) {
            const parsed = JSON.parse(saved);
            parsed.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
            setRecentChats(parsed);
        }
    }, []);

    // Lắng nghe event khi có tin nhắn mới từ App.tsx
    useEffect(() => {
        const handleUpdateRecentChats = (event: any) => {
            const updatedChats = event.detail;
            setRecentChats(updatedChats);
        };

        window.addEventListener("updateRecentChats", handleUpdateRecentChats);
        return () => window.removeEventListener("updateRecentChats", handleUpdateRecentChats);
    }, []);

    const handleSelectChat = (name: string) => {
        setSelectedName(name);
        dispatch(clearMessages());
        dispatch(fetchPeopleMessages({name, page: 1}) as any);
    };
    const handleCreateChat = async () => {
        const username = newChatUsername.trim();
        if (!username) {
            setCreateChatError("Vui lòng nhập tên người dùng");
            return;
        }

        setCreateChatLoading(true);
        const result = await dispatch(checkUserExistsStatus(username));
        const exists = checkUserExistsStatus.fulfilled.match(result) && result.payload?.exists === true;

        if (!exists) {
            setCreateChatError("Người dùng không tồn tại");
            setCreateChatLoading(false);
            return;
        }

        // Mở khung chat khi người dùng có mặt
        handleSelectChat(username);

        const newRecent = {
            name: username,
            lastMessage: "Bắt đầu cuộc trò chuyện...",
            time: new Date().toISOString(),
        };
        setRecentChats(prev => {
            const updated = [newRecent, ...prev.filter(c => c.name !== username)];
            localStorage.setItem("recentChats", JSON.stringify(updated));
            return updated;
        });

        // Làm mới danh sách người dùng để người mới xuất hiện trong thanh bên
        dispatch(fetchUserList());

        setShowCreateChat(false);
        setNewChatUsername("");
        setCreateChatLoading(false);
    };
    const createChatSuccess = (username: string) => {
        dispatch(setCurrentPerson(username));
        dispatch(clearMessages());
        dispatch(fetchPeopleMessages({name: username, page: 1}) as any);
        setSelectedName(username);
        updateRecentChat(username, "Bắt đầu trò chuyện", new Date().toISOString());
        setShowCreateChat(false);
        setNewChatUsername("");
    };
    const updateRecentChat = (name: string, lastMessage: string, time: string = new Date().toISOString()) => {
        setRecentChats(prev => {
            const updated = [...prev];
            const existingIndex = updated.findIndex(chat => chat.name === name);
            if (existingIndex !== -1) {
                updated[existingIndex] = {name, lastMessage, time};
            } else {
                updated.push({name, lastMessage, time});
            }
            updated.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
            localStorage.setItem("recentChats", JSON.stringify(updated));
            return updated;
        });
    };

    const handleLogout = async () => {
        if (!window.confirm("Bạn có chắc muốn đăng xuất không?")) {
            return;
        }
        try {
            await dispatch(logoutAsync()).unwrap();
            console.log("Logout thành công");
        } catch (error) {
            console.warn("Logout thất bại", error);
        }
        WebSocketService.close();
        dispatch(logoutDirect());
    };


    // xử lí tạo gr chat
    const handleCreateGroup = (name: string) => {
        console.log('Tạo nhóm:', name);
        // test
    };

    return (
        <div className="app-fullscreen">
            <Sidebar
                onCreateChat={() => setShowCreateChat(true)}
                onLogout={handleLogout}
                onCreateGroupChat={() => setShowModelCreateGroup(true)}
                onOpenGroupChat={() => navigate("/group")}
                onOpenPeopleChat={() => navigate("/")}
            />

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
                            onClick={() => {
                                setIsDarkMode(prev => {
                                    const next = !prev;
                                    try {
                                        document.documentElement.classList.toggle('dark', next);
                                    } catch (e) {
                                    }
                                    return next;
                                });
                            }}
                            title="Chế độ ban đêm"
                        >
                            <Moon size={16}/>
                        </button>
                    </div>
                </div>

                {showCreateChat && (
                    <div className="create-chat-modal-overlay" onClick={() => setShowCreateChat(false)}>
                        <div className="create-chat-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>Tạo cuộc trò chuyện mới</h3>
                            <div className="create-chat-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Nhập tên người dùng..."
                                    value={newChatUsername}
                                    onChange={handleNewChatInputChange}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateChat()}
                                    disabled={createChatLoading}
                                    autoFocus
                                    className="create-chat-input"
                                />
                                {suggestions.length > 0 && (
                                    <div className="create-chat-suggestions">
                                        {suggestions.map((sug) => (
                                            <div
                                                key={sug}
                                                className="suggestion-item"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSuggestionClick(sug);
                                                }}
                                            >
                                                {sug}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {createChatError && <p className="create-chat-error">{createChatError}</p>}
                            <div className="create-chat-buttons">
                                <button
                                    onClick={() => {
                                        setShowCreateChat(false);
                                        setNewChatUsername("");
                                        setCreateChatError("");
                                    }}
                                    disabled={createChatLoading}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreateChat}
                                    disabled={createChatLoading}
                                >
                                    {createChatLoading ? "Đang tạo..." : "Tạo chat"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="chat-list-body">
                    {userList.length === 0 ? (
                        <div className="chat-list-empty">
                            {searchQuery.trim() ? "Không tìm thấy" : "Chưa có cuộc chat nào"}
                        </div>
                    ) : (
                        userList
                            .filter((user) => user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((chat) => {
                                // Lấy lastMessage từ recentChats nếu có, nếu không dùng mặc định
                                const recentChat = recentChats.find((r: any) => r.name === chat.name);
                                const lastMessage = recentChat?.lastMessage || "Bắt đầu cuộc trò chuyện...";
                                const time = recentChat?.time || chat.actionTime || new Date().toISOString();
                                
                                return (
                                    <div key={chat.name} onClick={() => handleSelectChat(chat.name)}>
                                        <ChatItem
                                            chat={{
                                                id: Math.random(),
                                                name: chat.name,
                                                lastMessage,
                                                time,
                                                unreadCount: 0,
                                                online: !!onlineStatuses[chat.name],
                                                type: "people"
                                            }}
                                        />
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>

            <main className="chat-window">
                {selectedName ? (
                    <ChatDetail name={selectedName} onClose={() => setSelectedName(null)}/>
                ) : (
                    <div className="chat-window-empty">
                        <div className="placeholder-graphic">💬</div>
                        <h3>Chọn cuộc trò chuyện để bắt đầu</h3>
                        <p className="muted">Hoặc nhấn nút + để tạo chat mới</p>
                    </div>
                )}
            </main>
            <CreateGroupModal
                show={showModelCreateGroup}
                onClose={() => setShowModelCreateGroup(false)}
            />
        </div>
    );
}
