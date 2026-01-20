
import React from 'react';
import type { Scenario, Character } from '../types';
import { ChatIcon } from './icons';

interface ChatListProps {
  scenarios: Scenario[];
  characters: Character[];
  onSelectScenario: (scenarioId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ scenarios, characters, onSelectScenario }) => {
  const getCharacterAvatars = (characterIds: string[]) => {
    return characterIds.map(id => {
      const char = characters.find(c => c.id === id);
      return char ? char.avatar : null;
    }).filter(Boolean) as string[];
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-gray-950">
      <h2 className="text-3xl font-bold text-white mb-6">Your Chats</h2>
      
      {scenarios.length === 0 ? (
         <div className="text-center text-gray-500 mt-20">
             <p className="text-xl">No active chats.</p>
             <p className="mt-2">Start a chat from the Characters tab or create a new Scenario.</p>
         </div>
      ) : (
          <div className="space-y-3">
            {scenarios.map(scen => {
              const avatars = getCharacterAvatars(scen.characterIds);
              return (
                <div 
                  key={scen.id} 
                  onClick={() => onSelectScenario(scen.id)}
                  className="bg-gray-900 hover:bg-gray-800 rounded-lg p-4 cursor-pointer transition flex items-center space-x-4 border border-gray-800 hover:border-teal-600"
                >
                  <div className="flex -space-x-3 overflow-hidden">
                    {avatars.length > 0 ? avatars.slice(0, 3).map((src, i) => {
                       const isVideo = src.endsWith('.mp4') || src.endsWith('.webm');
                       if (isVideo) {
                           return (
                               <video 
                                   key={i} 
                                   className="inline-block h-12 w-12 rounded-full ring-2 ring-gray-900 object-cover bg-black"
                                   src={src}
                                   autoPlay
                                   loop
                                   muted
                                   playsInline
                               />
                           );
                       }
                       return (
                          <img key={i} className="inline-block h-12 w-12 rounded-full ring-2 ring-gray-900 object-cover" src={src} alt="Avatar" />
                       );
                    }) : (
                        <div className="h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
                             <ChatIcon className="w-6 h-6"/>
                        </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{scen.name}</h3>
                    <p className="text-gray-400 text-sm truncate">{scen.description || 'No description'}</p>
                  </div>
                </div>
              );
            })}
          </div>
      )}
    </div>
  );
};

export default ChatList;
