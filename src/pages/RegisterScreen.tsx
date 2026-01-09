import React, { useState } from "react";
import logo from "../assets/logo.png";
import "../styles/register.css";
import "../styles/app.css";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { registerAsync, clearStatusMsg } from "../redux/slices/authSlice";

interface RegisterScreenProps {
    onBackClick: () => void;
}

export default function RegisterScreen({ onBackClick }: RegisterScreenProps) {
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const dispatch = useAppDispatch();
    const { isLoading, statusMsg, error } = useAppSelector((state) => state.auth);

    function handleRegister() {
        if (!user) {
            alert("Vui lòng nhập tên đăng nhập");
            return;
        }
        if (!pass) {
            alert("Vui lòng nhập mật khẩu");
            return;
        }
        if (pass !== confirmPass) {
            alert("Mật khẩu xác nhận không khớp");
            return;
        }
        dispatch(registerAsync({ user, pass }));
    }

    function handleStatusMsgClose() {
        dispatch(clearStatusMsg());
    }

    return (
        <div className="register-container">
            <div className="register-header">
                <img src={logo} className="register-logo" alt="logo" />
                <h2 className="register-title">App-Chat</h2>
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

            <input
                className="input-box"
                type="password"
                placeholder="Xác nhận mật khẩu"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                disabled={isLoading}
            />

            <div className="register-btn-group">
                <button
                    className="register-btn back-btn"
                    onClick={onBackClick}
                    disabled={isLoading}
                >
                    Quay lại
                </button>
                <button
                    className="register-btn submit-btn"
                    onClick={handleRegister}
                    disabled={isLoading}
                >
                    {isLoading ? "Đang đăng ký..." : "Đăng ký"}
                </button>
            </div>
        </div>
    );
}
