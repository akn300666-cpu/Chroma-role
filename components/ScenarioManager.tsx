
import React, { useState } from 'react';
import type { Scenario, Character } from '../types';
import { generateUUID } from '../utils';
import { PlusIcon } from './icons';

interface ScenarioManagerProps {
  scenarios: Scenario[];
  setScenarios: React.Dispatch<React.SetStateAction<Scenario[]>>;
  characters: Character[];
  onSelectScenario: (scenarioId: string) => void;
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({ scenarios, setScenarios, characters, onSelectScenario }) => {
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  const handleSave = (scenario: Scenario) => {
    if (scenarios.some(s => s.id === scenario.id)) {
      setScenarios(scens => scens.map(s => s.id === scenario.id ? scenario : s));
    } else {
      setScenarios(scens => [...scens, scenario]);
    }
    setEditingScenario(null);
  };

  const handleAddNew = () => {
    setEditingScenario({
      id: generateUUID(),
      name: '',
      description: '',
      characterIds: [],
      chatParameters: {
        temperature: 0.9,
        topK: 40,
        topP: 1.0,
        maxTokens: 1200,
        contextSize: 4096,
        repetitionPenalty: 1.1
      },
      systemInstruction: 'Describe the setting and dynamic.',
      language: 'English',
      memory: '',
      backgroundImageUrl: '',
      backgroundOpacity: 15,
      backgroundBlur: 10,
      userPersona: '',
      gradioUrl: '',
    });
  };

  if (editingScenario) {
    return <ScenarioForm scenario={editingScenario} allCharacters={characters} onSave={handleSave} onCancel={() => setEditingScenario(null)} />;
  }

  return (
    <div className="p-4 h-full overflow-y-auto bg-black pb-24">
      <div className="flex justify-between items-center mb-10 pt-[env(safe-area-inset-top)]">
        <div>
           <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Worlds</h2>
           <p className="text-zinc-500 text-[10px] tracking-[0.3em] mt-1">SCENARIO ARCHIVE</p>
        </div>
        <button onClick={handleAddNew} className="bg-teal-600 active:scale-95 text-white font-black py-3 px-6 rounded-2xl transition shadow-xl shadow-teal-900/20 text-[10px] tracking-widest uppercase">
          <PlusIcon className="w-5 h-5"/>
        </button>
      </div>

      <div className="space-y-4">
        {scenarios.map(scen => (
          <div key={scen.id} className="bg-zinc-900/50 rounded-3xl p-6 border border-white/5 shadow-2xl overflow-hidden relative group">
             {scen.backgroundImageUrl && (
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <img src={scen.backgroundImageUrl} alt="BG" className="w-full h-full object-cover scale-110 blur-sm" />
                </div>
             )}
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{scen.name}</h3>
                    <p className="text-zinc-500 mt-2 text-xs line-clamp-2 font-light">{scen.description}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center -space-x-3">
                    {characters.filter(c => scen.characterIds.includes(c.id)).map(char => {
                       const isVideo = char.avatar.endsWith('.mp4') || char.avatar.endsWith('.webm');
                       if (isVideo) {
                           return <video key={char.id} src={char.avatar} title={char.name} className="w-10 h-10 rounded-full border-2 border-black object-cover bg-black" autoPlay loop muted playsInline />;
                       }
                       return <img key={char.id} src={char.avatar} alt={char.name} title={char.name} className="w-10 h-10 rounded-full border-2 border-black object-cover"/>;
                    })}
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setEditingScenario(scen)} className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-400 font-black py-3.5 rounded-2xl transition border border-white/5 text-[10px] tracking-widest uppercase">Config</button>
                  <button onClick={() => onSelectScenario(scen.id)} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-black py-3.5 rounded-2xl transition shadow-xl shadow-teal-900/30 text-[10px] tracking-widest uppercase">Enter</button>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScenarioForm: React.FC<{ scenario: Scenario, allCharacters: Character[], onSave: (scen: Scenario) => void, onCancel: () => void }> = ({ scenario, allCharacters, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Scenario>(scenario);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as any }));
    };

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            chatParameters: {
                ...prev.chatParameters,
                [name]: parseFloat(value)
            }
        }));
    };

    const handleVisualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
    };
    
    const handleCharacterToggle = (charId: string) => {
        setFormData(prev => {
            const characterIds = prev.characterIds.includes(charId)
                ? prev.characterIds.filter(id => id !== charId)
                : [...prev.characterIds, charId];
            return { ...prev, characterIds };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="p-4 h-full overflow-y-auto bg-black pb-24 custom-scrollbar pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-4 mb-10">
                <button onClick={onCancel} className="p-2 text-zinc-500 hover:text-white transition rounded-full hover:bg-white/5 active:scale-90">
                    <PlusIcon className="w-8 h-8 rotate-45" />
                </button>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">New World</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <InputField label="World Name" name="name" value={formData.name} onChange={handleChange} required />
                <TextAreaField label="Premise Hook" name="description" value={formData.description} onChange={handleChange} rows={2} required />
                
                <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-black text-teal-500 uppercase tracking-widest mb-6">Engine Link</h3>
                    <InputField 
                        label="Endpoint URL" 
                        name="gradioUrl" 
                        value={formData.gradioUrl || ''} 
                        onChange={handleChange} 
                        placeholder="https://xxxxx.loca.lt/v1"
                    />
                </div>

                <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-black text-teal-500 uppercase tracking-widest mb-6">Visual Ambience</h3>
                    <div className="space-y-6">
                        <InputField label="Background Image URL" name="backgroundImageUrl" value={formData.backgroundImageUrl || ''} onChange={handleChange} />
                        <Slider label="Background Opacity" name="backgroundOpacity" value={formData.backgroundOpacity ?? 15} min={0} max={100} step={1} onChange={handleVisualChange} unit="%" />
                        <Slider label="Background Blur" name="backgroundBlur" value={formData.backgroundBlur ?? 10} min={0} max={40} step={1} onChange={handleVisualChange} unit="px" />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest ml-1">The Cast</label>
                    <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-900/30 rounded-3xl border border-white/5">
                        {allCharacters.map(char => {
                            const isSelected = formData.characterIds.includes(char.id);
                            return (
                                <div key={char.id} onClick={() => handleCharacterToggle(char.id)} className={`cursor-pointer p-3 rounded-2xl text-center transition-all active:scale-95 ${isSelected ? 'bg-teal-600 shadow-lg shadow-teal-900/40' : 'bg-black/40'}`}>
                                    <img src={char.avatar} alt={char.name} className="w-12 h-12 rounded-full mx-auto mb-2 object-cover border-2 border-black shadow-md"/>
                                    <span className="text-[10px] font-black uppercase tracking-tight text-white block truncate">{char.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-black text-teal-500 uppercase tracking-widest mb-6">Core Directives</h3>
                    <TextAreaField label="Setting Instruction" name="systemInstruction" value={formData.systemInstruction} onChange={handleChange} rows={4} />
                    <div className="mt-8 space-y-7">
                        <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em]">Neural Tuning</h4>
                        <Slider label="Temperature" name="temperature" value={formData.chatParameters.temperature} min={0} max={2} step={0.05} onChange={handleParamChange} />
                        <Slider label="Max Tokens" name="maxTokens" value={formData.chatParameters.maxTokens} min={128} max={4096} step={128} onChange={handleParamChange} />
                    </div>
                </div>

                <div className="flex gap-4 pt-4 mb-20">
                    <button type="button" onClick={onCancel} className="flex-1 bg-white/5 text-zinc-400 font-black py-5 rounded-3xl text-[10px] tracking-widest uppercase">Discard</button>
                    <button type="submit" className="flex-1 bg-teal-600 text-white font-black py-5 rounded-3xl text-[10px] tracking-widest uppercase shadow-2xl shadow-teal-900/40">Manifest</button>
                </div>
            </form>
        </div>
    );
};

const InputField: React.FC<{label: string, name: string, value: string, onChange: any, required?: boolean, placeholder?: string, type?: string}> = ({ label, name, value, onChange, required, placeholder, type="text" }) => (
    <div className="w-full">
        <label htmlFor={name} className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest ml-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="w-full bg-black/40 border border-white/5 text-white rounded-2xl px-5 py-4 outline-none focus:border-teal-500 transition shadow-inner text-sm"
        />
    </div>
);

const TextAreaField: React.FC<{label: string, name: string, value: string, onChange: any, required?: boolean, rows?: number, placeholder?: string}> = ({ label, name, value, onChange, required, rows=3, placeholder }) => (
    <div className="w-full">
        <label htmlFor={name} className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest ml-1">{label}</label>
        <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-black/40 border border-white/5 text-white rounded-2xl px-5 py-4 outline-none focus:border-teal-500 transition custom-scrollbar shadow-inner text-sm"
        />
    </div>
);

const Slider: React.FC<{label: string, name: string, value: number, min: number, max: number, step: number, unit?: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;}> = ({ label, name, value, min, max, step, unit = "", onChange }) => (
    <div className="w-full">
        <label htmlFor={name} className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 mb-3 tracking-widest ml-1">
            <span>{label}</span>
            <span className="font-bold text-teal-500">{value}{unit}</span>
        </label>
        <input type="range" id={name} name={name} min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-teal-500" />
    </div>
);

export default ScenarioManager;
