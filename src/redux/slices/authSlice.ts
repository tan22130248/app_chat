import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { AuthApi } from "../../api/authApi";
import { reLogin } from "../../api/chatApi";

interface AuthState {
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    username: string | null;
    reLoginCode: string | null;
    statusMsg: string | null;
    isReLoggingIn: boolean; // Flag để theo dõi khi đang relogin
}

const initialState: AuthState = {
    isLoading: false,
    error: null,
    isAuthenticated: false,
    username: localStorage.getItem("username") || null,
    reLoginCode: localStorage.getItem("reLoginCode") || null,
    statusMsg: null,
    isReLoggingIn: false,
};

// Async thunk cho LOGIN
export const loginAsync = createAsyncThunk(
    "auth/login",
    async ({ user, pass }: { user: string; pass: string }, { rejectWithValue }) => {
        try {
            const response: any = await AuthApi.login(user, pass);
            if (response.status === "success" && response.event === "LOGIN") {
                const code = response.data?.RE_LOGIN_CODE;
                localStorage.setItem("username", user);
                if (code) {
                    localStorage.setItem("reLoginCode", code);
                }
                return { user, code };
            } else {
                return rejectWithValue(response.mes || response.data || "Đăng nhập thất bại");
            }
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);

// Async thunk cho REGISTER
export const registerAsync = createAsyncThunk(
    "auth/register",
    async ({ user, pass }: { user: string; pass: string }, { rejectWithValue }) => {
        try {
            const response: any = await AuthApi.register(user, pass);
            if (response.status === "success") {
                return { user };
            } else {
                return rejectWithValue(response.mes || response.data || "Đăng ký thất bại");
            }
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);

// Async thunk cho RE_LOGIN
export const reLoginAsync = createAsyncThunk(
    "auth/reLogin",
    async ({ user, code }: { user: string; code: string }, { rejectWithValue }) => {
        try {
            const response: any = await AuthApi.reLogin(user, code);
            if (response.status === "success" && response.event === "RE_LOGIN") {
                const newCode = response.data?.RE_LOGIN_CODE;
                if (newCode) {
                    localStorage.setItem("reLoginCode", newCode);
                }
                return { user, code: newCode || code };
            } else {
                return rejectWithValue(response.mes || response.data || "Re-login thất bại");
            }
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);

// Async thunk cho LOGOUT
export const logoutAsync = createAsyncThunk(
    "auth/logout",
    async (_, { rejectWithValue }) => {
        try {
            const response: any = await AuthApi.logout();
            if (response.status === "success") {
                localStorage.removeItem("username");
                localStorage.removeItem("reLoginCode");
                return true;
            } else {
                return rejectWithValue(response.mes || response.data || "Logout thất bại");
            }
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);

// Async thunk cho RE_LOGIN via ChatApi (khi user đã login thành công, cần re-auth trên chat connection)
export const reLoginChatAsync = createAsyncThunk(
    "auth/reLoginChat",
    async (_, { rejectWithValue, getState }) => {
        try {
            const state: any = getState();
            const user = state.auth.username;
            const code = state.auth.reLoginCode;
            
            if (!user || !code) {
                return rejectWithValue("Missing username or re-login code");
            }
            
            const response: any = await reLogin(user, code);
            if (response.status === "success" && response.event === "RE_LOGIN") {
                const newCode = response.data?.RE_LOGIN_CODE;
                if (newCode) {
                    localStorage.setItem("reLoginCode", newCode);
                }
                return { user, code: newCode || code };
            } else {
                return rejectWithValue(response.mes || response.data || "Re-login thất bại");
            }
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearStatusMsg: (state) => {
            state.statusMsg = null;
        },
        logoutDirect: (state) => {
            state.isAuthenticated = false;
            state.username = null;
            state.reLoginCode = null;
            state.error = null;
            localStorage.removeItem("username");
            localStorage.removeItem("reLoginCode");
        },
    },
    extraReducers: (builder) => {
        // LOGIN
        builder
            .addCase(loginAsync.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.statusMsg = "Đang kết nối...";
            })
            .addCase(loginAsync.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.username = action.payload.user;
                state.reLoginCode = action.payload.code || null;
                state.statusMsg = "Đăng nhập thành công!";
            })
            .addCase(loginAsync.rejected, (state, action) => {
                state.isLoading = false;
                state.error = String(action.payload) || "Đăng nhập thất bại";
                state.statusMsg = state.error;
            });

        // REGISTER
        builder
            .addCase(registerAsync.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.statusMsg = "Đang đăng ký...";
            })
            .addCase(registerAsync.fulfilled, (state, action) => {
                state.isLoading = false;
                state.statusMsg = "Đăng ký thành công! Vui lòng đăng nhập.";
            })
            .addCase(registerAsync.rejected, (state, action) => {
                state.isLoading = false;
                state.error = String(action.payload) || "Đăng ký thất bại";
                state.statusMsg = state.error;
            });

        // RE_LOGIN
        builder
            .addCase(reLoginAsync.pending, (state) => {
                state.isLoading = true;
                state.isReLoggingIn = true;
                state.error = null;
            })
            .addCase(reLoginAsync.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isReLoggingIn = false;
                state.isAuthenticated = true;
                state.username = action.payload.user;
                state.reLoginCode = action.payload.code;
            })
            .addCase(reLoginAsync.rejected, (state, action) => {
                state.isLoading = false;
                state.isReLoggingIn = false;
                state.isAuthenticated = false;
                state.error = String(action.payload) || "Re-login thất bại";
            });

        // LOGOUT
        builder
            .addCase(logoutAsync.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(logoutAsync.fulfilled, (state) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.username = null;
                state.reLoginCode = null;
                state.statusMsg = "Đã đăng xuất";
            })
            .addCase(logoutAsync.rejected, (state, action) => {
                state.isLoading = false;
                state.error = String(action.payload) || "Logout thất bại";
            });

        // RE_LOGIN via ChatApi (call sau khi user login thành công)
        builder
            .addCase(reLoginChatAsync.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(reLoginChatAsync.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.reLoginCode = action.payload.code;
            })
            .addCase(reLoginChatAsync.rejected, (state, action) => {
                state.isLoading = false;
                state.error = String(action.payload) || "Re-login thất bại";
                // Không cần đặt isAuthenticated=false ở đây, hãy để ChatScreen xử lý việc đó.
            });
    },
});

export const { clearError, clearStatusMsg, logoutDirect } = authSlice.actions;
export default authSlice.reducer;
