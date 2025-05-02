// utils/chatbot.js
import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyCDQ65gzIjpnS-QN2SGlCBJEjtwHrw0094';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

/**
 * Send a user message to Gemini and get a reply.
 * @param {string} userMessage - The message from the user.
 * @param {string} languageCode - Language code like 'en', 'hi', 'ta', etc.
 * @returns {Promise<string>} - The assistant's reply.
 */
export const getChatbotReply = async (userMessage, languageCode = 'en') => {
  try {
    // Map language codes to full language names to ensure proper script usage
    const languageNames = {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'zh': 'Chinese (Simplified)',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'ru': 'Russian',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
    };

    const languageName = languageNames[languageCode] || 'English';

    // More explicit prompt to ensure proper script usage
    const prompt = `
You are a helpful multilingual travel assistant. 
IMPORTANT: You must respond in ${languageName} language, using the proper ${languageName} script and characters (not transliteration).
For example, if responding in Tamil, use தமிழ் script, not English/Latin transliteration.
If responding in Hindi, use हिंदी script, not English/Latin transliteration.

User message: "${userMessage}"
`;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini API Error (Chatbot):', error.response?.data || error.message);
    return 'Sorry, I could not process your message. Please try again.';
  }
};