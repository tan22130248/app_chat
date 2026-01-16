import wsService from "./wsService";



class ChatApiService {
    static async getUserList() {
        const payload = {
            action: "onchat",
            data: { event: "GET_USER_LIST" },
        };
        return wsService.request(payload, "GET_USER_LIST");
    }

    static async getPeopleChatMes(name: string, page = 1) {
        const payload = {
            action: "onchat",
            data: {
                event: "GET_PEOPLE_CHAT_MES",
                data: { name, page },
            },
        };
        return wsService.request(payload, "GET_PEOPLE_CHAT_MES");
    }
    static async getRoomChatMes(name: string, page = 1) {
        const payload = {
            action: "onchat",
            data: {
                event: "GET_ROOM_CHAT_MES",
                data: { name, page },
            },
        };
        return wsService.request(payload, "GET_ROOM_CHAT_MES");
    }
    static async createRoom(name: string) {
        const payload = {
            action: "onchat",
            data: {
                event: "CREATE_ROOM",
                data: {
                    name,
                },
            },
        };

        return wsService.request(payload, "CREATE_ROOM");
    }
    static async joinRoom(name: string) {
        const payload = {
            action: "onchat",
            data: {
                event: "JOIN_ROOM",
                data: {
                    name,
                },
            },
        };

        return wsService.request(payload, "JOIN_ROOM");
    }

    static async sendMessage(type: "people" | "room", to: string, mes: string) {
        const payload = {
            action: "onchat",
            data: {
                event: "SEND_CHAT",
                data: { type, to, mes },
            },
        };
        return wsService.request(payload, "SEND_CHAT");
    }

    static async reLogin(user: string, code: string) {
        const payload = {
            action: "onchat",
            data: {
                event: "RE_LOGIN",
                data: { user, code },
            },
        };
        return wsService.request(payload, "RE_LOGIN");
    }
    static async checkUserOnline(username: string) {
        const payload = {
            action: "onchat",
            data: {
                event: "CHECK_USER_ONLINE",
                data: { user: username },
            },
        };
        return wsService.request(payload, "CHECK_USER_ONLINE");
    }

    static async checkUserExists(username: string) {
        const payload = {
            action: "onchat",
            data: {
                event: "CHECK_USER_EXIST",
                data: { user: username },
            },
        };
        return wsService.request(payload, "CHECK_USER_EXIST");
    }
}

export const getUserList = () => ChatApiService.getUserList();
export const getPeopleChatMes = (name: string, page?: number) => ChatApiService.getPeopleChatMes(name, page);
export const getRoomChatMes = (name: string, page?: number) => ChatApiService.getRoomChatMes(name, page);
export const createRoom = (name: string) => ChatApiService.createRoom(name);
export const joinRoom = (name: string) => ChatApiService.joinRoom(name);
export const sendMessage = (type: "people" | "room", to: string, mes: string) => ChatApiService.sendMessage(type, to, mes);
export const reLogin = (user: string, code: string) => ChatApiService.reLogin(user, code);
export const checkUserOnline = (username: string) => ChatApiService.checkUserOnline(username);
export const checkUserExists = (username: string) => ChatApiService.checkUserExists(username);
export default ChatApiService;

