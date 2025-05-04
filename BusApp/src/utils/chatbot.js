import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyCDQ65gzIjpnS-QN2SGlCBJEjtwHrw0094';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
const BACKEND_URL = 'http://192.168.11.179:3000';

// Static Tamil Nadu route data (Coimbatore)
const TAMIL_NADU_ROUTES = [
  {
    city: 'Coimbatore',
    from: 'Gandhi Market',
    to: 'Gandhipuram Bus Stand',
    primary: {
      mode: 'TNSTC Bus',
      busNumber: '94',
      route: ['Gandhi Market', 'Sukrawarpet', 'Oppanakara Street', 'Town Hall', 'Railway Station', 'Collector Office', 'Gandhipuram Bus Stand'],
      travelTime: '25–30 min',
      frequency: 'Every 3 hours starting from 6:42 AM',
    },
    alternate: [
      {
        mode: 'TNSTC Bus',
        busNumbers: ['12', '12A', '12D', '33A', '33B'],
        route: ['Gandhi Market', 'Ukkadam', 'Town Hall', 'Railway Station', 'Gandhipuram'],
        travelTime: '30–35 min',
        frequency: 'Every 10–15 minutes during peak hours',
      },
    ],
    travelTip: 'During peak hours (5:30–6:30 PM), expect increased traffic on Town Hall Road.',
  },
  
];

/**
 * Parse travel time string (e.g., "02:00 hrs" or "30 min") to minutes for comparison.
 * @param {string} timeStr - Travel time string.
 * @returns {number} - Time in minutes.
 */
const parseTravelTimeToMinutes = (timeStr) => {
  if (!timeStr || timeStr === 'Unknown') return Infinity;
  const match = timeStr.match(/(\d+):(\d+)\s*hrs|(\d+)(?:–(\d+))?\s*min/);
  if (!match) return Infinity;
  if (match[3]) return parseInt(match[3], 10); // Handle single or range (take lower bound)
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
};

/**
 * Send a user message to Gemini and get a reply.
 * @param {string} userMessage - The message from the user.
 * @param {string} languageCode - Language code like 'en', 'hi', 'ta', 'kn', etc.
 * @returns {Promise<string>} - The assistant's reply.
 */
export const getChatbotReply = async (userMessage, languageCode = 'en') => {
  try {
    const languageNames = {
      en: 'English',
      hi: 'Hindi',
      ta: 'Tamil',
      te: 'Telugu',
      kn: 'Kannada',
      ml: 'Malayalam',
      zh: 'Chinese (Simplified)',
      ja: 'Japanese',
      ko: 'Korean',
      ar: 'Arabic',
      ru: 'Russian',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
    };

    const languageName = languageNames[languageCode] || 'English';

    // Check if the query is about routes
    const isRouteQuery = /route|travel|bus|from|to|stops|time/i.test(userMessage);
    if (isRouteQuery) {
      // Extract 'from' and 'to' locations
      const match = userMessage.match(/from\s+([^\s]+(?:\s+[^\s]+)*)\s+to\s+([^\s]+(?:\s+[^\s]+)*)/i);
      const fromLocation = match ? match[1].trim() : '';
      const toLocation = match ? match[2].trim() : '';

      if (!fromLocation || !toLocation) {
        return languageCode === 'ta'
          ? 'தயவுசெய்து உங்கள் கேள்வியை "from [தொடக்கம்] to [முடிவு]" என்ற வடிவத்தில் தெளிவாகக் குறிப்பிடவும்.'
          : 'Please provide your query in the format "from [origin] to [destination]".';
      }

      // Check static Tamil Nadu routes (intra-city)
      const matchedRoute = TAMIL_NADU_ROUTES.find(
        (route) =>
          route.from.toLowerCase() === fromLocation.toLowerCase() &&
          route.to.toLowerCase() === toLocation.toLowerCase()
      );

      if (matchedRoute) {
        // Format response for intra-city route
        let responseText;
        if (languageCode === 'ta') {
          responseText = `${fromLocation} முதல் ${toLocation} வரை சிறந்த பயண வழி (${matchedRoute.city}):\n\n`;
          responseText += `**முதன்மை வழி**:\n`;
          responseText += `- **பேருந்து எண்**: ${matchedRoute.primary.busNumber}\n`;
          responseText += `- **வழி**: ${matchedRoute.primary.route.join(' → ')}\n`;
          responseText += `- **பயண நேரம்**: ${matchedRoute.primary.travelTime}\n`;
          responseText += `- **அலைவரிசை**: ${matchedRoute.primary.frequency}\n`;
          responseText += `**மாற்று வழிகள்**:\n`;
          matchedRoute.alternate.forEach((alt, index) => {
            responseText += `- **பேருந்து எண்கள்**: ${alt.busNumbers.join(', ')}\n`;
            responseText += `  - **வழி**: ${alt.route.join(' → ')}\n`;
            responseText += `  - **பயண நேரம்**: ${alt.travelTime}\n`;
            responseText += `  - **அலைவரிசை**: ${alt.frequency}\n`;
          });
          responseText += `\n**பயண குறிப்பு**: ${matchedRoute.travelTip}\n`;
          responseText += `\nஇந்த வழி குறைந்த பயண நேரத்தின் அடிப்படையில் தேர்ந்தெடுக்கப்பட்டது.`;
        } else {
          responseText = `Best route from ${fromLocation} to ${toLocation} (${matchedRoute.city}):\n\n`;
          responseText += `**Primary Route**:\n`;
          responseText += `- **Bus Number**: ${matchedRoute.primary.busNumber}\n`;
          responseText += `- **Route**: ${matchedRoute.primary.route.join(' → ')}\n`;
          responseText += `- **Travel Time**: ${matchedRoute.primary.travelTime}\n`;
          responseText += `- **Frequency**: ${matchedRoute.primary.frequency}\n`;
          responseText += `**Alternate Routes**:\n`;
          matchedRoute.alternate.forEach((alt, index) => {
            responseText += `- **Bus Numbers**: ${alt.busNumbers.join(', ')}\n`;
            responseText += `  - **Route**: ${alt.route.join(' → ')}\n`;
            responseText += `  - **Travel Time**: ${alt.travelTime}\n`;
            responseText += `  - **Frequency**: ${alt.frequency}\n`;
          });
          responseText += `\n**Travel Tip**: ${matchedRoute.travelTip}\n`;
          responseText += `\nThis route was selected based on the shortest travel time.`;
        }
        return responseText;
      }

      // Fallback to long-distance API for inter-city routes
      let routes = [];
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/long-distance/route/${encodeURIComponent(fromLocation)}/${encodeURIComponent(toLocation)}`
        );
        routes = response.data;
      } catch (error) {
        console.error('LongDistanceRoute API Error:', error.response?.data || error.message);
        return languageCode === 'ta'
          ? `மன்னிக்கவும், ${fromLocation} முதல் ${toLocation} வரை வழிகளைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.`
          : `Sorry, could not fetch routes from ${fromLocation} to ${toLocation}. Please try again.`;
      }

      if (routes.length === 0) {
        return languageCode === 'ta'
          ? `${fromLocation} முதல் ${toLocation} வரை நேரடி பேருந்து வழிகள் எதுவும் கிடைக்கவில்லை. அருகிலுள்ள இடங்களைச் சரிபார்க்கவும் அல்லது redBus போன்ற சேவைகளைப் பயன்படுத்தவும்.`
          : `No direct bus routes found from ${fromLocation} to ${toLocation}. Please check nearby locations or use services like redBus.`;
      }

      const mostEfficientRoute = routes.reduce((best, current) => {
        const bestTime = parseTravelTimeToMinutes(best.travel_time);
        const currentTime = parseTravelTimeToMinutes(current.travel_time);
        return currentTime < bestTime ? current : best;
      }, routes[0]);

      let responseText;
      const stops = [mostEfficientRoute.from, ...mostEfficientRoute.bus_stops, mostEfficientRoute.to].join(' → ');
      const hasDepartures = mostEfficientRoute.departures_from_start?.length > 0;

      if (languageCode === 'ta') {
        responseText = `${fromLocation} முதல் ${toLocation} வரை சிறந்த பேருந்து வழி:\n\n`;
        responseText += `**வழி**: ${mostEfficientRoute.route || 'தெரியவில்லை'}\n`;
        responseText += `**பயண நேரம்**: ${mostEfficientRoute.travel_time || 'தெரியவில்லை'}\n`;
        responseText += `**நிறுத்தங்கள்**: ${stops}\n`;
        if (hasDepartures) {
          responseText += `**புறப்படும் நேரங்கள்**: ${mostEfficientRoute.departures_from_start.join(', ')}\n`;
          responseText += `**முதல் பேருந்து**: ${mostEfficientRoute.departures_from_start[0]}\n`;
          responseText += `**கடைசி பேருந்து**: ${mostEfficientRoute.departures_from_start[mostEfficientRoute.departures_from_start.length - 1]}\n`;
        } else {
          responseText += `**புறப்படும் நேரங்கள்**: கிடைக்கவில்லை, ஆபரேட்டரிடம் சரிபார்க்கவும்.\n`;
        }
        responseText += `\nஇந்த வழி குறைந்த பயண நேரத்தின் அடிப்படையில் தேர்ந்தெடுக்கப்பட்டது.`;
      } else {
        responseText = `Most efficient bus route from ${fromLocation} to ${toLocation}:\n\n`;
        responseText += `**Route**: ${mostEfficientRoute.route || 'Unknown'}\n`;
        responseText += `**Travel Time**: ${mostEfficientRoute.travel_time || 'Unknown'}\n`;
        responseText += `**Stops**: ${stops}\n`;
        if (hasDepartures) {
          responseText += `**Departure Times**: ${mostEfficientRoute.departures_from_start.join(', ')}\n`;
          responseText += `**First Bus**: ${mostEfficientRoute.departures_from_start[0]}\n`;
          responseText += `**Last Bus**: ${mostEfficientRoute.departures_from_start[mostEfficientRoute.departures_from_start.length - 1]}\n`;
        } else {
          responseText += `**Departure Times**: Not available, please check with the operator.\n`;
        }
        responseText += `\nThis route was selected based on the shortest travel time.`;
      }

      return responseText;
    }

    // Fallback to Gemini API for non-route queries
    const prompt = `
You are a helpful multilingual travel assistant for Tamil Nadu.
IMPORTANT: You must respond EXCLUSIVELY in ${languageName} language, using the proper ${languageName} script and characters (not transliteration or English).
For example:
- If responding in Tamil, use தமிழ் script (e.g., "வணக்கம்" instead of "Vanakkam").
- If responding in English, use standard English.
Do NOT respond in any other language unless explicitly requested. If you cannot generate a response in ${languageName}, provide a brief explanation in ${languageName} and suggest trying again.

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
          'Content-Type': 'குறிப்பிடவும்.'
        }
      }
    );

    return response.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini API Error (Chatbot):', error.response?.data || error.message);
    return languageCode === 'ta'
      ? 'மன்னிக்கவும், உங்கள் செய்தியை செயலாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
      : 'Sorry, I could not process your message. Please try again.';
  }
};