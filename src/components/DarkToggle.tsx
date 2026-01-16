import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const DarkToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={`dark-toggle ${theme === 'dark' ? 'active' : ''}`}
      title="Chế độ ban đêm"
      aria-pressed={theme === 'dark'}
      onClick={toggleTheme}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon" aria-hidden="true">
        <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>
      </svg>
    </button>
  );
};

export default DarkToggle;
