import wsService from "./wsService";

export class AuthApi {
    static async login(user: string, pass: string) {
        const payload = {
            action: "onchat",
            data: { event: "LOGIN", data: { user, pass } },
        };
        return wsService.request(payload);
    }

    static async register(user: string, pass: string) {
        const payload = {
            action: "onchat",
            data: { event: "REGISTER", data: { user, pass } },
        };
        return wsService.request(payload);
    }

    static async reLogin(user: string, code: string) {
        const payload = {
            action: "onchat",
            data: { event: "RE_LOGIN", data: { user, code } },
        };
        return wsService.request(payload);
    }

    static async logout() {
        const payload = {
            action: "onchat",
            data: { event: "LOGOUT" },
        };
        return wsService.request(payload);
    }
}
