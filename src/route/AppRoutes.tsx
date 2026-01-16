// AppRoutes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import ChatScreen from "../pages/ChatScreen";
import ChatGroup from "../components/group/ChatGroup";



const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />


            <Route path="/chat" element={<ChatScreen />} />
            <Route path="/chat/:name" element={<ChatScreen />} />
            <Route path="/group" element={<ChatGroup />} />
            <Route path="/group/:name" element={<ChatGroup />} />

            <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
    );
};

export default AppRoutes;
