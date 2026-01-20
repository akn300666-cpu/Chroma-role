
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Scenario, Character, Message } from '../types';
import { MessageSender } from '../types';
import { generateUUID } from '../utils';
import { generateGradioText, testGradioConnection, summarizeHistory, compressMacroMemory } from '../services/gradioService';
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
  onBack: void;
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

  // FRACTAL MEMORY TRIGGER LOGIC
  useEffect(() => {
    const realMessages = messages.filter(m => !m.isLoading && m.text);
    const msgCount = realMessages.length;
    
    // Tier 1 Trigger: Every 20 raw messages
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
            
            // Tier 2 Trigger: When we hit 10 micro-summaries (200 raw messages)
            if (updatedIntermediates.length >= 10) {
                const masterMemory = await compressMacroMemory(scenario, updatedIntermediates);
                updateScenario({
                    ...scenario,
                    memory: masterMemory || scenario.memory,
                    intermediateMemories: [] // Merge and Clear
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

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
      {scenario.backgroundImageUrl && (
          <div className="absolute inset-0 z-0">
             <img src={scenario.backgroundImageUrl} alt="BG" className="w-full h-full object-cover opacity-10 blur-xl scale-110" />
             <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
          </div>
      )}

      <header className="relative z-20 flex justify-between items-center px-4 h-16 bg-black/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shrink-0">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition p-2 rounded-full hover:bg-white/5">
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest truncate max-w-[150px]">{scenario.name}</h2>
                    {isSummarizing && <span className="text-[6px] bg-teal-500/20 text-teal-400 px-1 rounded animate-pulse font-black">STAGING MEMORY</span>}
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full ${i < stagedCount ? 'bg-teal-500' : 'bg-zinc-800'}`} />
                        ))}
                    </div>
                    <span className="text-[7px] text-zinc-500 font-black uppercase tracking-tighter">Tier 2 Ready: {stagedCount}/10</span>
                </div>
            </div>
        </div>

        <div className="flex items-center -space-x-3">
            {characters.map((char, i) => (
                <div key={char.id} className="relative" style={{zIndex: 10 - i}}>
                    <img src={char.avatar} alt={char.name} className="w-10 h-10 rounded-full object-cover border-2 border-black shadow-lg" />
                </div>
            ))}
        </div>
        
        <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition p-2 rounded-full hover:bg-white/5">
            <SettingsIcon className="w-6 h-6" />
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pt-6 pb-20 relative z-10 custom-scrollbar">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} getCharacter={getCharacter} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-black/90 backdrop-blur-3xl border-t border-white/5 relative z-20">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-5xl mx-auto">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={scenario.gradioUrl ? "Enter message..." : "Configure link in settings..."}
            disabled={isAiTurn}
            className="flex-1 bg-white/[0.05] border border-white/10 text-white rounded-2xl px-5 py-4 focus:border-teal-500 outline-none transition disabled:opacity-50 text-[15px]"
          />
          <button type="submit" disabled={!userInput.trim() || isAiTurn} className="bg-teal-900/40 border border-teal-500/30 text-teal-500 rounded-2xl p-4 hover:bg-teal-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-teal-900/20">
            <SendIcon className="w-6 h-6" />
          </button>
        </form>
      </div>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={`Engine Config`}>
          <ScenarioSettingsEditor scenario={scenario} updateScenario={updateScenario} onClose={() => setIsSettingsOpen(false)} />
      </Modal>
    </div>
  );
};

const ChatMessage: React.FC<{ message: Message, getCharacter: (id: string) => Character | undefined }> = ({ message, getCharacter }) => {
    const isUser = message.sender === MessageSender.User;
    const character = !isUser && message.characterId ? getCharacter(message.characterId) : null;
    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* Corrected undefined variable 'char' to 'character' */}
            {!isUser && character && <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black"><img src={character.avatar} alt={character.name} className="w-full h-full object-cover" /></div>}
            {isUser && <div className="w-8 h-8 flex items-center justify-center bg-zinc-900 text-teal-500 rounded-full shrink-0 border border-white/10 shadow-lg"><UserIcon className="w-4 h-4" /></div>}
            <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                {!isUser && character && <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 ml-1">{character.name}</span>}
                <div className={`p-4 rounded-2xl shadow-xl leading-relaxed ${isUser ? 'bg-zinc-800 text-white rounded-tr-none' : 'bg-zinc-900 text-zinc-200 rounded-tl-none border border-white/5'}`}>
                    {message.isLoading ? <div className="flex gap-1 py-1"><div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse"></div><div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse [animation-delay:-0.3s]"></div></div> : <p className="text-[15px] whitespace-pre-wrap font-light">{message.text}</p>}
                </div>
            </div>
        </div>
    );
};

const ScenarioSettingsEditor: React.FC<{ scenario: Scenario, updateScenario: (s: Scenario) => void, onClose: () => void }> = ({ scenario, updateScenario, onClose }) => {
    const [formData, setFormData] = useState<Scenario>(scenario);
    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="p-4 bg-zinc-900 rounded-xl border border-white/10">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Endpoint URL (/v1)</label>
                <input name="gradioUrl" value={formData.gradioUrl || ''} onChange={handleChange} className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 outline-none focus:border-teal-500" />
            </div>

            <div className="p-5 bg-teal-900/10 rounded-xl border border-teal-500/20">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-4">Fractal Memory Status</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                            <span className="text-zinc-400">Global Memory (Tier 2 Permanent)</span>
                            <span className="text-teal-500">Master Archivist</span>
                        </div>
                        <textarea name="memory" value={formData.memory || ''} onChange={handleChange} rows={4} className="w-full bg-black/40 border border-white/5 text-zinc-300 text-xs rounded-lg px-4 py-3 outline-none" placeholder="Deep history lives here..." />
                    </div>
                    <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                            <span className="text-zinc-400">Staged Chunks (Tier 1 Processing)</span>
                            <span className="text-teal-500">{ (formData.intermediateMemories || []).length } / 10 Points</span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto bg-black/20 p-2 rounded-lg border border-white/5">
                            { (formData.intermediateMemories || []).map((m, i) => (
                                <div key={i} className="text-[9px] text-zinc-500 border-l border-teal-500/30 pl-2 italic">Point {i+1}: {m}</div>
                            ))}
                        </div>
                        <p className="text-[8px] text-zinc-600 mt-2 uppercase">When this list hits 10, all points are automatically distilled into the Global Memory block above.</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-black py-2">
                <button onClick={onClose} className="flex-1 bg-white/5 text-zinc-400 font-black py-3 rounded-xl text-[10px] tracking-widest">CANCEL</button>
                <button onClick={() => { updateScenario(formData); onClose(); }} className="flex-1 bg-teal-600 text-white font-black py-3 rounded-xl text-[10px] tracking-widest uppercase shadow-lg shadow-teal-900/30">Commit Changes</button>
            </div>
        </div>
    );
};

export default ChatView;
