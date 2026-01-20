
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Scenario, Character, Message } from '../types';
import { MessageSender } from '../types';
import { generateUUID } from '../utils';
import { generateGradioText, summarizeHistory, compressMacroMemory } from '../services/gradioService';
import { UserIcon, SendIcon, SettingsIcon, ArrowLeftIcon } from './icons';
import Modal from './Modal';

interface ChatViewProps {
  scenario: Scenario;
  characters: Character[];
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  updateScenario: (scenario: Scenario) => void;
  removeMessage: (messageId: string) => void;
  onBack: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  scenario,
  characters,
  messages,
  addMessage,
  updateMessage,
  updateScenario,
  removeMessage,
  onBack,
}) => {
  const [userInput, setUserInput] = useState('');
  const [isAiTurn, setIsAiTurn] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSummarizedAt = useRef<number>(0);
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const realMessages = messages.filter(m => !m.isLoading && m.text);
    const msgCount = realMessages.length;
    if (msgCount >= lastSummarizedAt.current + 20 && !isSummarizing) {
        lastSummarizedAt.current = msgCount;
        handleFractalCompression(realMessages);
    }
  }, [messages.length]);

  const handleFractalCompression = async (currentHistory: Message[]) => {
    if (!scenario.gradioUrl || isSummarizing) return;
    setIsSummarizing(true);
    try {
        const newMemoryPoint = await summarizeHistory(scenario, currentHistory);
        if (newMemoryPoint) {
            const updatedIntermediates = [...(scenario.intermediateMemories || []), newMemoryPoint];
            if (updatedIntermediates.length >= 10) {
                const masterMemory = await compressMacroMemory(scenario, updatedIntermediates);
                updateScenario({
                    ...scenario,
                    memory: masterMemory || scenario.memory,
                    intermediateMemories: []
                });
            } else {
                updateScenario({
                    ...scenario,
                    intermediateMemories: updatedIntermediates
                });
            }
        }
    } catch (err) {
        console.error("[Fractal Memory Error]:", err);
    } finally {
        setIsSummarizing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processAiResponse = useCallback(async (character: Character, currentMessages: Message[]) => {
    if (!scenario.gradioUrl) return;
    setIsAiTurn(true);
    const loadingMessageId = generateUUID();
    addMessage({ id: loadingMessageId, sender: MessageSender.Character, characterId: character.id, timestamp: new Date().toISOString(), isLoading: true });
    try {
        const responseText = await generateGradioText(character, scenario, characters, currentMessages);
        removeMessage(loadingMessageId);
        if (responseText) {
          addMessage({ id: generateUUID(), sender: MessageSender.Character, characterId: character.id, text: responseText.trim(), timestamp: new Date().toISOString() });
        }
    } catch (err: any) {
        removeMessage(loadingMessageId);
        addMessage({ id: generateUUID(), sender: MessageSender.Character, characterId: character.id, text: `❌ ERROR: ${err.message}`, timestamp: new Date().toISOString() });
    } finally {
        setIsAiTurn(false);
        setTurnIndex(prev => (prev + 1) % (characters.length || 1));
    }
  }, [addMessage, characters, scenario, removeMessage]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isAiTurn) return;
    const userMsgText = userInput.trim();
    const userMessage: Message = { id: generateUUID(), sender: MessageSender.User, text: userMsgText, timestamp: new Date().toISOString() };
    const updatedMessages = [...messagesRef.current, userMessage];
    addMessage(userMessage);
    setUserInput('');
    if (characters.length > 0) {
      processAiResponse(characters[turnIndex], updatedMessages);
    }
  };

  const getCharacter = (id: string) => characters.find(c => c.id === id);
  const stagedCount = (scenario.intermediateMemories || []).length;

  // Background Styles
  const bgOpacity = scenario.backgroundOpacity !== undefined ? scenario.backgroundOpacity / 100 : 0.15;
  const bgBlur = scenario.backgroundBlur !== undefined ? scenario.backgroundBlur : 10;

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
      {scenario.backgroundImageUrl && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
             <img 
                src={scenario.backgroundImageUrl} 
                alt="BG" 
                className="w-full h-full object-cover" 
                style={{ 
                    opacity: bgOpacity, 
                    filter: `blur(${bgBlur}px)`,
                    transform: 'scale(1.1)' 
                }} 
             />
             <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
          </div>
      )}

      <header className="relative z-20 flex justify-between items-center px-4 h-16 bg-black/70 backdrop-blur-2xl border-b border-white/5 shadow-2xl shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 overflow-hidden">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition p-2 rounded-full shrink-0 active:scale-90">
                <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black text-white uppercase tracking-widest truncate">{scenario.name}</h2>
                    {isSummarizing && <span className="text-[6px] bg-teal-500/20 text-teal-400 px-1 rounded animate-pulse font-black">SYNC</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full ${i < stagedCount ? 'bg-teal-500 shadow-[0_0_5px_rgba(20,184,166,0.5)]' : 'bg-zinc-800'}`} />
                        ))}
                    </div>
                    <span className="text-[7px] text-zinc-500 font-black uppercase tracking-tighter shrink-0">{stagedCount}/10 MEMS</span>
                </div>
            </div>
        </div>

        <div className="flex items-center -space-x-3 shrink-0 ml-2">
            {characters.slice(0, 3).map((char, i) => (
                <div key={char.id} className="relative" style={{zIndex: 10 - i}}>
                    <img src={char.avatar} alt={char.name} className="w-8 h-8 rounded-full object-cover border-2 border-black shadow-lg" />
                </div>
            ))}
        </div>
        
        <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition p-2 rounded-full shrink-0 ml-1 active:scale-90">
            <SettingsIcon className="w-6 h-6" />
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 relative z-10 custom-scrollbar">
        <div className="w-full space-y-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} getCharacter={getCharacter} />
            ))}
            <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-3 bg-black/80 backdrop-blur-3xl border-t border-white/5 relative z-20 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={scenario.gradioUrl ? "Enter message..." : "Fix link in settings"}
            disabled={isAiTurn}
            className="flex-1 bg-white/[0.08] border border-white/10 text-white rounded-full px-5 py-3.5 focus:border-teal-500/50 outline-none transition disabled:opacity-50 text-[15px] min-w-0 shadow-inner"
          />
          <button type="submit" disabled={!userInput.trim() || isAiTurn} className="bg-teal-600 text-white rounded-full p-3.5 hover:bg-teal-500 transition-all active:scale-90 shadow-xl shadow-teal-900/40 shrink-0">
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={`Scenario Engine`}>
          <ScenarioSettingsEditor scenario={scenario} updateScenario={updateScenario} onClose={() => setIsSettingsOpen(false)} />
      </Modal>
    </div>
  );
};

const ChatMessage: React.FC<{ message: Message, getCharacter: (id: string) => Character | undefined }> = ({ message, getCharacter }) => {
    const isUser = message.sender === MessageSender.User;
    const character = !isUser && message.characterId ? getCharacter(message.characterId) : null;
    return (
        <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''} w-full`}>
            {!isUser && character && <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black shadow-lg"><img src={character.avatar} alt={character.name} className="w-full h-full object-cover" /></div>}
            {isUser && <div className="w-8 h-8 flex items-center justify-center bg-zinc-900 text-teal-500 rounded-full shrink-0 border border-white/10 shadow-lg"><UserIcon className="w-4 h-4" /></div>}
            <div className={`flex flex-col max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
                {!isUser && character && <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 ml-1">{character.name}</span>}
                <div className={`p-4 rounded-2xl shadow-xl leading-relaxed ${isUser ? 'bg-zinc-800 text-white rounded-tr-none' : 'bg-black/40 backdrop-blur-md text-zinc-200 rounded-tl-none border border-white/10'}`}>
                    {message.isLoading ? <div className="flex gap-1 py-1"><div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse"></div><div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse [animation-delay:-0.3s]"></div></div> : <p className="text-[14px] whitespace-pre-wrap font-light tracking-wide">{message.text}</p>}
                </div>
            </div>
        </div>
    );
};

const ScenarioSettingsEditor: React.FC<{ scenario: Scenario, updateScenario: (s: Scenario) => void, onClose: () => void }> = ({ scenario, updateScenario, onClose }) => {
    const [formData, setFormData] = useState<Scenario>(scenario);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            chatParameters: {
                ...formData.chatParameters,
                [name]: parseFloat(value)
            }
        });
    };

    const handleVisualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: parseFloat(value)
        });
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-white/10 shadow-inner">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Endpoint URL</label>
                <input name="gradioUrl" value={formData.gradioUrl || ''} onChange={handleChange} className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-teal-500 transition" placeholder="https://xxxx.loca.lt/v1" />
            </div>

            <div className="p-5 bg-zinc-900 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-6 flex items-center gap-2">
                    Visual Ambience
                </h3>
                <div className="space-y-7">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Background URL</label>
                        <input name="backgroundImageUrl" value={formData.backgroundImageUrl || ''} onChange={handleChange} className="w-full bg-black/40 border border-white/5 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-teal-500 transition" placeholder="Image URL..." />
                    </div>
                    <Slider label="Background Opacity" name="backgroundOpacity" value={formData.backgroundOpacity ?? 15} min={0} max={100} step={1} onChange={handleVisualChange} unit="%" />
                    <Slider label="Background Blur" name="backgroundBlur" value={formData.backgroundBlur ?? 10} min={0} max={40} step={1} onChange={handleVisualChange} unit="px" />
                </div>
            </div>

            <div className="p-5 bg-zinc-900 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-6 flex items-center gap-2">
                    Neural Tuning
                </h3>
                <div className="space-y-7">
                    <Slider label="Temperature" name="temperature" value={formData.chatParameters.temperature} min={0} max={2} step={0.05} onChange={handleParamChange} />
                    <Slider label="Top-P" name="topP" value={formData.chatParameters.topP} min={0} max={1} step={0.05} onChange={handleParamChange} />
                    <Slider label="Top-K" name="topK" value={formData.chatParameters.topK} min={1} max={100} step={1} onChange={handleParamChange} />
                    <Slider label="Repetition Penalty" name="repetitionPenalty" value={formData.chatParameters.repetitionPenalty} min={1} max={2} step={0.05} onChange={handleParamChange} />
                    <Slider label="Max Tokens" name="maxTokens" value={formData.chatParameters.maxTokens} min={128} max={4096} step={128} onChange={handleParamChange} />
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-5 bg-zinc-900 rounded-2xl border border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-4 flex items-center justify-between">
                        Staged Chronicles (Tier 1)
                        <span className="text-[9px] text-zinc-500">{(formData.intermediateMemories || []).length}/10</span>
                    </h3>
                    <div className="space-y-2">
                        {formData.intermediateMemories?.length ? formData.intermediateMemories.map((m, i) => (
                            <div key={i} className="text-[11px] text-zinc-400 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed font-light">
                                <span className="text-teal-600/50 font-black mr-2">#{i+1}</span>
                                {m}
                            </div>
                        )) : (
                            <p className="text-[10px] text-zinc-600 italic text-center py-4">No staged memories yet. Summaries occur every 20 messages.</p>
                        )}
                    </div>
                </div>

                <div className="p-5 bg-teal-900/10 rounded-2xl border border-teal-500/20 shadow-inner">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-4 flex items-center gap-2">
                        Global Memory (Tier 2)
                    </h3>
                    <textarea 
                        name="memory" 
                        value={formData.memory || ''} 
                        onChange={handleChange} 
                        rows={5} 
                        className="w-full bg-black/40 border border-white/5 text-zinc-300 text-xs rounded-xl px-4 py-3 outline-none focus:border-teal-500 transition custom-scrollbar font-light leading-relaxed" 
                        placeholder="Permanent history stored here..." 
                    />
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur-3xl border-t border-white/5 flex gap-3 z-50">
                <button onClick={onClose} className="flex-1 bg-white/5 text-zinc-400 font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase active:scale-95 transition">CANCEL</button>
                <button onClick={() => { updateScenario(formData); onClose(); }} className="flex-1 bg-teal-600 text-white font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase shadow-xl shadow-teal-900/30 active:scale-95 transition">COMMIT ENGINE</button>
            </div>
        </div>
    );
};

const Slider: React.FC<{label: string, name: string, value: number, min: number, max: number, step: number, unit?: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;}> = ({ label, name, value, min, max, step, unit = "", onChange }) => (
    <div className="space-y-3">
        <label htmlFor={name} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <span>{label}</span>
            <span className="font-bold text-teal-500">{value}{unit}</span>
        </label>
        <input type="range" id={name} name={name} min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-teal-500" />
    </div>
);

export default ChatView;
