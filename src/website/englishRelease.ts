export const englishReleased = import.meta.env.VITE_ENGLISH_RELEASED === 'true';
export const englishTesting = !englishReleased && import.meta.env.VITE_ENGLISH_TESTING === 'true';
export const englishPlayable = englishReleased || englishTesting;
