import { GoogleGenAI } from "@google/genai";

export const generateSlimeSpriteSheet = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `A 2D game sprite sheet for a fantasy creature character, a Cursed Cute Slime Adventurer. 
  The sprite sheet features 15 distinct poses arranged in a clean 3 rows by 5 columns grid layout. 
  The character is a rounded, glossy green slime with large expressive eyes, a mischievous grin, and small orange horns. 
  Style: Polished mobile game art style, bright saturated colors, thick clean outlines, chunky shapes, soft shading, and bold highlights. 
  Visual inspiration: Royal Match, Clash Royale, Slime Rancher. 
  Poses (in 3x5 grid order): 
  Row 1: 1. Idle, 2. Idle blink, 3. Walk step 1, 4. Walk step 2, 5. Jump. 
  Row 2: 6. Attack, 7. Hit reaction, 8. Victory celebration, 9. Sad/defeat, 10. Special ability. 
  Row 3: 11. Sitting, 12. Waving, 13. Casting a spell, 14. Sleeping, 15. Thinking.
  Technical requirements: Game-ready asset, transparent alpha background, no scene background, equal spacing between frames, same character scale in every frame, dynamic and exaggerated poses. 
  The character should feel 'cursed cute'—adorable but slightly chaotic and mischievous.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating sprite sheet:", error);
    return null;
  }
};
