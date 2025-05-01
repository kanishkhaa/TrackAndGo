import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyCDQ65gzIjpnS-QN2SGlCBJEjtwHrw0094';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

export const generateTravelTips = async (fromLocation, toLocation, journeyDetails = {}) => {
  try {
    const prompt = `
      You are a travel assistant. Generate 3-5 concise, practical travel tips for a bus journey from ${fromLocation} to ${toLocation}. 
      Consider the following journey details: ${JSON.stringify(journeyDetails)}.
      The tips should be relevant to the route, bus travel, and general travel advice. 
      Format the response as a JSON array of strings, e.g., ["Tip 1", "Tip 2", "Tip 3"].
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

    const generatedText = response.data.candidates[0].content.parts[0].text;
    const cleanedText = generatedText.replace(/```json\n|\n```/g, '');
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Gemini API Error (Travel Tips):', error.response?.data || error.message);
    return [
      'Book tickets in advance during peak hours.',
      'Keep small change ready for bus fare.',
      'Arrive at the bus stop 10 minutes early.',
    ];
  }
};

export const generateAlternateRoutes = async (fromLocation, toLocation, primaryRoute) => {
  try {
    const prompt = `
      You are a travel assistant specializing in route optimization. The user is planning a bus journey from ${fromLocation} to ${toLocation}. 
      The primary route has the following details: ${JSON.stringify(primaryRoute)}.
      Suggest up to 2 alternate routes that reduce travel time compared to the primary route's ${primaryRoute.totalDuration}. 
      Each alternate route should include:
      - Starting point and destination
      - List of intermediate stops (if any)
      - Estimated travel time (in hours and minutes, e.g., "4h 15m")
      - A brief reason why this route is faster (e.g., "Fewer stops" or "Direct express bus")
      - Transport mode (e.g., "Bus", "Train", or "Combination")
      Return the response as a JSON array of objects, e.g.:
      [
        {
          "from": "Chennai",
          "to": "Bangalore",
          "stops": ["Krishnagiri"],
          "travelTime": "4h 15m",
          "reason": "Direct express bus with fewer stops",
          "mode": "Bus"
        }
      ]
      If no faster routes are possible, return an empty array.
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

    const generatedText = response.data.candidates[0].content.parts[0].text;
    const cleanedText = generatedText.replace(/```json\n|\n```/g, '');
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Gemini API Error (Alternate Routes):', error.response?.data || error.message);
    return [];
  }
};