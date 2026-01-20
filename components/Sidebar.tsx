
import React from 'react';
import { View } from '../types';
import { ChatIcon, CharactersIcon, ScenariosIcon } from './icons';

interface SidebarProps {
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
      className={`flex items-center w-full px-4 py-3 transition-colors duration-200 ${
        isActive
          ? 'bg-teal-600 text-white'
          : 'text-gray-400 hover:bg-gray-900 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-4 font-medium">{label}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ view, setView }) => {
  return (
    <aside className="flex flex-col w-64 bg-gray-950 border-r border-gray-900">
      <div className="flex items-center justify-center h-16 border-b border-gray-900">
        <h1 className="text-2xl font-bold text-white tracking-wider">Chroma RP</h1>
      </div>
      <nav className="flex-1 py-4">
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
    </aside>
  );
};

export default Sidebar;