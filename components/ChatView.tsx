
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Scenario, Character, Message } from '../types';
import { MessageSender } from '../types';
import { generateUUID } from '../utils';
import { generateGradioText, generateImage, summarizeVisualScene, compressMemory } from '../services/gradioService';
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

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
    </svg>
);

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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCounter = useRef<number>(0);
  // Initial threshold between 3 and 5 messages
  const nextImageTrigger = useRef<number>(Math.floor(Math.random() * 3) + 3); 
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageGeneration = async (isManual: boolean = false) => {
    if (!scenario.imageGradioUrl || isGeneratingImage) return;
    
    setIsGeneratingImage(true);
    const imageLoadingId = generateUUID();
    addMessage({
        id: imageLoadingId,
        sender: MessageSender.System,
        timestamp: new Date().toISOString(),
        isImageLoading: true
    });

    try {
        // Pass characters to include persona details in the visual prompt
        const visualPrompt = await summarizeVisualScene(scenario, messagesRef.current, characters);
        if (visualPrompt) {
            const imageUrl = await generateImage(visualPrompt, scenario);
            removeMessage(imageLoadingId);
            if (imageUrl) {
                addMessage({
                    id: generateUUID(),
                    sender: MessageSender.System,
                    imageUrl,
                    timestamp: new Date().toISOString()
                });
            }
        }
    } catch (err) {
        console.error("Image gen error:", err);
        removeMessage(imageLoadingId);
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const processAiResponse = useCallback(async (character: Character, currentMessages: Message[]) => {
    if (!scenario.gradioUrl) return;
    setIsAiTurn(true);
    const loadingMessageId = generateUUID();
    addMessage({ id: loadingMessageId, sender: MessageSender.Character, characterId: character.id, timestamp: new Date().toISOString(), isLoading: true });
    
    try {
        const responseText = await generateGradioText(character, scenario, characters, currentMessages);
        removeMessage(loadingMessageId);
        
        if (responseText) {
          addMessage({ 
            id: generateUUID(), 
            sender: MessageSender.Character, 
            characterId: character.id, 
            text: responseText.trim(), 
            timestamp: new Date().toISOString() 
          });
          
          messageCounter.current += 1;
          
          // Trigger image gen if we hit the random threshold (3-5 messages)
          if (messageCounter.current >= nextImageTrigger.current) {
              handleImageGeneration();
              messageCounter.current = 0;
              // Reset threshold to a new random value between 3 and 5
              nextImageTrigger.current = Math.floor(Math.random() * 3) + 3;
          }

          // Memory Compression Logic: Check if we hit a multiple of 20 messages
          // We calculate based on the length *after* the new message is added.
          const totalMessages = currentMessages.length + 1;
          if (totalMessages > 0 && totalMessages % 20 === 0) {
             console.log("Creating memory compression...");
             // Pass the last 20 messages to the compression service
             const segment = [...currentMessages, { 
                id: 'temp', 
                sender: MessageSender.Character, 
                characterId: character.id, 
                text: responseText.trim(), 
                timestamp: new Date().toISOString() 
             }].slice(-20);
             
             compressMemory(scenario, segment).then(updatedScenario => {
                 console.log("Memory compressed and scenario updated.");
                 updateScenario(updatedScenario);
             });
          }
        }
    } catch (err: any) {
        removeMessage(loadingMessageId);
        addMessage({ id: generateUUID(), sender: MessageSender.Character, characterId: character.id, text: `❌ AI Turn Error. Check connection.`, timestamp: new Date().toISOString() });
    } finally {
        setIsAiTurn(false);
        if (characters.length > 1) setTurnIndex(prev => (prev + 1) % characters.length);
    }
  }, [addMessage, characters, scenario, removeMessage, updateScenario]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isAiTurn) return;
    
    const userMsgText = userInput.trim();
    const userMessage: Message = { 
      id: generateUUID(), 
      sender: MessageSender.User, 
      text: userMsgText, 
      timestamp: new Date().toISOString() 
    };
    
    const updatedMessages = [...messagesRef.current, userMessage];
    addMessage(userMessage);
    setUserInput('');
    
    if (characters.length > 0) {
      const speaker = characters[turnIndex] || characters[0];
      processAiResponse(speaker, updatedMessages);
    }
  };

  const getCharacter = (id: string) => characters.find(c => c.id === id);
  const bgOpacity = scenario.backgroundOpacity !== undefined ? scenario.backgroundOpacity / 100 : 0.15;
  const bgBlur = scenario.backgroundBlur !== undefined ? scenario.backgroundBlur : 10;

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
      {scenario.backgroundImageUrl && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
             <img src={scenario.backgroundImageUrl} alt="BG" className="w-full h-full object-cover" style={{ opacity: bgOpacity, filter: `blur(${bgBlur}px)`, transform: 'scale(1.1)' }} />
             <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
          </div>
      )}

      <header className="relative z-20 flex justify-between items-center px-4 h-16 bg-black/70 backdrop-blur-2xl border-b border-white/5 shadow-2xl shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 overflow-hidden">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition p-2 rounded-full shrink-0 active:scale-90"><ArrowLeftIcon className="w-5 h-5" /></button>
            <div className="flex flex-col min-w-0">
                <h2 className="text-xs font-black text-white uppercase tracking-widest truncate">{scenario.name}</h2>
                <span className="text-[7px] text-zinc-500 font-black uppercase tracking-tighter">Engine v2.0-flask</span>
            </div>
        </div>

        <div className="flex items-center -space-x-3 shrink-0 ml-2">
            {characters.slice(0, 3).map((char, i) => (
                <div key={char.id} className="relative" style={{zIndex: 10 - i}}>
                    <img src={char.avatar} alt={char.name} className="w-8 h-8 rounded-full object-cover border-2 border-black shadow-lg" />
                </div>
            ))}
        </div>
        
        <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition p-2 rounded-full shrink-0 ml-1 active:scale-90"><SettingsIcon className="w-6 h-6" /></button>
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
          <button 
            type="button" 
            onClick={() => handleImageGeneration(true)}
            disabled={isGeneratingImage || !scenario.imageGradioUrl}
            className={`p-3 rounded-full transition-all active:scale-90 shrink-0 shadow-lg ${isGeneratingImage ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-900 text-teal-500 hover:bg-zinc-800 border border-white/5'}`}
            title="Force Visual Manifestation"
          >
            <SparkleIcon className={`w-5 h-5 ${isGeneratingImage ? 'animate-spin' : ''}`} />
          </button>
          
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={scenario.gradioUrl ? "Message..." : "Configure link in settings"}
            disabled={isAiTurn}
            className="flex-1 bg-white/[0.08] border border-white/10 text-white rounded-full px-5 py-3.5 focus:border-teal-500/50 outline-none transition disabled:opacity-50 text-[14px] min-w-0 shadow-inner"
          />
          <button type="submit" disabled={!userInput.trim() || isAiTurn} className="bg-teal-600 text-white rounded-full p-3.5 hover:bg-teal-500 transition-all active:scale-90 shadow-xl shadow-teal-900/40 shrink-0">
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={`System Tuning`}>
          <ScenarioSettingsEditor scenario={scenario} updateScenario={updateScenario} onClose={() => setIsSettingsOpen(false)} />
      </Modal>
    </div>
  );
};

const ChatMessage: React.FC<{ message: Message, getCharacter: (id: string) => Character | undefined }> = ({ message, getCharacter }) => {
    const isUser = message.sender === MessageSender.User;
    const isSystem = message.sender === MessageSender.System;
    const character = !isUser && !isSystem && message.characterId ? getCharacter(message.characterId) : null;
    
    if (isSystem && (message.imageUrl || message.isImageLoading)) {
        return (
            <div className="flex flex-col items-center my-8 animate-in fade-in zoom-in duration-500">
                <div className="relative w-full max-w-sm rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900/40 backdrop-blur-sm aspect-square flex items-center justify-center">
                    {message.isImageLoading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Synthesizing Vision</span>
                        </div>
                    ) : (
                        <img src={message.imageUrl} alt="Generated Scene" className="w-full h-full object-cover" />
                    )}
                </div>
                <div className="mt-4 px-6 py-2 bg-white/5 rounded-full border border-white/5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Visual Feed Synced</span>
                </div>
            </div>
        );
    }

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
        setFormData({ ...formData, chatParameters: { ...formData.chatParameters, [name]: parseFloat(value) } });
    };

    const handleImageParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'range' || type === 'number' ? parseFloat(value) : value);
        setFormData({ 
            ...formData, 
            imageParameters: { ...formData.imageParameters, [name]: val } 
        });
    };

    return (
        <div className="space-y-6 pb-32">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-white/10 shadow-inner space-y-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500">Neural Gateways</h3>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Chat LLM URL</label>
                    <input name="gradioUrl" value={formData.gradioUrl || ''} onChange={handleChange} placeholder="https://xxx-chat.loca.lt" className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-teal-500 transition mb-4" />
                    
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Image Gen URL (Flask)</label>
                    <input name="imageGradioUrl" value={formData.imageGradioUrl || ''} onChange={handleChange} placeholder="https://xxx.loca.lt" className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-teal-500 transition" />
                </div>
            </div>

            <div className="p-4 bg-zinc-900 rounded-2xl border border-white/10 shadow-inner space-y-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500">Environment & Memory</h3>
                <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Permanent Memory</label>
                    <textarea 
                        name="memory" 
                        value={formData.memory || ''} 
                        onChange={handleChange} 
                        rows={3}
                        placeholder="Core memories..."
                        className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-xl px-4 py-3 outline-none focus:border-teal-500 transition custom-scrollbar"
                    />

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
                    <input name="backgroundImageUrl" value={formData.backgroundImageUrl || ''} onChange={handleChange} placeholder="Background Image URL" className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-xl px-4 py-3 outline-none focus:border-teal-500 transition" />
                     <div className="grid grid-cols-2 gap-4">
                        <Slider label="Opacity" name="backgroundOpacity" value={formData.backgroundOpacity ?? 15} min={0} max={100} step={5} onChange={(e) => setFormData({...formData, backgroundOpacity: parseInt(e.target.value)})} />
                        <Slider label="Blur" name="backgroundBlur" value={formData.backgroundBlur ?? 10} min={0} max={50} step={1} onChange={(e) => setFormData({...formData, backgroundBlur: parseInt(e.target.value)})} />
                    </div>
                </div>
            </div>

            <div className="p-5 bg-zinc-900 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-8">Neural Tuning (Text)</h3>
                <div className="space-y-8">
                    <Slider label="Temperature" name="temperature" value={formData.chatParameters.temperature} min={0} max={2} step={0.05} onChange={handleParamChange} />
                    <Slider label="Max Output Tokens" name="maxTokens" value={formData.chatParameters.maxTokens} min={128} max={8192} step={128} onChange={handleParamChange} />
                </div>
            </div>

            <div className="p-5 bg-zinc-900 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-8">Visual Synthesis (Image Gen)</h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Negative Prompt</label>
                        <textarea 
                            name="negativePrompt" 
                            value={formData.imageParameters.negativePrompt} 
                            onChange={handleImageParamChange} 
                            rows={3}
                            className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-xl px-4 py-3 outline-none focus:border-teal-500 transition custom-scrollbar"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Slider label="Steps" name="steps" value={formData.imageParameters.steps} min={10} max={60} step={1} onChange={handleImageParamChange} />
                        <Slider label="Guidance" name="guidanceScale" value={formData.imageParameters.guidanceScale} min={1} max={15} step={0.1} onChange={handleImageParamChange} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Slider label="IP Scale" name="ipScale" value={formData.imageParameters.ipScale} min={0} max={1} step={0.05} onChange={handleImageParamChange} />
                        <Slider label="LLM Temp" name="llmTemperature" value={formData.imageParameters.llmTemperature} min={0} max={1.5} step={0.05} onChange={handleImageParamChange} />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <Toggle label="Randomize Seed" name="randomizeSeed" checked={formData.imageParameters.randomizeSeed} onChange={handleImageParamChange} />
                        <Toggle label="Use LLM Enhancer" name="useLlm" checked={formData.imageParameters.useLlm} onChange={handleImageParamChange} />
                        <Toggle label="Use Embedding" name="useEmbedding" checked={formData.imageParameters.useEmbedding} onChange={handleImageParamChange} />
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur-3xl border-t border-white/5 flex gap-3 z-50">
                <button onClick={onClose} className="flex-1 bg-white/5 text-zinc-400 font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase">Discard</button>
                <button onClick={() => { updateScenario(formData); onClose(); }} className="flex-1 bg-teal-600 text-white font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase shadow-xl shadow-teal-900/30">Commit Changes</button>
            </div>
        </div>
    );
};

const Slider: React.FC<{label: string, name: string, value: number, min: number, max: number, step: number, unit?: string, onChange: (e: any) => void;}> = ({ label, name, value, min, max, step, unit = "", onChange }) => (
    <div className="space-y-3">
        <label htmlFor={name} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <span>{label}</span>
            <span className="font-bold text-teal-500">{value}{unit}</span>
        </label>
        <input type="range" id={name} name={name} min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-teal-500" />
    </div>
);

const Toggle: React.FC<{label: string, name: string, checked: boolean, onChange: (e: any) => void}> = ({ label, name, checked, onChange }) => (
    <label className="flex justify-between items-center cursor-pointer group">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">{label}</span>
        <div className="relative">
            <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only peer" />
            <div className="w-10 h-5 bg-zinc-800 rounded-full peer peer-checked:bg-teal-600/30 transition-all"></div>
            <div className="absolute top-1 left-1 w-3 h-3 bg-zinc-600 rounded-full transition-all peer-checked:translate-x-5 peer-checked:bg-teal-500"></div>
        </div>
    </label>
);

export default ChatView;
