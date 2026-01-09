import { useState, useMemo, useEffect } from "react";
import GroupListPanel from "./GroupListPanel";
import Sidebar from "../Sidebar";
import { useNavigate } from "react-router-dom";
import CreateGroupModal from "./CreateGroupModal";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchGroupList, setCurrentRoom } from "../../redux/slices/chatSlice";

const ChatGroup = () => {
    const dispatch = useAppDispatch();
    const { rooms, isLoading } = useAppSelector(state => state.chat)
    const [showCreateChat, setShowCreateChat] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    // fake data – sau này thay bằng redux
    const groupChats = [
        { name: "Frontend Team", lastMessage: "Deploy xong chưa?", time: Date.now() },
        { name: "Backend Team", lastMessage: "Fix bug prod", time: Date.now() },
    ];
    useEffect(() => {
        dispatch(fetchGroupList());
    }, [dispatch]);

    const navigate = useNavigate();
    const [showModelCreateGroup, setShowModelCreateGroup] = useState(false)

    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return rooms;
        return rooms.filter(g =>
            g.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, rooms]);

    const handleSelectChat = (name: string) => {
        setSelectedGroup(name);
        navigate(`/group/${name}`);
    };


    return (
        <>
            <div className="app-fullscreen">
                <Sidebar
                    onCreateChat={() => setShowCreateChat(true)}
                    // onLogout={handleLogout}
                    onCreateGroupChat={() => setShowModelCreateGroup(true)}
                    onOpenGroupChat={() => navigate("/group")}
                    onOpenPeopleChat={() => navigate("/")}
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
                    onlineStatuses={{}} // group không dùng
                    handleSelectChat={handleSelectChat}
                />
                <CreateGroupModal
                    show={showModelCreateGroup}
                    onClose={() => setShowModelCreateGroup(false)}
                />
            </div>
        </>
    );
};

export default ChatGroup;
