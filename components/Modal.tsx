
import React from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-xl flex justify-center items-end sm:items-center z-[100]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-gray-950 w-full h-[92vh] sm:h-auto sm:max-w-2xl sm:rounded-3xl flex flex-col border-t sm:border border-white/10 rounded-t-[2.5rem] overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        
        <header className="flex justify-between items-center px-6 py-5 border-b border-white/5 shrink-0">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
