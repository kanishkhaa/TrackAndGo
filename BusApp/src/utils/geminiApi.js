import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyCDQ65gzIjpnS-QN2SGlCBJEjtwHrw0094';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

export const generateTravelTips = async (fromLocation, toLocation, journeyDetails = {}) => {
  try {
    const prompt = `
      You are a travel assistant specializing in personalized travel advice. Generate 3-5 concise, practical travel tips tailored specifically to a bus journey arriving at ${toLocation}. 
      Focus on aspects unique to ${toLocation}, such as local weather, cultural norms, transportation options at the destination, or destination-specific travel advice. 
      Consider the journey details for context: ${JSON.stringify(journeyDetails)}.
      The tips should be relevant to bus travel and the destination's characteristics.
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
      `Check the weather forecast for ${toLocation} and dress accordingly.`,
      `Learn a few local phrases used in ${toLocation} to communicate better.`,
      `Download a map of ${toLocation} for offline use in case of poor connectivity.`,
    ];
  }
};

export const generateAlternateRoutes = async (fromLocation, toLocation, primaryRoute) => {
  try {
    const prompt = `
      You are an expert travel assistant specializing in optimizing bus travel routes. The user is planning a bus journey from ${fromLocation} to ${toLocation}. 
      The primary route has the following details: ${JSON.stringify(primaryRoute)}.
      
      Suggest up to 2 alternate bus routes that are practical, realistic, and aim to reduce travel time compared to the primary route's ${primaryRoute.totalDuration}. 
      Each alternate route must:
      - Use buses only (no trains or other transport modes).
      - Include the starting point (${fromLocation}) and destination (${toLocation}).
      - List intermediate stops (if any, limited to 1-3 stops to keep the route efficient).
      - Provide an estimated travel time in the format "Xh Ym" (e.g., "4h 15m"), ensuring it is shorter than the primary route's ${primaryRoute.totalDuration}.
      - Include a specific reason why this bus route is faster (e.g., "Uses an express bus with no stops," "Fewer intermediate stops reduce travel time," "Route uses a highway instead of city roads," or "Avoids congested areas during peak hours").
      - Specify the bus type (e.g., "Standard Bus," "Express Bus," "Luxury Bus").
      - Consider the bus infrastructure of ${fromLocation} and ${toLocation} (e.g., major bus terminals, express bus availability, or road conditions).
      - Avoid impractical routes (e.g., routes with unavailable bus services, excessive detours, or unrealistic travel times).

      Ensure the alternate routes are diverse (e.g., one might use an express bus with no stops, another might take a different route with fewer stops or a faster road).
      If no faster bus routes are possible, return an empty array.

      Return the response as a JSON array of objects, e.g.:
      [
        {
          "from": "${fromLocation}",
          "to": "${toLocation}",
          "stops": ["Intermediate Stop"],
          "travelTime": "4h 15m",
          "reason": "Express bus with no intermediate stops",
          "mode": "Express Bus"
        }
      ]
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