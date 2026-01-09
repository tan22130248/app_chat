import React, { useState, useEffect } from "react";
import './App.css';
import { ThemeProvider } from './contexts/ThemeContext';
import SplashScreen from "./pages/SplashScreen";
import LoginScreen from "./pages/LoginScreen";
import RegisterScreen from "./pages/RegisterScreen";
import ChatScreen from "./pages/ChatScreen";
import "./styles/animations.css";
import { useAppSelector, useAppDispatch } from "./redux/hooks";
import { logoutDirect } from "./redux/slices/authSlice";
import { receiveMessage, setCurrentUsername, setIncomingCall, clearIncomingCall, setActiveCall, clearActiveCall } from "./redux/slices/chatSlice";
import { formatPreviewMessage } from "./utils/messagePreview";
import WebSocketService from "./api/wsService";
import AppRoutes from "./route/AppRoutes";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<"login" | "register">("login");
  const [nextScreen, setNextScreen] = useState<"login" | "register">("login");
  const [isAnimating, setIsAnimating] = useState(false);
  const { isAuthenticated, username } = useAppSelector((state) => state.auth);
  const { error: chatError } = useAppSelector((state) => state.chat);
  const dispatch = useAppDispatch();

  // Set current username trong Redux khi login thành công
  useEffect(() => {
    if (isAuthenticated && username) {
      dispatch(setCurrentUsername(username));
    }
  }, [isAuthenticated, username, dispatch]);

  // Nếu chat có auth error, logout
  useEffect(() => {
    if (chatError && (chatError.includes("User not Login") || chatError.includes("AUTH"))) {
      console.log("[App] Auth error detected, logging out");
      dispatch(logoutDirect());
    }
  }, [chatError, dispatch]);

  // Lắng nghe các tin nhắn từ server toàn cục
  useEffect(() => {
    const unsubscribe = WebSocketService.on("SEND_CHAT", (data: any) => {
      if (data.status === "success" && data.data) {
        const message = {
          id: Date.now(),
          name: data.data.from || data.data.name || "Unknown",
          mes: data.data.mes || data.data.message || "",
          to: data.data.to || "",
          type: data.data.type || "people",
          createAt: data.data.createAt || new Date().toISOString(),
        };

        console.log("[App] Received SEND_CHAT from server:", message);

        // === PHÁT HIỆN TÍN HIỆU CUỘC GỌI ===
        try {
          const mesContent = JSON.parse(message.mes);
          if (mesContent.kind === "CALL_REQUEST") {
            console.log("[App] Yêu cầu gọi được phát hiện từ:", message.name);
            dispatch(setIncomingCall({
              callerName: message.name,
              callType: mesContent.callType || 'audio',
              timestamp: Date.now(),
            }));
            return; // Không thêm vào messages list
          } else if (mesContent.kind === "CALL_END") {
            console.log("[App] Phát hiện kết thúc cuộc gọi");
            // Xóa mọi trạng thái cuộc gọi đến hoặc đang hoạt động cho người dùng hiện tại
            dispatch(clearIncomingCall());
            dispatch(clearActiveCall());
            return;
          } else if (mesContent.kind === "CALL_ACCEPT") {
            console.log("[App] Cuộc gọi đã được chấp nhận");
            // Nếu yêu cầu ACCEPT này được gửi đến tôi (tôi là người gọi), hãy đặt activeCall thành accepted
            if (message.to && message.to === username) {
              dispatch(setActiveCall({
                peerName: message.name,
                callType: mesContent.callType || 'audio',
                status: 'accepted',
                initiator: true,
              }));
              return;
            }
            // Nếu tôi là bên được gọi và tôi đã phát ra tín hiệu ACCEPT, hãy đảm bảo giao diện người dùng của tôi cũng hiển thị trạng thái đã được chấp nhận.
            if (message.name && message.name === username) {
              dispatch(setActiveCall({
                peerName: message.to,
                callType: mesContent.callType || 'audio',
                status: 'accepted',
                initiator: false,
              }));
              return;
            }
            return;
          }
        } catch (e) {
          // Không phải JSON, xử lý như tin nhắn thường
        }

        dispatch(receiveMessage(message));

        // === CẬP NHẬT RECENT CHATS VỚI TIN NHẮN CUỐI CÙNG
        try {
          const recentChatsStr = localStorage.getItem("recentChats");
          const recentChats = recentChatsStr ? JSON.parse(recentChatsStr) : [];
          // Xác định người gửi
          const senderName = message.name === username ? "Bạn" : message.name;
          const chatName = message.name === username ? message.to : message.name;

          const preview = formatPreviewMessage(message.mes || '', senderName as string);
          if (preview && (preview as any).skip) {
          } else {
            const lastMessageText = (preview && (preview as any).text) || `${senderName}: ${message.mes}`;
            const existingIndex = recentChats.findIndex((c: any) => c.name === chatName);
            const now = message.createAt || new Date().toISOString();
            if (existingIndex !== -1) {
              recentChats[existingIndex] = {
                ...recentChats[existingIndex],
                lastMessage: lastMessageText,
                time: now,
              };
            } else {
              recentChats.push({ name: chatName, lastMessage: lastMessageText, time: now });
            }
            recentChats.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
            localStorage.setItem("recentChats", JSON.stringify(recentChats));
            window.dispatchEvent(new CustomEvent("updateRecentChats", { detail: recentChats }));
          }
        } catch (err) {
          console.warn("[App] Failed to update recent chats:", err);
        }
      }
    });

    return () => unsubscribe();
  }, [dispatch, username]);

  function handleSwitchScreen(screen: "login" | "register") {
    if (isAnimating) return;
    setNextScreen(screen);
    setIsAnimating(true);
  }

  function handleAnimationEnd() {
    setCurrentScreen(nextScreen);
    setIsAnimating(false);
  }

  return (
    <ThemeProvider>
      <div className={`app-container ${isAuthenticated ? 'chat-mode' : ''}`}>
        {showSplash ? (
          <SplashScreen onDone={() => setShowSplash(false)} />
        ) : isAuthenticated ? (
          <AppRoutes />
        ) : (
          <div
            className={`screen-wrapper ${isAnimating
              ? currentScreen === "login"
                ? "slide-out-left"
                : "slide-out-right"
              : "slide-in"
              }`}
            onAnimationEnd={handleAnimationEnd}
          >
            {currentScreen === "login" ? (
              <LoginScreen onRegisterClick={() => handleSwitchScreen("register")} />
            ) : (
              <RegisterScreen onBackClick={() => handleSwitchScreen("login")} />
            )}
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;



