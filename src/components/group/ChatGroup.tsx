import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import GroupListPanel from "./GroupListPanel";
import Sidebar from "../Sidebar";
import { useNavigate } from "react-router-dom";
import CreateGroupModal from "./CreateGroupModal";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchGroupList } from "../../redux/slices/chatSlice";
import JoinGroupModal from "./JoinGroupModal";
import ChatWindow from "./ChatWindow";
import { logoutAsync, logoutDirect } from "../../redux/slices/authSlice";
import WebSocketService from "../../api/wsService";
import "../../styles/chatGroup.css";

const ChatGroup = () => {
    const currentUser = useAppSelector(state => state.auth.username);
    const isLogin = currentUser !== null;
    console.log(`t nè`, currentUser)
    const dispatch = useAppDispatch();
    const { rooms, isLoading } = useAppSelector(state => state.chat)
    const [showCreateChat, setShowCreateChat] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [showModelCreateGroup, setShowModelCreateGroup] = useState(false)
    const [showModelJoinGroup, setShowModelJoinGroup] = useState(false)

    // Apply dark mode class to document
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => {
        dispatch(fetchGroupList());
    }, [dispatch]);

    const navigate = useNavigate();

    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return rooms;
        return rooms.filter(g =>
            g.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, rooms]);

    const handleSelectChat = (name: string) => {
        console.log("CLICK GROUP:", name);
        // cập nhật lựa chọn cục bộ và điều hướng đến tuyến đường
        setSelectedGroup(name);
        navigate(`/group/${name}`);
    };

    // Giữ cho selectedGroup đồng bộ với tham số URL để các liên kết trực tiếp hoặc tải lại trang hoạt động
    const params = useParams<{ name?: string }>();
    useEffect(() => {
        if (params && params.name) {
            setSelectedGroup(params.name);
        }
    }, [params && params.name]);
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

    if (!isLogin) return null;
    return (
        <>
            <div className="app-fullscreen">
                <Sidebar
                    onCreateChat={() => setShowCreateChat(true)}
                    onLogout={handleLogout}
                    onCreateGroupChat={() => setShowModelCreateGroup(true)}
                    onOpenGroupChat={() => navigate("/group")}
                    onOpenPeopleChat={() => navigate("/")}
                    onJoinGroup={() => (setShowModelJoinGroup(true))}
                />

                <GroupListPanel
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showSuggestions={showSuggestions}
                    setShowSuggestions={setShowSuggestions}
                    isDarkMode={isDarkMode}
                    setIsDarkMode={() => setIsDarkMode(prev => !prev)}
                    isLoading={false}
                    filteredChats={filteredChats}
                    onlineStatuses={{}}
                    handleSelectChat={handleSelectChat}
                />
                <div style={{ flex: 1 }}>
                    {selectedGroup ? (
                        <ChatWindow
                            roomId={selectedGroup}
                            currentUser={currentUser}
                        />
                    ) : (
                        <div
                            style={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#888",
                                fontSize: "16px",
                            }}
                        >
                            Chọn một nhóm để bắt đầu trò chuyện
                        </div>
                    )}
                </div>
                <CreateGroupModal
                    show={showModelCreateGroup}
                    onClose={() => setShowModelCreateGroup(false)}
                />
                <JoinGroupModal
                    show={showModelJoinGroup}
                    onClose={() => setShowModelJoinGroup(false)}
                />
            </div>
        </>
    );
};

export default ChatGroup;
