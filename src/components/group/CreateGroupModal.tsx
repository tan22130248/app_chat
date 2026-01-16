import { useState } from 'react';
import { createRoom } from '../../api/chatApi';
import { fetchGroupList } from '../../redux/slices/chatSlice';
import { useAppDispatch } from '../../redux/hooks';

interface CreateGroupModalProps {
    show: boolean;
    onClose: () => void;
}
const CreateGroupModal = ({ show, onClose }: CreateGroupModalProps) => {
    const [groupName, setGroupName] = useState("");
    const dispatch = useAppDispatch();
    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            alert("Tên nhóm không được để trống");
            return;
        }

        try {
            await createRoom(groupName.trim());
            dispatch(fetchGroupList());
            alert(`Tạo thành công nhóm ${groupName}`);
            setGroupName("");
            onClose();
        } catch (err: any) {
            console.error("Tạo nhóm thất bại:", err);
            alert(err.message || "Tạo nhóm thất bại");
        }
    };


    if (!show) return null;

    return (
        <div className="create-chat-modal-overlay">
            <div className="create-chat-modal">
                <h3>Tạo nhóm chat mới</h3>

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
                    <button onClick={handleCreateGroup}>Tạo nhóm</button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;
