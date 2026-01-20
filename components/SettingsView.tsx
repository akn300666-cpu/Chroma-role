
import React from 'react';
import type { ChatParameters } from '../types';

interface SettingsViewProps {
  chatParameters: ChatParameters;
  setChatParameters: React.Dispatch<React.SetStateAction<ChatParameters>>;
  gradioUrl: string;
  setGradioUrl: (url: string) => void;
  globalSystemInstruction: string;
  setGlobalSystemInstruction: (instruction: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  chatParameters,
  setChatParameters,
  gradioUrl,
  setGradioUrl,
  globalSystemInstruction,
  setGlobalSystemInstruction
}) => {

  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setChatParameters(prev => ({...prev, [name]: parseFloat(value) }));
  };
  
  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGlobalSystemInstruction(e.target.value);
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-900 text-white">
      <h2 className="text-3xl font-bold mb-8">Settings</h2>
      
      <div className="space-y-8 max-w-2xl">
        <section className="p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Chat Parameters</h3>
          <div className="space-y-4">
            <Slider
              label="Temperature"
              name="temperature"
              value={chatParameters.temperature}
              min={0}
              max={1}
              step={0.05}
              onChange={handleParamChange}
            />
            <Slider
              label="Top-P"
              name="topP"
              value={chatParameters.topP}
              min={0}
              max={1}
              step={0.05}
              onChange={handleParamChange}
            />
            <Slider
              label="Top-K"
              name="topK"
              value={chatParameters.topK}
              min={1}
              max={100}
              step={1}
              onChange={handleParamChange}
            />
          </div>
        </section>

        <section className="p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Global System Instruction</h3>
          <textarea
            value={globalSystemInstruction}
            onChange={handleInstructionChange}
            rows={4}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="e.g., You are a helpful assistant..."
          />
        </section>

        <section className="p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Gradio Image Generation</h3>
          <p className="text-sm text-gray-400 mb-2">Enter the full API endpoint URL for your Gradio image generation space (e.g., `https://username-space.hf.space/api/predict`).</p>
          <input
            type="url"
            value={gradioUrl}
            onChange={(e) => setGradioUrl(e.target.value)}
            placeholder="Gradio Endpoint URL"
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </section>
      </div>
    </div>
  );
};

interface SliderProps {
    label: string;
    name: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Slider: React.FC<SliderProps> = ({ label, name, value, min, max, step, onChange }) => (
    <div>
        <label htmlFor={name} className="flex justify-between items-center text-sm font-medium text-gray-300 mb-1">
            <span>{label}</span>
            <span className="font-bold text-teal-400">{value}</span>
        </label>
        <input
            type="range"
            id={name}
            name={name}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
        />
    </div>
);


export default SettingsView;