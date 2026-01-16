import React, { useState } from "react";
import logo from "../assets/logo.png";
import "../styles/login.css";
import "../styles/app.css";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { loginAsync, clearStatusMsg } from "../redux/slices/authSlice";

interface LoginScreenProps {
    onRegisterClick: () => void;
}

export default function LoginScreen({ onRegisterClick }: LoginScreenProps) {
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const dispatch = useAppDispatch();
    const { isLoading, statusMsg, error } = useAppSelector((state) => state.auth);

    function handleLogin() {
        if (!user) {
            alert("Vui lòng nhập tên đăng nhập");
            return;
        }
        if (!pass) {
            alert("Vui lòng nhập mật khẩu");
            return;
        }
        dispatch(loginAsync({ user, pass }));
    }

    function handleStatusMsgClose() {
        dispatch(clearStatusMsg());
    }

    return (
        <div className="login-container">
            <div className="login-header">
                <img src={logo} className="login-logo" alt="logo" />
                <h2 className="login-title">App-Chat 2</h2>
            </div>

            {statusMsg && (
                <div
                    className={`status-message ${error ? "error" : "success"}`}
                    onClick={handleStatusMsgClose}
                >
                    {statusMsg}
                </div>
            )}

            <input
                className="input-box"
                placeholder="Tên đăng nhập"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                disabled={isLoading}
            />

            <input
                className="input-box"
                type="password"
                placeholder="Mật khẩu"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                disabled={isLoading}
            />

            <button className="login-btn" onClick={handleLogin} disabled={isLoading}>
                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            <div className="login-footer">
                <span className="link" onClick={onRegisterClick}>
                    Đăng ký
                </span>
                <span className="link">Quên mật khẩu?</span>
            </div>
        </div>
    );
}
