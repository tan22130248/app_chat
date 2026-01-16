import { useState } from "react";
import { X } from "lucide-react";
import { sendMessage, checkUserExists } from "../../api/chatApi";

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomName: string;
    currentUser: string;
}

export default function InviteModal({
    isOpen,
    onClose,
    roomName,
    currentUser,
}: InviteModalProps) {
    const [username, setUsername] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSendInvite = async () => {
        const trimmed = username.trim();
        if (!trimmed) {
            setError("Vui lòng nhập tên người dùng");
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            console.log(`[INVITE] Checking if user "${trimmed}" exists...`);
            
            // Kiểm tra người dùng có tồn tại không với timeout 5 giây
            const checkPromise = checkUserExists(trimmed);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Check timeout")), 5000)
            );
            
            const checkRes: any = await Promise.race([checkPromise, timeoutPromise]);
            console.log(`[INVITE] checkUserExists response:`, checkRes);

            if (!checkRes.data.status) {
                console.log(`[INVITE] User "${trimmed}" does not exist`);
                setError(`Người dùng "${trimmed}" không tồn tại`);
                setIsLoading(false);
                return;
            }

            console.log(`[INVITE] User "${trimmed}" exists, sending invite message...`);
            
            // Gửi tin nhắn mời với timeout 3 giây (API không trả response)
            const sendPromise = sendMessage("people", trimmed, `[INVITE]${roomName}`);
            const sendTimeoutPromise = new Promise((resolve) =>
                setTimeout(() => resolve({ status: "sent" }), 3000)
            );
            
            const sendRes: any = await Promise.race([sendPromise, sendTimeoutPromise]);
            console.log(`[INVITE] sendMessage response:`, sendRes);

            console.log(`[INVITE] Successfully sent invite to "${trimmed}" for room "${roomName}"`);
            
            setSuccess(`✓ Gửi lời mời thành công tới ${trimmed}`);
            setUsername("");
            
            // Đóng modal sau 1.5s
            setTimeout(() => {
                onClose();
                setSuccess("");
            }, 1500);
        } catch (err) {
            console.error(`[INVITE] Error:`, err);
            setError("Gửi lời mời thất bại");
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="invite-modal-overlay">
            <div className="invite-modal">
                <div className="invite-modal-header">
                    <h2>Mời vào nhóm {roomName}</h2>
                    <button
                        onClick={onClose}
                        className="invite-modal-close"
                        disabled={isLoading}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="invite-modal-body">
                    <input
                        type="text"
                        placeholder="Nhập tên người dùng..."
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            setError("");
                            setSuccess("");
                        }}
                        onKeyDown={(e) =>
                            e.key === "Enter" && !isLoading && handleSendInvite()
                        }
                        disabled={isLoading}
                        className="invite-input"
                    />
                    {error && <div className="invite-error">{error}</div>}
                    {success && <div className="invite-success">{success}</div>}
                </div>

                <div className="invite-modal-footer">
                    <button
                        onClick={onClose}
                        className="invite-btn-cancel"
                        disabled={isLoading}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSendInvite}
                        className="invite-btn-send"
                        disabled={isLoading}
                    >
                        {isLoading ? "Đang kiểm tra..." : "Gửi lời mời"}
                    </button>
                </div>
            </div>
        </div>
    );
}
