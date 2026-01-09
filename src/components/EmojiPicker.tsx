import React, { useState } from 'react';
import '../styles/emojiPicker.css';

interface EmojiPickerProps {
  onEmojiSelect: (iconTag: string) => void;
  onClose: () => void;
}

interface IconOption {
  name: string;
  label: string;
  fallback: string; // Unicode emoji để hiển thị nếu icon không tải được
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('smileys');

  // Bộ sưu tập biểu tượng với tên ASCII (định dạng sẽ là [icon]smile)
  const iconCategories: Record<string, IconOption[]> = {
    smileys: [
      { name: 'smile', label: 'Mỉm cười', fallback: '😀' },
      { name: 'grin', label: 'Cười tươi', fallback: '😃' },
      { name: 'laughing', label: 'Cười', fallback: '😄' },
      { name: 'sweat_smile', label: 'Cười sặc mồ hôi', fallback: '😅' },
      { name: 'joy', label: 'Cười tắc kè', fallback: '😂' },
      { name: 'innocent', label: 'Thiên thần', fallback: '😇' },
      { name: 'heart_eyes', label: 'Mắt hình trái tim', fallback: '😍' },
      { name: 'kissing_heart', label: 'Hôn', fallback: '😘' },
      { name: 'cool', label: 'Mát mẻ', fallback: '😎' },
      { name: 'wink', label: 'Nhấp mắt', fallback: '😉' },
      { name: 'money_mouth', label: 'Miệng tiền', fallback: '🤑' },
      { name: 'thinking', label: 'Suy nghĩ', fallback: '🤔' },
      { name: 'face_with_raised_eyebrow', label: 'Cau mày', fallback: '🤨' },
      { name: 'neutral_face', label: 'Bình thường', fallback: '😐' },
      { name: 'expressionless', label: 'Vô cảm', fallback: '😑' },
      { name: 'no_mouth', label: 'Không miệng', fallback: '😶' },
    ],
    gestures: [
      { name: 'wave', label: 'Vẫy tay', fallback: '👋' },
      { name: 'raised_back_of_hand', label: 'Ngửa lòng bàn tay', fallback: '🤚' },
      { name: 'raised_hand_with_fingers_splayed', label: 'Dã ngoại tay', fallback: '🖐️' },
      { name: 'hand', label: 'Bàn tay', fallback: '✋' },
      { name: '+1', label: 'Thích', fallback: '👍' },
      { name: '-1', label: 'Không thích', fallback: '👎' },
      { name: 'fist', label: 'Nắm tay', fallback: '✊' },
      { name: 'punch', label: 'Đấm tay', fallback: '👊' },
      { name: 'clap', label: 'Vỗ tay', fallback: '👏' },
      { name: 'open_hands', label: 'Mở tay', fallback: '👐' },
      { name: 'handshake', label: 'Bắt tay', fallback: '🤝' },
      { name: 'pray', label: 'Cầu nguyện', fallback: '🙏' },
      { name: 'thumbsup', label: 'Ngón cái lên', fallback: '👍' },
      { name: 'thumbsdown', label: 'Ngón cái xuống', fallback: '👎' },
      { name: 'point_left', label: 'Chỉ trái', fallback: '👈' },
      { name: 'point_right', label: 'Chỉ phải', fallback: '👉' },
    ],
    objects: [
      { name: 'phone', label: 'Điện thoại', fallback: '📱' },
      { name: 'computer', label: 'Máy tính', fallback: '💻' },
      { name: 'keyboard', label: 'Bàn phím', fallback: '⌨️' },
      { name: 'desktop_computer', label: 'Máy tính để bàn', fallback: '🖥️' },
      { name: 'printer', label: 'Máy in', fallback: '🖨️' },
      { name: 'mouse_button', label: 'Chuột máy tính', fallback: '🖱️' },
      { name: 'trackball', label: 'Trackball', fallback: '🖲️' },
      { name: 'camera', label: 'Máy ảnh', fallback: '📷' },
      { name: 'film_projector', label: 'Máy chiếu', fallback: '🎦' },
      { name: 'tv', label: 'Tivi', fallback: '📺' },
      { name: 'radio', label: 'Radio', fallback: '📻' },
      { name: 'pager', label: 'Pager', fallback: '📟' },
      { name: 'telephone_receiver', label: 'Ống nghe', fallback: '📞' },
      { name: 'watch', label: 'Đồng hồ', fallback: '⌚' },
      { name: 'alarm_clock', label: 'Đồng hồ báo thức', fallback: '⏰' },
      { name: 'hourglass', label: 'Cát lắc', fallback: '⌛' },
    ],
    nature: [
      { name: 'evergreen_tree', label: 'Cây xanh', fallback: '🌲' },
      { name: 'deciduous_tree', label: 'Cây rụng lá', fallback: '🌳' },
      { name: 'palm_tree', label: 'Cây dừa', fallback: '🌴' },
      { name: 'cactus', label: 'Xương rồng', fallback: '🌵' },
      { name: 'tulip', label: 'Hoa tulip', fallback: '🌷' },
      { name: 'cherry_blossom', label: 'Hoa anh đào', fallback: '🌸' },
      { name: 'rose', label: 'Hoa hồng', fallback: '🌹' },
      { name: 'hibiscus', label: 'Hoa phong chứng', fallback: '🌺' },
      { name: 'sunflower', label: 'Hướng dương', fallback: '🌻' },
      { name: 'blossom', label: 'Hoa blossom', fallback: '🌼' },
      { name: 'cat_face', label: 'Mặt mèo', fallback: '😸' },
      { name: 'dog_face', label: 'Mặt chó', fallback: '🐶' },
      { name: 'tiger_face', label: 'Mặt hổ', fallback: '🐯' },
      { name: 'bear_face', label: 'Mặt gấu', fallback: '🐻' },
      { name: 'panda_face', label: 'Mặt gấu trúc', fallback: '🐼' },
      { name: 'frog_face', label: 'Mặt ếu cù', fallback: '🐸' },
    ],
    food: [
      { name: 'apple', label: 'Táo đỏ', fallback: '🍎' },
      { name: 'green_apple', label: 'Táo xanh', fallback: '🍏' },
      { name: 'pear', label: 'Lê', fallback: '🍐' },
      { name: 'tangerine', label: 'Cam', fallback: '🍊' },
      { name: 'lemon', label: 'Chanh', fallback: '🍋' },
      { name: 'banana', label: 'Chuối', fallback: '🍌' },
      { name: 'watermelon', label: 'Dưa hấu', fallback: '🍉' },
      { name: 'grapes', label: 'Nho', fallback: '🍇' },
      { name: 'strawberry', label: 'Dâu tây', fallback: '🍓' },
      { name: 'melon', label: 'Dưa', fallback: '🍈' },
      { name: 'cherries', label: 'Cherry', fallback: '🍒' },
      { name: 'peach', label: 'Đào', fallback: '🍑' },
      { name: 'pineapple', label: 'Dứa', fallback: '🍍' },
      { name: 'mango', label: 'Xoài', fallback: '🥭' },
      { name: 'bread', label: 'Bánh mì', fallback: '🍞' },
      { name: 'cake', label: 'Bánh', fallback: '🍰' },
    ],
    activity: [
      { name: 'soccer', label: 'Bóng đá', fallback: '⚽' },
      { name: 'basketball', label: 'Bóng rổ', fallback: '🏀' },
      { name: 'football', label: 'Bóng chạm', fallback: '🏈' },
      { name: 'baseball', label: 'Bóng chày', fallback: '⚾' },
      { name: 'tennis', label: 'Quần vợt', fallback: '🎾' },
      { name: 'volleyball', label: 'Bóng chuyền', fallback: '🏐' },
      { name: 'ping_pong', label: 'Bàn', fallback: '🏓' },
      { name: 'badminton', label: 'Cầu lông', fallback: '🏸' },
      { name: 'ice_hockey', label: 'Hockey', fallback: '🏒' },
      { name: 'field_hockey', label: 'Hockey cỏ', fallback: '🏑' },
      { name: 'cricket_game', label: 'Cricket', fallback: '🏏' },
      { name: 'ski', label: 'Trượt tuyết', fallback: '⛷️' },
      { name: 'ice_skate', label: 'Trượt băng', fallback: '⛸️' },
      { name: 'fishing_pole_and_fish', label: 'Câu cá', fallback: '🎣' },
      { name: 'game_die', label: 'Xúc xắc', fallback: '🎲' },
      { name: 'dart', label: 'Phi tiêu', fallback: '🎯' },
    ]
  };

  const categories = [
    { key: 'smileys', label: '😊', title: 'Smileys' },
    { key: 'gestures', label: '👋', title: 'Gestures' },
    { key: 'objects', label: '💻', title: 'Objects' },
    { key: 'nature', label: '🌲', title: 'Nature' },
    { key: 'food', label: '🍎', title: 'Food' },
    { key: 'activity', label: '⚽', title: 'Activity' }
  ];

  const currentIcons = iconCategories[selectedCategory as keyof typeof iconCategories] || [];

  return (
    <>
      <div className="emoji-picker-overlay" onClick={onClose}></div>
      <div className="emoji-picker">
        <div className="emoji-picker-header">
          <h3>Chọn biểu tượng</h3>
          <button className="emoji-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="emoji-categories">
          {categories.map((cat) => (
            <button
              key={cat.key}
              className={`emoji-category-btn ${selectedCategory === cat.key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.key)}
              title={cat.title}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="emoji-grid">
          {currentIcons.map((icon, index) => (
            <button
              key={index}
              className="emoji-item"
              onClick={() => {
                onEmojiSelect(`[icon]${icon.name}`);
                onClose();
              }}
              title={icon.label}
            >
              {icon.fallback}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default EmojiPicker;
