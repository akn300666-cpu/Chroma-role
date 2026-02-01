
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

export interface ImageParameters {
  negativePrompt: string;
  ipScale: number;
  guidanceScale: number;
  steps: number;
  seed: number;
  randomizeSeed: boolean;
  useLlm: boolean;
  llmTemperature: number;
  useEmbedding: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  characterIds: string[];
  chatParameters: ChatParameters;
  imageParameters: ImageParameters;
  systemInstruction: string;
  language: 'English' | 'Manglish';
  memory?: string; // The "Deep/Permanent" Memory
  baseMemories?: string[]; // Layer 1: Summaries of 20 messages
  coreMemories?: string[]; // Layer 2: Summaries of 10 base memories
  intermediateMemories?: string[]; // Deprecated, keeping for type safety if needed, but using base/core now
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
  backgroundBlur?: number;
  userPersona?: string;
  gradioUrl?: string; // Chat LLM Endpoint
  imageGradioUrl?: string; // Image Generation Endpoint
  modelId?: string;
  tunnelPassword?: string;
}

export enum MessageSender {
  User = 'USER',
  Character = 'CHARACTER',
  System = 'SYSTEM',
}

export interface Message {
  id: string;
  sender: MessageSender;
  characterId?: string;
  text?: string;
  imageUrl?: string;
  timestamp: string;
  isLoading?: boolean;
  isImageLoading?: boolean;
}

export enum View {
  Chat = 'CHAT',
  Characters = 'CHARACTERS',
  Scenarios = 'SCENARIOS',
}
