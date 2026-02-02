
import React, { useState, useCallback, useEffect } from 'react';
import type { Character, Scenario, Message } from './types';
import { View } from './types';
import BottomNav from './components/BottomNav';
import CharacterManager from './components/CharacterManager';
import ScenarioManager from './components/ScenarioManager';
import ChatView from './components/ChatView';
import ChatList from './components/ChatList';
import { PRESET_CHARACTERS, PRESET_SCENARIOS } from './constants';
import { generateUUID } from './utils';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.Scenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // --- Persistence Initialization ---
  
  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem('chroma_characters');
      return saved ? JSON.parse(saved) : PRESET_CHARACTERS;
    } catch (e) {
      console.error("Failed to load characters", e);
      return PRESET_CHARACTERS;
    }
  });

  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    try {
      const saved = localStorage.getItem('chroma_scenarios');
      return saved ? JSON.parse(saved) : PRESET_SCENARIOS;
    } catch (e) {
      console.error("Failed to load scenarios", e);
      return PRESET_SCENARIOS;
    }
  });

  const [messages, setMessages] = useState<Map<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('chroma_messages');
      if (saved) {
        return new Map(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    }
    return new Map();
  });

  // --- Persistence Effects ---

  useEffect(() => {
    localStorage.setItem('chroma_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('chroma_scenarios', JSON.stringify(scenarios));
  }, [scenarios]);

  useEffect(() => {
    try {
      // Convert Map to Array of entries for JSON storage
      const serialized = JSON.stringify(Array.from(messages.entries()));
      localStorage.setItem('chroma_messages', serialized);
    } catch (e) {
      console.error("Failed to save messages (Storage Quota might be full)", e);
    }
  }, [messages]);


  const handleSelectScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    setView(View.Chat);
  };

  const handleStartDirectChat = (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    if (!character) return;

    const existingScenario = scenarios.find(s => 
        s.characterIds.length === 1 && 
        s.characterIds[0] === characterId && 
        s.name === character.name
    );

    if (existingScenario) {
        handleSelectScenario(existingScenario.id);
    } else {
        const newScenario: Scenario = {
            id: `direct_${generateUUID()}`,
            name: character.name,
            description: `Direct chat with ${character.name}`,
            characterIds: [characterId],
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
            gradioUrl: '',
            systemInstruction: `You are ${character.name}. Engage in a direct conversation with the user.`,
            language: 'English'
        };
        setScenarios([...scenarios, newScenario]);
        handleSelectScenario(newScenario.id);
    }
  };
  
  const addMessage = useCallback((scenarioId: string, message: Message) => {
    setMessages((prev: Map<string, Message[]>) => {
        const newMessages = new Map(prev);
        const scenarioMessages = newMessages.get(scenarioId) || [];
        newMessages.set(scenarioId, [...scenarioMessages, message]);
        return newMessages;
    });
  }, []);

  const updateMessage = useCallback((scenarioId: string, messageId: string, updates: Partial<Message>) => {
    setMessages((prev: Map<string, Message[]>) => {
      const newMessages = new Map(prev);
      const scenarioMessages = newMessages.get(scenarioId) || [];
      newMessages.set(scenarioId, scenarioMessages.map(m => m.id === messageId ? { ...m, ...updates } : m));
      return newMessages;
    });
  }, []);

  const removeMessage = useCallback((scenarioId: string, messageId: string) => {
    setMessages((prev: Map<string, Message[]>) => {
      const newMessages = new Map(prev);
      const scenarioMessages = newMessages.get(scenarioId) || [];
      newMessages.set(scenarioId, scenarioMessages.filter(m => m.id !== messageId));
      return newMessages;
    });
  }, []);

  const updateScenario = (updatedScenario: Scenario) => {
    setScenarios(prevScenarios => 
        prevScenarios.map(s => s.id === updatedScenario.id ? updatedScenario : s)
    );
  };

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) ?? null;
  const activeCharacters = characters.filter(c => activeScenario?.characterIds?.includes(c.id));

  const renderView = () => {
    switch (view) {
      case View.Characters:
        return <CharacterManager characters={characters} setCharacters={setCharacters} onStartChat={handleStartDirectChat} />;
      case View.Scenarios:
        return <ScenarioManager scenarios={scenarios} setScenarios={setScenarios} characters={characters} onSelectScenario={handleSelectScenario} />;
      case View.Chat:
      default:
        return activeScenario ? (
          <ChatView
            key={activeScenario.id}
            scenario={activeScenario}
            updateScenario={updateScenario}
            characters={activeCharacters}
            allCharacters={characters}
            messages={messages.get(activeScenario.id) || []}
            addMessage={(message) => addMessage(activeScenario.id, message)}
            updateMessage={(id, updates) => updateMessage(activeScenario.id, id, updates)}
            removeMessage={(messageId) => removeMessage(activeScenario.id, messageId)}
            onBack={() => setActiveScenarioId(null)}
          />
        ) : (
          <ChatList 
            scenarios={scenarios} 
            characters={characters} 
            onSelectScenario={handleSelectScenario} 
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-gray-100 font-sans overflow-hidden">
      <main className="flex-1 overflow-hidden relative">
        {renderView()}
      </main>
      <div className="shrink-0 border-t border-white/5 pb-[env(safe-area-inset-bottom)] bg-gray-950">
        <BottomNav view={view} setView={setView} />
      </div>
    </div>
  );
};

export default App;
