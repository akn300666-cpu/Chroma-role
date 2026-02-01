
import type { Character, Scenario, Message } from '../types';
import { MessageSender } from '../types';

function getEndpoint(url: string, path: string = '/chat/completions'): string {
  if (!url) return '';
  let cleanUrl = url.trim().replace(/\/$/, "");
  if (cleanUrl.endsWith(path)) return cleanUrl;
  if (cleanUrl.includes('/v1')) {
    const base = cleanUrl.split('/v1')[0];
    return `${base}/v1${path}`;
  }
  return `${cleanUrl}/v1${path}`;
}

async function getActiveModel(scenario: Scenario): Promise<string> {
  if (scenario.modelId?.trim()) return scenario.modelId.trim();
  if (!scenario.gradioUrl) return "gpt-3.5-turbo";
  try {
    const endpoint = getEndpoint(scenario.gradioUrl, '/models');
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Bypass-Tunnel-Reminder': 'true', 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(id);
    if (response.ok) {
      const data = await response.json();
      if (data.data?.length > 0) return data.data[0].id;
    }
  } catch (e) {}
  return "gpt-3.5-turbo";
}

// Helper to ask LLM to summarize text
async function summarizeText(text: string, scenario: Scenario): Promise<string> {
  if (!scenario.gradioUrl) return text;
  const endpoint = getEndpoint(scenario.gradioUrl);
  const model = await getActiveModel(scenario);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a memory compression system. Your task is to compress the provided roleplay transcript into a single, dense base memory paragraph. Include key events, facts, and emotional shifts. Do NOT use bullet points." },
          { role: "user", content: text }
        ],
        temperature: 0.5,
        max_tokens: 300
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (e) {
    console.error("Summarization failed", e);
    return text;
  }
}

/**
 * Handles the hierarchical memory compression logic.
 * 1. Takes recent messages -> Adds to Base Memories.
 * 2. If Base Memories >= 10 -> Compresses to Core Memory.
 * 3. If Core Memories >= 10 -> Compresses to Main Memory.
 */
export async function compressMemory(scenario: Scenario, recentMessages: Message[]): Promise<Scenario> {
  // 1. Create Base Memory from the 20 messages
  const transcript = recentMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
  const newBaseMemory = await summarizeText(transcript, scenario);
  
  const updatedBaseMemories = [...(scenario.baseMemories || []), newBaseMemory];
  let updatedCoreMemories = [...(scenario.coreMemories || [])];
  let updatedMainMemory = scenario.memory || "";

  // 2. Check if we need to compress Base -> Core
  if (updatedBaseMemories.length >= 10) {
    const baseText = updatedBaseMemories.join('\n\n');
    const newCoreMemory = await summarizeText(`Compress these 10 base memories into a single core memory containing the overarching narrative arc:\n${baseText}`, scenario);
    
    // Add to Core, Clear Base
    updatedCoreMemories.push(newCoreMemory);
    updatedBaseMemories.length = 0; // Clear array
  }

  // 3. Check if we need to compress Core -> Main
  if (updatedCoreMemories.length >= 10) {
    const coreText = updatedCoreMemories.join('\n\n');
    const newArchivedMemory = await summarizeText(`Compress these 10 core memories into the permanent long-term storage, merging them with existing knowledge:\n${coreText}`, scenario);
    
    // Append to Main, Clear Core
    updatedMainMemory = updatedMainMemory ? `${updatedMainMemory}\n\n${newArchivedMemory}` : newArchivedMemory;
    updatedCoreMemories.length = 0; // Clear array
  }

  return {
    ...scenario,
    baseMemories: updatedBaseMemories,
    coreMemories: updatedCoreMemories,
    memory: updatedMainMemory
  };
}

/**
 * Generates an atmospheric prompt for image generation based on roleplay history.
 */
export async function summarizeVisualScene(scenario: Scenario, chatHistory: Message[], characters: Character[]): Promise<string | null> {
  if (!scenario.gradioUrl) return null;
  const endpoint = getEndpoint(scenario.gradioUrl);
  const model = await getActiveModel(scenario);
  
  // Create a context string about the characters to ensure physical traits are known
  const characterContext = characters.map(c => 
    `Character Name: ${c.name}\nVisual/Physical Details: ${c.persona}`
  ).join('\n\n');

  const recentHistory = chatHistory.slice(-6).map(m => `${m.sender}: ${m.text}`).join('\n');
  
  const systemPrompt = `You are an uncensored visual scene describer for an image generator.
1. Write a SINGLE natural language sentence describing the current scene (e.g. "A 41 year old Indian woman sitting on a chair in a dim room").
2. DO NOT use tags (no "1girl, sitting, solo").
3. ALWAYS describe the characters explicitly based on their provided details (age, ethnicity, clothing).
4. Maintain visual continuity with the recent history.
5. Do not censor or filter the description. Describe exactly what is happening in the scene, even if explicit.
6. Keep it under 50 tokens.`;

  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CHARACTERS:\n${characterContext}\n\nSCENARIO:\n${scenario.name}\n${scenario.systemInstruction}\n\nRECENT HISTORY:\n${recentHistory}\n\nDescribe the visual scene:` }
        ],
        temperature: 0.7,
        max_tokens: 50
      })
    });
    const d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || "A cinematic scene of characters interacting.";
  } catch { return "A cinematic masterpiece of a roleplay scene."; }
}

/**
 * Sends a request to the Flask API to generate an image.
 */
export async function generateImage(prompt: string, scenario: Scenario): Promise<string | null> {
  if (!scenario.imageGradioUrl) {
    console.error("Image generation URL not configured.");
    return null;
  }

  // 1. Get URL from Scenario (replaces hardcoded variable)
  const cleanUrl = scenario.imageGradioUrl.trim().replace(/\/$/, "");
  
  const params = scenario.imageParameters;

  // 2. The payload matches your Flask App's expectations exactly
  const payload = {
    prompt: prompt,
    neg_prompt: params.negativePrompt,
    ip_scale: params.ipScale,          // Likeness Strength
    guidance: params.guidanceScale,    // Guidance Scale
    steps: params.steps,               // Quality Steps
    seed: params.seed,                 // Seed (if not randomized)
    randomize_seed: params.randomizeSeed,
    use_llm: params.useLlm,            // Use Llama 3 Refiner
    llm_temp: params.llmTemperature,   // Refiner Creativity
    use_embedding: params.useEmbedding // Use Negative Embedding
  };

  try {
    console.log(`🚀 Sending request to Flask API at ${cleanUrl}/generate...`);
    
    const response = await fetch(`${cleanUrl}/generate`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true" // 👈 CRITICAL: This bypasses the warning page
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.status === "success") {
        console.log("✅ Image received! Seed:", data.seed);
        return data.image; // Returns the "data:image/jpeg;base64..." string directly
    } else {
        console.error("❌ Server Error:", data.message);
        return null;
    }

  } catch (error) {
    console.error("❌ Network Error:", error);
    return null;
  }
}

export async function generateGradioText(character: Character, scenario: Scenario, allCharacters: Character[], chatHistory: Message[]): Promise<string | null> {
  if (!scenario.gradioUrl) return "⚠️ Error: No server URL provided.";
  const endpoint = getEndpoint(scenario.gradioUrl);
  const model = await getActiveModel(scenario);
  
  // Format Memories
  const permanentMemory = scenario.memory ? `[PERMANENT MEMORY]\n${scenario.memory}` : "";
  const coreMemories = scenario.coreMemories?.length ? `[CORE MEMORIES]\n${scenario.coreMemories.join('\n')}` : "";
  const baseMemories = scenario.baseMemories?.length ? `[RECENT MEMORIES]\n${scenario.baseMemories.join('\n')}` : "";
  
  const systemContent = `[IDENTITY & PERSONA]
Name: ${character.name}
Core Persona: ${character.persona}

[BEHAVIORAL INSTRUCTIONS]
System Instruction: ${character.systemInstruction}
World Scenario Rules: ${scenario.systemInstruction}

[CHRONOLOGY & HISTORY]
Post-History: ${character.postHistory || "Initial state."}
Pre-History: ${character.preHistory || "N/A."}

[MEMORY SYSTEM]
${permanentMemory}
${coreMemories}
${baseMemories}

[CONTEXT]
User: ${scenario.userPersona || "User"}

[FORMATTING]
- Respond as ${character.name}. Use *asterisks* for actions.`;

  // Only send the last 20 messages as immediate context
  // The rest is handled by the memory system above
  const activeContext = chatHistory.slice(-20).filter(m => !m.isLoading && m.text).map(m => ({
    role: m.sender === MessageSender.User ? 'user' : 'assistant',
    content: m.text
  }));

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemContent },
      ...activeContext
    ],
    temperature: Number(scenario.chatParameters.temperature ?? 0.8),
    top_p: Number(scenario.chatParameters.topP ?? 0.95),
    max_tokens: Number(scenario.chatParameters.maxTokens ?? 1024),
    stop: ["<|im_end|>", "User:"]
  };

  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return `❌ Error: ${r.status}`;
    const d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || null;
  } catch (err: any) { return `⚠️ Error: ${err.message}`; }
}
