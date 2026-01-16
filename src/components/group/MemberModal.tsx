import { User } from "./ChatWindow";

interface Props {
    show: boolean;
    onClose: () => void;
    members: User[];
    loading: boolean;
}

export default function MemberModal({ show, onClose, members, loading }: Props) {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3>Thành viên nhóm</h3>
                    <button onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div className="loading">Đang tải thành viên...</div>
                ) : members.length === 0 ? (
                    <div>Không có thành viên</div>
                ) : (
                    <ul className="member-item">
                        {members.map((m) => (
                            <li key={m.id}>{m.name}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
