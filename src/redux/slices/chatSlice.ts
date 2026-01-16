import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getUserList, getPeopleChatMes, sendMessage, checkUserOnline, checkUserExists } from "../../api/chatApi";

interface ChatUser {
    lastMessage: string;
    name: string;
    type: number;
    actionTime: string;
}

interface IncomingCall {
    mes: string;
    roomId(roomId: any): unknown;
    callerName: string;
    callType: 'audio' | 'video';
    timestamp: number;
}

interface ChatState {
    currentRoom: string | null;
    currentPerson: string | null;
    messages: any[];
    userList: ChatUser[];
    rooms: ChatUser[];
    onlineStatuses: Record<string, boolean>;
    userExists: Record<string, boolean>;
    isLoading: boolean;
    isSending: boolean;
    error: string | null;
    currentUsername: string | null;
    incomingCall: IncomingCall | null;
    activeCall: {
        peerName: string;
        callType: 'audio' | 'video';
        status: 'ringing' | 'accepted' | 'ended';
        initiator: boolean;
    } | null;
}

const initialState: ChatState = {
    currentRoom: null,
    currentPerson: null,
    messages: [],
    userList: [],
    rooms: [],
    onlineStatuses: {} as Record<string, boolean>,
    userExists: {} as Record<string, boolean>,
    isLoading: false,
    isSending: false,
    error: null,
    currentUsername: null,
    incomingCall: null,
    activeCall: null,
};

export const fetchUserList = createAsyncThunk(
    "chat/fetchUserList",
    async (_, { rejectWithValue, dispatch }) => {
        try {
            const resp: any = await getUserList();
            if (resp.status === "success") {
                const personChats = (resp.data || []).filter((u: any) => u.type === 0);
                return personChats;
            }
            return rejectWithValue(resp.mes || "Lấy danh sách thất bại");
        } catch (e: any) {
            const errorMsg = e.message || "Lỗi kết nối";
            // Nếu auth error, clear localStorage và logout
            if (errorMsg.includes("User not Login") || errorMsg.includes("AUTH")) {
                localStorage.removeItem("reLoginCode");
                localStorage.removeItem("username");
                // Dispatch logout action sẽ được xử lý ở listener
            }
            return rejectWithValue(errorMsg);
        }
    }
);
// lấy danh sách gr chat
export const fetchGroupList = createAsyncThunk(
    "chat/fetchGroupList",
    async (_, { rejectWithValue }) => {
        try {
            const resp: any = await getUserList();
            if (resp.status === "success") {
                return (resp.data || []).filter((u: any) => u.type === 1);
            }
            return rejectWithValue("Không lấy được danh sách nhóm");
        } catch (e: any) {
            return rejectWithValue(e.message);
        }
    }
);

export const fetchPeopleMessages = createAsyncThunk(
    "chat/fetchPeopleMessages",
    async ({ name, page = 1 }: { name: string; page?: number }, { rejectWithValue }) => {
        try {
            const resp: any = await getPeopleChatMes(name, page);
            if (resp.status === "success") {
                return { name, messages: resp.data || [] };
            }
            return rejectWithValue(resp.mes || resp.data || "Lấy tin nhắn thất bại");
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);

export const checkUserStatus = createAsyncThunk(
    "chat/checkUserStatus",
    async (username: string, { rejectWithValue }) => {
        try {
            const resp: any = await checkUserOnline(username);
            if (resp.status === "success") {
                return { username, status: !!resp.data?.status };
            }
            return rejectWithValue(resp.mes || "Failed to check user online status");
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);

export const checkUserExistsStatus = createAsyncThunk(
    "chat/checkUserExistsStatus",
    async (username: string, { rejectWithValue }) => {
        try {
            const resp: any = await checkUserExists(username);
            if (resp.status === "success") {
                return { username, exists: !!resp.data?.status };
            }
            return rejectWithValue(resp.mes || "Failed to check user exists");
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);

export const sendChatMessage = createAsyncThunk(
    "chat/sendChatMessage",
    async ({ type, to, mes }: { type: "people" | "room"; to: string; mes: string }, { rejectWithValue, getState }) => {
        try {
            const state: any = getState();
            const username = state.auth.username;

            const resp: any = await sendMessage(type, to, mes);
            if (resp.status === "success" || !resp.status) {
                // Server may not return explicit success for SEND_CHAT
                return {
                    id: Date.now(),
                    name: username,
                    type: type === "room" ? 1 : 0,
                    to,
                    mes,
                    createAt: new Date().toLocaleString(),
                    // createAt: new Date().toISOString(),
                };
            }
            return rejectWithValue(resp.mes || "Gửi tin nhắn thất bại");
        } catch (e: any) {
            return rejectWithValue(e.message || "Lỗi kết nối");
        }
    }
);
export const joinGroup = (groupName: string) => {
    return (dispatch: any, getState: any, { socket }: any) => {
        socket.send(JSON.stringify({
            action: "onchat",
            data: {
                event: "JOIN_ROOM",
                data: { name: groupName }
            }
        }));
        dispatch(setCurrentRoom(groupName));
    };
};


const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setCurrentRoom: (state, action) => {
            state.currentRoom = action.payload;
        },
        setCurrentPerson: (state, action) => {
            state.currentPerson = action.payload;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        clearMessages: (state) => {
            state.messages = [];
        },
        // Nhận tin nhắn từ server qua WebSocket (chỉ từ người khác)
        receiveMessage: (state, action) => {
            const newMessage = action.payload;
            // Chỉ thêm tin nhắn nếu nó từ người khác (không phải chính mình)
            // Bên gửi sẽ thêm qua thunk sendChatMessage
            if (newMessage.name && newMessage.name !== state.currentUsername) {
                // Tránh trùng lặp: check xem tin nhắn này đã có trong array chưa
                const isDuplicate = state.messages.some(
                    m => m.name === newMessage.name &&
                        m.mes === newMessage.mes &&
                        Math.abs(new Date(m.createAt).getTime() - new Date(newMessage.createAt).getTime()) < 1000
                );
                if (!isDuplicate) {
                    state.messages.push(newMessage);
                }
            }
        },
        setCurrentUsername: (state, action) => {
            state.currentUsername = action.payload;
        },
        setIncomingCall: (state, action) => {
            state.incomingCall = action.payload;
        },
        setActiveCall: (state, action) => {
            state.activeCall = action.payload;
        },
        clearActiveCall: (state) => {
            state.activeCall = null;
        },
        clearIncomingCall: (state) => {
            state.incomingCall = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch user list
        builder
            .addCase(fetchUserList.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserList.fulfilled, (state, action) => {
                state.isLoading = false;
                state.userList = action.payload;
            })
            .addCase(fetchGroupList.fulfilled, (state, action) => {
                state.rooms = action.payload;
            })
            .addCase(fetchUserList.rejected, (state, action) => {
                state.isLoading = false;
                const errorMsg = String(action.payload) || "Lỗi khi tải danh sách";
                state.error = errorMsg;
                // Auth error will trigger logout in App.tsx by watching auth state
            });

        // Fetch messages
        builder
            .addCase(fetchPeopleMessages.pending, (state, action) => {
                state.isLoading = true;
                state.error = null;
                // Clear current messages only when loading page 1 (initial load or switching person)
                const page = (action.meta && (action.meta.arg as any)?.page) || 1;
                if (page === 1) state.messages = [];
            })
            .addCase(fetchPeopleMessages.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentPerson = action.payload.name;
                const page = (action.meta && (action.meta.arg as any)?.page) || 1;
                const newMessages = action.payload.messages || [];
                if (page === 1) {
                    state.messages = newMessages;
                } else {
                    // prepend older messages so timeline remains chronological
                    state.messages = [...newMessages, ...state.messages];
                }
            })
            .addCase(fetchPeopleMessages.rejected, (state, action) => {
                state.isLoading = false;
                state.error = String(action.payload) || "Lỗi khi tải tin nhắn";
            });

        // Check user online status
        builder
            .addCase(checkUserStatus.fulfilled, (state, action) => {
                const { username, status } = action.payload as { username: string; status: boolean };
                state.onlineStatuses = {
                    ...state.onlineStatuses,
                    [username]: status,
                };
            })
            .addCase(checkUserStatus.rejected, (state, action) => {
                // mark as offline on error
                const payload = action.meta.arg as string;
                state.onlineStatuses = {
                    ...state.onlineStatuses,
                    [payload]: false,
                };
            });

        // Check user exists status
        builder
            .addCase(checkUserExistsStatus.fulfilled, (state, action) => {
                const { username, exists } = action.payload as { username: string; exists: boolean };
                state.userExists = {
                    ...state.userExists,
                    [username]: exists,
                };
            })
            .addCase(checkUserExistsStatus.rejected, (state, action) => {
                // mark as not existing on error
                const payload = action.meta.arg as string;
                state.userExists = {
                    ...state.userExists,
                    [payload]: false,
                };
            });

        // Send message
        builder
            .addCase(sendChatMessage.pending, (state) => {
                state.error = null;
            })
            .addCase(sendChatMessage.fulfilled, (state, action) => {
                state.isSending = false;
                state.messages.push(action.payload);
            })
            .addCase(sendChatMessage.rejected, (state, action) => {
                state.isSending = false;
                state.error = String(action.payload) || "Lỗi khi gửi tin nhắn";
            });
    },
});

export const { setCurrentRoom, setCurrentPerson, addMessage, clearMessages, receiveMessage, setCurrentUsername, setIncomingCall, clearIncomingCall, setActiveCall, clearActiveCall } = chatSlice.actions;
export default chatSlice.reducer;
