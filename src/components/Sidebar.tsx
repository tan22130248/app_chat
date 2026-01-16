import React from 'react';
import { MessageCircle, Users, LogOut, UserPlus, SquarePen, SquarePlus } from 'lucide-react';
import DarkToggle from './DarkToggle';

interface SidebarProps {
  currentTheme?: any;
  onCreateChat?: () => void;
  onCreateGroupChat?: () => void;
  onOpenGroupChat?: () => void;
  onOpenPeopleChat?: () => void;
  onJoinGroup?: () => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTheme, onCreateChat, onCreateGroupChat, onOpenGroupChat, onOpenPeopleChat, onJoinGroup, onLogout }) => {
  return (
    <div className="sidebar" role="navigation">
      <div className="sidebar-top">
        <img src="https://picsum.photos/seed/me/40/40" alt="Avatar" className="sidebar-avatar" />
      </div>

      <div className="sidebar-actions">
        <button type="button" className="sidebar-action" title="Tin nhắn" onClick={onOpenPeopleChat}>
          <MessageCircle size={24} />
        </button>
        <button type="button" className="sidebar-action" title="Danh bạ / Nhóm" onClick={onOpenGroupChat}>
          <Users size={24} />
        </button>
        <button type="button" className="sidebar-action" title="Tạo chat mới" onClick={onCreateChat}>
          <UserPlus size={24} />
        </button>
        <button type="button" className="sidebar-action" title="Tạo nhóm" onClick={onCreateGroupChat}>
          <SquarePen size={20} />

        </button>
        <button type="button" className="sidebar-action" title="Vào nhóm" onClick={onJoinGroup}>
          <SquarePlus size={20} />
        </button>
      </div>

      <div className="sidebar-bottom">
        {/*<div style={{marginBottom:8}}>*/}
        {/*  <DarkToggle />*/}
        {/*</div>*/}
        <button type="button" className="sidebar-action" title="Đăng xuất" onClick={onLogout}>
          <LogOut size={22} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
