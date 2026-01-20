
import React, { useState } from 'react';
import type { Character } from '../types';
import { generateUUID } from '../utils';
import { PlusIcon, ChatIcon } from './icons';

interface CharacterManagerProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  onStartChat: (characterId: string) => void;
}

const CharacterManager: React.FC<CharacterManagerProps> = ({ characters, setCharacters, onStartChat }) => {
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const handleSave = (character: Character) => {
    if (characters.some(c => c.id === character.id)) {
      setCharacters(chars => chars.map(c => c.id === character.id ? character : c));
    } else {
      setCharacters(chars => [...chars, character]);
    }
    setEditingCharacter(null);
  };
  
  const handleAddNew = () => {
    setEditingCharacter({
      id: generateUUID(),
      name: '',
      avatar: `https://picsum.photos/seed/${Math.random()}/200`,
      persona: '',
      systemInstruction: '',
      preHistory: '',
      postHistory: ''
    });
  };

  if (editingCharacter) {
    return <CharacterForm character={editingCharacter} onSave={handleSave} onCancel={() => setEditingCharacter(null)} />;
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-black">
      <div className="flex justify-between items-center mb-10">
        <div>
           <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Personas</h2>
           <p className="text-zinc-500 text-xs tracking-widest mt-1">THE ARCHITECT OF CONNECTION</p>
        </div>
        <button onClick={handleAddNew} className="flex items-center bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-6 rounded-2xl transition shadow-xl shadow-teal-900/20 text-[10px] tracking-widest uppercase">
          <PlusIcon className="w-5 h-5 mr-2"/>
          New Soul
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {characters.map(char => {
            const isVideo = char.avatar.endsWith('.mp4') || char.avatar.endsWith('.webm');
            return (
              <div key={char.id} className="bg-zinc-900/50 rounded-3xl p-6 flex flex-col items-center text-center border border-white/5 hover:border-teal-500/30 transition-all group shadow-2xl">
                <div className="relative mb-6">
                    {isVideo ? (
                        <video 
                            src={char.avatar} 
                            className="w-32 h-32 rounded-full border-4 border-black ring-2 ring-zinc-800 object-cover bg-black shadow-2xl"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    ) : (
                        <img src={char.avatar} alt={char.name} className="w-32 h-32 rounded-full border-4 border-black ring-2 ring-zinc-800 object-cover shadow-2xl" />
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-teal-500 rounded-full border-4 border-zinc-900 shadow-xl"></div>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{char.name}</h3>
                <p className="text-zinc-500 mt-3 text-xs leading-relaxed line-clamp-3 font-light px-4">{char.persona}</p>
                
                <div className="flex gap-3 w-full mt-8">
                    <button onClick={() => onStartChat(char.id)} className="flex-1 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-2xl transition border border-white/5 text-[10px] tracking-widest uppercase">
                        <ChatIcon className="w-4 h-4 mr-2" />
                        Chat
                    </button>
                    <button onClick={() => setEditingCharacter(char)} className="flex-1 bg-teal-600/10 hover:bg-teal-600 text-teal-500 hover:text-white font-bold py-3.5 rounded-2xl transition border border-teal-500/20 text-[10px] tracking-widest uppercase">
                        Modify
                    </button>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

const CharacterForm: React.FC<{ character: Character, onSave: (char: Character) => void, onCancel: () => void }> = ({ character, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Character>(character);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-black max-w-5xl mx-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10">
                <button onClick={onCancel} className="p-2 text-zinc-500 hover:text-white transition rounded-full hover:bg-white/5">
                    <PlusIcon className="w-8 h-8 rotate-45" />
                </button>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{!character.name ? 'Manifest New Soul' : `Refining ${character.name}`}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField label="Identity (Name)" name="name" value={formData.name} onChange={handleChange} required placeholder="Eve" />
                    <InputField label="Visual Link (Avatar URL)" name="avatar" value={formData.avatar} onChange={handleChange} placeholder="Video or Image Link..." />
                </div>

                <div className="space-y-6">
                    <TextAreaField 
                        label="Persona (The Inner Mind)" 
                        name="persona" 
                        value={formData.persona} 
                        onChange={handleChange} 
                        rows={10} 
                        required 
                        placeholder="Define their complexity, wit, and emotional triggers..."
                    />
                    
                    <TextAreaField 
                        label="System Protocol (Behavioral Rules)" 
                        name="systemInstruction" 
                        value={formData.systemInstruction} 
                        onChange={handleChange} 
                        rows={6} 
                        placeholder="Direct rules for output style, language, and logic..."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <TextAreaField 
                            label="Pre-History (Origin Story)" 
                            name="preHistory" 
                            value={formData.preHistory} 
                            onChange={handleChange} 
                            rows={3} 
                            placeholder="Events that happened before the user met them..."
                        />
                        <TextAreaField 
                            label="Post-History (Current Status)" 
                            name="postHistory" 
                            value={formData.postHistory} 
                            onChange={handleChange} 
                            rows={3} 
                            placeholder="Ongoing threads or current goals..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t border-white/5">
                    <button type="button" onClick={onCancel} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-zinc-400 font-black rounded-2xl transition text-[10px] tracking-widest uppercase">Discard</button>
                    <button type="submit" className="px-10 py-4 bg-teal-600 hover:bg-teal-500 text-white font-black rounded-2xl transition shadow-2xl shadow-teal-900/40 text-[10px] tracking-widest uppercase">Save Persona</button>
                </div>
            </form>
        </div>
    );
};

const InputField: React.FC<{label: string, name: string, value: string, onChange: any, required?: boolean, placeholder?: string}> = ({ label, name, value, onChange, required, placeholder }) => (
    <div>
        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-3 tracking-widest ml-1">{label}</label>
        <input
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="w-full bg-zinc-900/50 border border-white/5 text-white rounded-2xl px-5 py-4 outline-none focus:border-teal-500 transition shadow-inner"
        />
    </div>
);

const TextAreaField: React.FC<{label: string, name: string, value: string, onChange: any, required?: boolean, rows?: number, placeholder?: string}> = ({ label, name, value, onChange, required, rows=3, placeholder }) => (
    <div>
        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-3 tracking-widest ml-1">{label}</label>
        <textarea
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-zinc-900/50 border border-white/5 text-white rounded-2xl px-5 py-4 outline-none focus:border-teal-500 transition custom-scrollbar shadow-inner"
        />
    </div>
);

export default CharacterManager;
