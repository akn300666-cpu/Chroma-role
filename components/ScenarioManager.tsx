
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
      imageParameters: {
        negativePrompt: "bad anatomy, blurry, low quality, distorted face, extra limbs",
        ipScale: 0.6,
        guidanceScale: 5.0,
        steps: 30,
        seed: 42,
        randomizeSeed: true,
        useLlm: true,
        llmTemperature: 0.7,
        useEmbedding: true
      },
      systemInstruction: 'Describe the setting and dynamic.',
      language: 'English',
      memory: '',
      baseMemories: [],
      coreMemories: [],
      backgroundImageUrl: '',
      backgroundOpacity: 15,
      backgroundBlur: 10,
      userPersona: '',
      gradioUrl: '',
      imageGradioUrl: '',
      modelId: '',
      tunnelPassword: '',
    });
  };

  if (editingScenario) {
    return <ScenarioForm scenario={editingScenario} allCharacters={characters} onSave={handleSave} onCancel={() => setEditingScenario(null)} />;
  }

  return (
    <div className="p-4 h-full overflow-y-auto bg-black pb-24 pt-[env(safe-area-inset-top)]">
      <div className="flex justify-between items-center mb-10">
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
        const { name, value, type } = e.target;
        const val = type === 'number' ? parseFloat(value) : value;
        setFormData(prev => ({ ...prev, [name]: val }));
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
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Engine Gate</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <InputField label="Scenario Name" name="name" value={formData.name} onChange={handleChange} required />
                <TextAreaField label="World Narrative" name="description" value={formData.description} onChange={handleChange} rows={2} required />
                
                <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-black text-teal-500 uppercase tracking-widest mb-6">Active Cast</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allCharacters.map(char => {
                            const isSelected = formData.characterIds.includes(char.id);
                            const isVideo = char.avatar.endsWith('.mp4') || char.avatar.endsWith('.webm');
                            
                            return (
                                <button
                                    key={char.id}
                                    type="button"
                                    onClick={() => handleCharacterToggle(char.id)}
                                    className={`relative flex items-center gap-4 p-3 rounded-2xl border transition-all group overflow-hidden ${
                                        isSelected 
                                        ? 'bg-teal-900/20 border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.1)]' 
                                        : 'bg-black/40 border-white/5 hover:border-white/20'
                                    }`}
                                >
                                   <div className="relative shrink-0 w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                        {isVideo ? (
                                           <video src={char.avatar} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                        ) : (
                                           <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                                        )}
                                   </div>
                                   
                                   <div className="flex-1 text-left min-w-0">
                                       <div className={`text-xs font-black uppercase tracking-widest truncate ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                           {char.name}
                                       </div>
                                   </div>

                                   {isSelected && (
                                       <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_10px_#14b8a6] mr-2 animate-pulse" />
                                   )}
                                </button>
                            )
                        })}
                         {allCharacters.length === 0 && (
                            <div className="col-span-full text-center py-4 text-zinc-600 text-xs uppercase tracking-widest">
                                No personas available.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-black text-teal-500 uppercase tracking-widest mb-6">Neural Access</h3>
                    <div className="space-y-5">
                      <InputField label="Chat LLM URL (LLM)" name="gradioUrl" value={formData.gradioUrl || ''} onChange={handleChange} placeholder="https://xxx-chat.loca.lt" />
                      <InputField label="Image Gen URL (Flask)" name="imageGradioUrl" value={formData.imageGradioUrl || ''} onChange={handleChange} placeholder="https://xxx.loca.lt" />
                      <InputField label="Model Path" name="modelId" value={formData.modelId || ''} onChange={handleChange} placeholder="e.g. Meta-Llama-3-8B" />
                    </div>
                </div>

                <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-black text-teal-500 uppercase tracking-widest mb-6">World & Memory</h3>
                    <div className="space-y-5">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Permanent Memory</label>
                        <TextAreaField label="" name="memory" value={formData.memory || ''} onChange={handleChange} rows={4} placeholder="Important facts, past events, or specific rules..." />
                        
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Core Memories ({formData.coreMemories?.length || 0}/10)</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-black/40 rounded-xl border border-white/5 custom-scrollbar">
                            {formData.coreMemories?.map((m, i) => (
                                <div key={i} className="text-[10px] text-zinc-400 p-2 bg-white/5 rounded-lg border border-white/5">{m}</div>
                            ))}
                            {!formData.coreMemories?.length && <span className="text-zinc-600 text-[10px] pl-2">No core memories yet.</span>}
                        </div>

                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Base Memories ({formData.baseMemories?.length || 0}/10)</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-black/40 rounded-xl border border-white/5 custom-scrollbar">
                            {formData.baseMemories?.map((m, i) => (
                                <div key={i} className="text-[10px] text-zinc-400 p-2 bg-white/5 rounded-lg border border-white/5">{m}</div>
                            ))}
                            {!formData.baseMemories?.length && <span className="text-zinc-600 text-[10px] pl-2">No base memories yet.</span>}
                        </div>

                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 mt-4">Visual Atmosphere</label>
                        <InputField label="" name="backgroundImageUrl" value={formData.backgroundImageUrl || ''} onChange={handleChange} placeholder="https://..." />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Opacity (%)" name="backgroundOpacity" value={formData.backgroundOpacity?.toString() || '15'} onChange={handleChange} type="number" />
                            <InputField label="Blur (px)" name="backgroundBlur" value={formData.backgroundBlur?.toString() || '10'} onChange={handleChange} type="number" />
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-black text-teal-500 uppercase tracking-widest mb-6">Persona Anchor</h3>
                    <TextAreaField label="User Identity" name="userPersona" value={formData.userPersona || ''} onChange={handleChange} rows={3} placeholder="Describe your character traits..." />
                </div>

                <div className="flex gap-4 pt-4 mb-20">
                    <button type="button" onClick={onCancel} className="flex-1 bg-white/5 text-zinc-400 font-black py-5 rounded-3xl text-[10px] uppercase">Discard</button>
                    <button type="submit" className="flex-1 bg-teal-600 text-white font-black py-5 rounded-3xl text-[10px] uppercase shadow-xl shadow-teal-900/30">Commit Engine</button>
                </div>
            </form>
        </div>
    );
};

const InputField: React.FC<{label: string, name: string, value: string, onChange: any, required?: boolean, placeholder?: string, type?: string}> = ({ label, name, value, onChange, required, placeholder, type="text" }) => (
    <div className="w-full text-left">
        {label && <label htmlFor={name} className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest ml-1">{label}</label>}
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
    <div className="w-full text-left">
        {label && <label htmlFor={name} className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest ml-1">{label}</label>}
        <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-black/40 border border-white/5 text-white rounded-2xl px-5 py-4 outline-none focus:border-teal-500 transition shadow-inner text-sm"
        />
    </div>
);

export default ScenarioManager;
