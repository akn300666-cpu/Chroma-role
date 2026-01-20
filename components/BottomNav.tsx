
import React from 'react';
import { View } from '../types';
import { ChatIcon, CharactersIcon, ScenariosIcon } from './icons';

interface BottomNavProps {
  view: View;
  setView: (view: View) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
        isActive ? 'text-teal-400' : 'text-gray-400 hover:text-teal-400'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ view, setView }) => {
  return (
    <nav className="flex w-full bg-gray-950 border-t border-gray-900 shadow-lg">
        <NavItem
          icon={<ChatIcon className="w-6 h-6" />}
          label="Chat"
          isActive={view === View.Chat}
          onClick={() => setView(View.Chat)}
        />
        <NavItem
          icon={<ScenariosIcon className="w-6 h-6" />}
          label="Scenarios"
          isActive={view === View.Scenarios}
          onClick={() => setView(View.Scenarios)}
        />
        <NavItem
          icon={<CharactersIcon className="w-6 h-6" />}
          label="Characters"
          isActive={view === View.Characters}
          onClick={() => setView(View.Characters)}
        />
    </nav>
  );
};

export default BottomNav;