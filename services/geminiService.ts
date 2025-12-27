import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ColorData } from "../types";

// Schema definition (kept for reference and text-based structured output where stable)
const colorItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    library: { type: Type.STRING, description: "The color library name (e.g., Pantone, RAL Classic)" },
    code: { type: Type.STRING, description: "The specific color code" },
    nameEN: { type: Type.STRING, description: "Official English name" },
    nameZH: { type: Type.STRING, description: "Chinese translation of the name" },
    hex: { type: Type.STRING, description: "Hex code #RRGGBB" },
    rgb: {
      type: Type.OBJECT,
      properties: {
        r: { type: Type.NUMBER },
        g: { type: Type.NUMBER },
        b: { type: Type.NUMBER },
      },
    },
    lab: {
      type: Type.OBJECT,
      properties: {
        l: { type: Type.NUMBER },
        a: { type: Type.NUMBER },
        b: { type: Type.NUMBER },
      },
    },
    description: { type: Type.STRING, description: "Short description" },
  },
};

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Robust JSON Extractor
const extractJson = (text: string): any => {
  if (!text) return null;
  
  // Clean up markdown code blocks if present to get just the content
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

  // 1. Try parsing strictly first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue
  }

  // 2. Find the first '{' and the last '}' (for objects)
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  // 3. Find the first '[' and the last ']' (for arrays)
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  // Determine if it looks more like an object or array
  // Priority: if it starts with [ before {, it's likely an array
  const objectScore = (firstBrace !== -1 && lastBrace !== -1) ? 1 : 0;
  const arrayScore = (firstBracket !== -1 && lastBracket !== -1) ? 1 : 0;

  if (arrayScore && (!objectScore || firstBracket < firstBrace)) {
     try {
      return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
    } catch (e) {
      console.error("Failed to parse extracted JSON array", e);
    }
  }

  if (objectScore) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch (e) {
      console.error("Failed to parse extracted JSON object", e);
    }
  }

  throw new Error("Could not parse response from AI. Raw response: " + text.substring(0, 100) + "...");
};

export const searchByColorCode = async (code: string): Promise<ColorData> => {
  if (!code) throw new Error("Code is required");
  const ai = getAiClient();

  const prompt = `
    Find the official color details for the code "${code}".
    
    Rules:
    1. If the code is a 4-digit number (e.g. 7035), treat it as RAL Classic (e.g. RAL 7035).
    2. If it is formatted like XX-XXXX, treat it as Pantone.
    3. Return a SINGLE JSON object representing this color.
    
    Required JSON Structure:
    {
      "library": "string",
      "code": "string",
      "nameEN": "string",
      "nameZH": "string",
      "hex": "#RRGGBB",
      "rgb": { "r": number, "g": number, "b": number },
      "lab": { "l": number, "a": number, "b": number },
      "description": "string"
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    // Note: We use responseMimeType json but NOT the strict schema object to allow
    // the model flexibility in filling the data without validation errors blocking the response.
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  const result = extractJson(text);
  if (!result) throw new Error("Invalid JSON response");
  
  // Normalize result if wrapped in array
  if (Array.isArray(result)) return result[0];
  return result as ColorData;
};

export const identifyColorFromImage = async (base64Image: string): Promise<ColorData[]> => {
  const ai = getAiClient();
  
  // Simplified prompt to reduce model confusion
  const prompt = `
    Analyze the image. Identify the ONE main dominant color.
    Find the best matching Pantone or RAL color.
    
    Return a JSON object with this EXACT structure:
    {
      "library": "Pantone or RAL",
      "code": "color code",
      "nameEN": "name in English",
      "nameZH": "name in Chinese",
      "hex": "#RRGGBB",
      "rgb": { "r": 0, "g": 0, "b": 0 },
      "lab": { "l": 0, "a": 0, "b": 0 },
      "description": "Brief description of the color match"
    }
  `;

  // We remove the schema config for vision requests to prevent "400 Bad Request" 
  // if the model struggles to align visual data with strict schema types.
  // We rely on the prompt to enforce JSON format.
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  const result = extractJson(text);
  
  if (!result) throw new Error("Could not parse color data from image");

  // Handle both single object and array returns
  if (Array.isArray(result)) {
    return result;
  } else if (result.code) {
    return [result];
  } else if (result.colors && Array.isArray(result.colors)) {
    return result.colors;
  }
  
  throw new Error("Unexpected response structure");
};

export const searchByValues = async (
  type: 'rgb' | 'lab',
  values: { v1: number; v2: number; v3: number }
): Promise<ColorData> => {
  const ai = getAiClient();
  
  let promptStr = "";
  if (type === 'rgb') {
    promptStr = `Find the closest Pantone or RAL color match for RGB(${values.v1}, ${values.v2}, ${values.v3}). Return a JSON object with library, code, nameEN, nameZH, hex, rgb, lab, and description.`;
  } else {
    promptStr = `Find the closest Pantone or RAL color match for CIE L*a*b* (${values.v1}, ${values.v2}, ${values.v3}). Return a JSON object with library, code, nameEN, nameZH, hex, rgb, lab, and description.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: promptStr,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  const result = extractJson(text);
  if (!result) throw new Error("Invalid JSON response");
  
  if (Array.isArray(result)) return result[0];
  return result as ColorData;
};