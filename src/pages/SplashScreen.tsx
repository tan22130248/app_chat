import React, { useEffect } from "react";
import "../styles/app.css";
import "../styles/splash.css";
import logo from "../assets/logo.png";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { reLoginAsync, logoutDirect } from "../redux/slices/authSlice";

interface SplashProps {
    onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashProps) {
    const dispatch = useAppDispatch();
    const { isAuthenticated, isReLoggingIn, error } = useAppSelector((state) => state.auth);

    useEffect(() => {
        // Trường hợp 3: Reload trang (F5) hoặc mở app lần sau
        // Kiểm tra localStorage có RE_LOGIN_CODE không
        if (!isAuthenticated && !isReLoggingIn) {
            const username = localStorage.getItem("username");
            const reLoginCode = localStorage.getItem("reLoginCode");
            
            if (username && reLoginCode) {
                console.log("[SplashScreen] 🔄 Auto RE_LOGIN from localStorage");
                dispatch(reLoginAsync({ user: username, code: reLoginCode }));
            }
        }
    }, [isAuthenticated, isReLoggingIn, dispatch]);

    // Nếu relogin thất bại, logout & về login screen
    useEffect(() => {
        if (isReLoggingIn === false && error && !isAuthenticated) {
            console.warn("[SplashScreen] ❌ Relogin failed, forcing logout");
            dispatch(logoutDirect());
        }
    }, [isReLoggingIn, error, isAuthenticated, dispatch]);

    useEffect(() => {
        // Splash delay dựa trên authentication status
        // Cho thêm thời gian cho relogin hoàn thành
        const delay = isReLoggingIn ? 3000 : 1800;
        const timer = setTimeout(() => {
            onDone();
        }, delay);
        return () => clearTimeout(timer);
    }, [onDone, isReLoggingIn]);

    return (
        <div className="splash-container">
            <img src={logo} alt="logo" className="splash-logo" />
            {/*{isReLoggingIn && <p style={{ marginTop: "20px", fontSize: "12px", color: "#999" }}>Đang khôi phục phiên...</p>}*/}
        </div>
    );
}
