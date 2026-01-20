
import React, { useState, useCallback } from 'react';
import type { Character, Scenario, Message } from './types';
import { View } from './types';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import CharacterManager from './components/CharacterManager';
import ScenarioManager from './components/ScenarioManager';
import ChatView from './components/ChatView';
import ChatList from './components/ChatList';
import { PRESET_CHARACTERS, PRESET_SCENARIOS } from './constants';
import { generateUUID } from './utils';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.Scenarios);

  const [characters, setCharacters] = useState<Character[]>(PRESET_CHARACTERS);
  const [scenarios, setScenarios] = useState<Scenario[]>(PRESET_SCENARIOS);
  
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());

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
    <div className="flex h-screen bg-black text-gray-100 font-sans">
      <div className="hidden md:flex">
        <Sidebar view={view} setView={setView} />
      </div>
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
        <div className="md:hidden">
            <BottomNav view={view} setView={setView} />
        </div>
      </div>
    </div>
  );
};

export default App;
