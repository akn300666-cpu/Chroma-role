
export interface Character {
  id: string;
  name: string;
  avatar: string;
  persona: string;
  systemInstruction: string;
  preHistory: string;
  postHistory: string;
}

export interface ChatParameters {
  temperature: number;
  topK: number;
  topP: number;
  maxTokens: number;
  contextSize: number;
  repetitionPenalty: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  characterIds: string[];
  chatParameters: ChatParameters;
  systemInstruction: string;
  language: 'English' | 'Manglish';
  memory?: string; // This is the Tier 2 Macro-Memory
  intermediateMemories?: string[]; // This stores the Tier 1 Micro-Summaries (max 10)
  backgroundImageUrl?: string;
  userPersona?: string;
  gradioUrl?: string; // Used for local text model connection
}

export enum MessageSender {
  User = 'USER',
  Character = 'CHARACTER',
}

export interface Message {
  id: string;
  sender: MessageSender;
  characterId?: string;
  text?: string;
  timestamp: string;
  isLoading?: boolean;
}

export enum View {
  Chat = 'CHAT',
  Characters = 'CHARACTERS',
  Scenarios = 'SCENARIOS',
}
