import { useState } from 'react';
import { joinRoom } from '../../api/chatApi';
import { useAppDispatch } from '../../redux/hooks';
import { fetchGroupList } from '../../redux/slices/chatSlice';

interface JoinGroupModalProps {
    show: boolean;
    onClose: () => void;
}
const JoinGroupModal = ({ show, onClose }: JoinGroupModalProps) => {
    const [groupName, setGroupName] = useState("");
    const dispatch = useAppDispatch();
    const handleJoinGroup = async () => {
        if (!groupName.trim()) {
            alert("Tên nhóm không được để trống");
            return;
        }

        try {
            await joinRoom(groupName.trim());
            dispatch(fetchGroupList());
            alert(`Đã vào nhóm ${groupName}`);
            setGroupName("");
            onClose();
        } catch (err: any) {
            console.error("Vào nhóm thất bại:", err);
            alert(err.message || "Vào nhóm thất bại");
        }
    };


    if (!show) return null;

    return (
        <div className="create-chat-modal-overlay">
            <div className="create-chat-modal">
                <h3>Nhập tên nhóm</h3>

                <div className="create-chat-input-wrapper">
                    <input
                        type="text"
                        placeholder="Nhập tên nhóm..."
                        className="create-chat-input"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                    />

                </div>

                <div className="create-chat-buttons">
                    <button onClick={onClose}>Hủy</button>
                    <button onClick={handleJoinGroup}>Vào Nhóm</button>
                </div>
            </div>
        </div>
    );
};

export default JoinGroupModal;
