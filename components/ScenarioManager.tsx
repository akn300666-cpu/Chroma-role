
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
      userPersona: '',
      gradioUrl: '',
    });
  };

  if (editingScenario) {
    return <ScenarioForm scenario={editingScenario} allCharacters={characters} onSave={handleSave} onCancel={() => setEditingScenario(null)} />;
  }

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-gray-950">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Scenarios</h2>
        <button onClick={handleAddNew} className="flex items-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition">
          <PlusIcon className="w-5 h-5 mr-2"/>
          New Scenario
        </button>
      </div>
      <div className="space-y-4">
        {scenarios.map(scen => (
          <div key={scen.id} className="bg-gray-900 rounded-lg shadow-lg p-5 border border-gray-800">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-white">{scen.name}</h3>
                <p className="text-gray-400 mt-2">{scen.description}</p>
              </div>
              {scen.gradioUrl && (
                <span className="bg-teal-600/20 text-teal-400 text-[10px] font-bold px-2 py-1 rounded uppercase border border-teal-500/20">Kobold / OpenAI Engine</span>
              )}
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-gray-300 text-sm">Cast:</h4>
              <div className="flex items-center gap-3 mt-2">
                {characters.filter(c => scen.characterIds.includes(c.id)).map(char => {
                   const isVideo = char.avatar.endsWith('.mp4') || char.avatar.endsWith('.webm');
                   if (isVideo) {
                       return <video key={char.id} src={char.avatar} title={char.name} className="w-10 h-10 rounded-full border-2 border-gray-800 object-cover bg-black" autoPlay loop muted playsInline />;
                   }
                   return <img key={char.id} src={char.avatar} alt={char.name} title={char.name} className="w-10 h-10 rounded-full border-2 border-gray-800 object-cover"/>;
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditingScenario(scen)} className="bg-gray-800 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition">Engine Config</button>
              <button onClick={() => onSelectScenario(scen.id)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition">Enter Chat</button>
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
        <div className="p-4 md:p-6 h-full overflow-y-auto bg-gray-950">
            <h2 className="text-3xl font-bold text-white mb-6 uppercase tracking-tighter">{!scenario.name ? 'Manifest Scenario' : `Config ${scenario.name}`}</h2>
            <form onSubmit={handleSubmit} className="space-y-6 pb-12">
                <InputField label="Scenario Name" name="name" value={formData.name} onChange={handleChange} required />
                <TextAreaField label="Description Hook" name="description" value={formData.description} onChange={handleChange} rows={2} required />
                
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold mb-4 text-teal-400">Kobold / OpenAI Engine</h3>
                    <InputField 
                        label="API Base URL (Kaggle/Local Tunnel)" 
                        name="gradioUrl" 
                        value={formData.gradioUrl || ''} 
                        onChange={handleChange} 
                        placeholder="https://xxxxx.loca.lt/v1"
                    />
                    <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">Ensure URL ends with /v1 for proper connection.</p>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold mb-4 text-teal-400">User Identity</h3>
                    <TextAreaField 
                        label="Your Persona (Who are you in this world?)" 
                        name="userPersona" 
                        value={formData.userPersona || ''} 
                        onChange={handleChange} 
                        rows={4} 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Characters</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
                        {allCharacters.map(char => {
                            const isVideo = char.avatar.endsWith('.mp4') || char.avatar.endsWith('.webm');
                            return (
                                <div key={char.id} onClick={() => handleCharacterToggle(char.id)} className={`cursor-pointer p-2 rounded-lg text-center transition ${formData.characterIds.includes(char.id) ? 'bg-teal-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                                    {isVideo ? (
                                        <video src={char.avatar} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover bg-black" autoPlay loop muted playsInline />
                                    ) : (
                                        <img src={char.avatar} alt={char.name} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"/>
                                    )}
                                    <span className="text-sm font-medium">{char.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold mb-4 text-teal-400">World & Parameters</h3>
                    <InputField 
                        label="Background Image/Video URL" 
                        name="backgroundImageUrl" 
                        value={formData.backgroundImageUrl || ''} 
                        onChange={handleChange} 
                        placeholder="Visual mood link..." 
                    />
                     <div className="mt-4">
                        <TextAreaField 
                            label="Initial Story Memory" 
                            name="memory" 
                            value={formData.memory || ''} 
                            onChange={handleChange} 
                            rows={3} 
                        />
                     </div>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold mb-4 text-teal-400">Core Scenario Instruction</h3>
                    <TextAreaField label="Setting Instruction" name="systemInstruction" value={formData.systemInstruction} onChange={handleChange} rows={4} />
                    <div className="mt-6 space-y-6">
                        <h4 className="text-sm font-bold uppercase text-gray-400 tracking-widest">Neural Tuning</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                          <Slider label="Temperature" name="temperature" value={formData.chatParameters.temperature} min={0} max={2} step={0.05} onChange={handleParamChange} />
                          <Slider label="Top-P" name="topP" value={formData.chatParameters.topP} min={0} max={1} step={0.05} onChange={handleParamChange} />
                          <Slider label="Top-K" name="topK" value={formData.chatParameters.topK} min={1} max={100} step={1} onChange={handleParamChange} />
                          <Slider label="Repetition Penalty" name="repetitionPenalty" value={formData.chatParameters.repetitionPenalty} min={1} max={2} step={0.05} onChange={handleParamChange} />
                          <Slider label="Max Tokens" name="maxTokens" value={formData.chatParameters.maxTokens} min={128} max={4096} step={128} onChange={handleParamChange} />
                          <Slider label="Context Size" name="contextSize" value={formData.chatParameters.contextSize} min={1024} max={16384} step={1024} onChange={handleParamChange} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg transition">Discard</button>
                    <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition shadow-xl shadow-teal-900/40">Save Manifest</button>
                </div>
            </form>
        </div>
    );
};

const InputField: React.FC<{label: string, name: string, value: string, onChange: any, required?: boolean, placeholder?: string, type?: string}> = ({ label, name, value, onChange, required, placeholder, type="text" }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition"
        />
    </div>
);

const TextAreaField: React.FC<{label: string, name: string, value: string, onChange: any, required?: boolean, rows?: number, placeholder?: string}> = ({ label, name, value, onChange, required, rows=3, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition custom-scrollbar"
        />
    </div>
);

const Slider: React.FC<{label: string, name: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;}> = ({ label, name, value, min, max, step, onChange }) => (
    <div>
        <label htmlFor={name} className="flex justify-between items-center text-sm font-medium text-gray-300 mb-1">
            <span>{label}</span>
            <span className="font-bold text-teal-400">{value}</span>
        </label>
        <input type="range" id={name} name={name} min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500" />
    </div>
);

export default ScenarioManager;
