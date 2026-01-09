// AppRoutes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import ChatScreen from "../pages/ChatScreen";
import ChatGroup from "../components/group/ChatGroup";


const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<ChatScreen />} />
            <Route path="/group" element={<ChatGroup />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

export default AppRoutes;
