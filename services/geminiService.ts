import { GoogleGenAI, Modality } from "@google/genai";
import { Region } from '../types';

// Custom Error for API Key issues
export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

let ai: GoogleGenAI | null = null;
let currentApiKey: string | undefined = process.env.API_KEY;

const getAiClient = () => {
  if (!currentApiKey) {
    throw new ApiKeyError('Google Gemini API key is not set. Please provide one.');
  }
  // Re-initialize if the key has changed or it's the first time.
  if (!ai) {
     ai = new GoogleGenAI({ apiKey: currentApiKey });
  }
  return ai;
}

/**
 * Updates the API key and re-initializes the Gemini client instance.
 * @param newKey The new API key to use.
 */
export const setApiKey = (newKey: string) => {
  currentApiKey = newKey;
  ai = new GoogleGenAI({ apiKey: currentApiKey }); // Create a new instance with the new key
}


/**
 * Converts a File object to a base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 string.
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Calls the Gemini API to edit an image based on a prompt.
 * @param imageFile The user's uploaded image file.
 * @param prompt The text prompt describing the desired clothing.
 * @param regions The clothing regions to modify.
 * @returns A promise that resolves with the base64 string of the generated image.
 */
export const generateVirtualTryOn = async (
  imageFile: File,
  prompt: string,
  regions: Region[]
): Promise<string> => {
  const base64ImageData = await fileToBase64(imageFile);
  const mimeType = imageFile.type;

  const regionText = regions.join(' and ') + (regions.length > 1 ? ' body regions' : ' body region');
  const fullPrompt = `In the provided image, replace the clothing in the ${regionText} with a photorealistic "${prompt}". Maintain the person's pose, body shape, and the original background. The new clothing should blend seamlessly with the existing image.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: fullPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    const textResponse = response.text;
    if (textResponse) {
      throw new Error(`API returned text instead of an image: ${textResponse}`);
    }

    throw new Error('No image was generated. The model may have refused the request.');
  } catch (error) {
    console.error('Error generating virtual try-on:', error);
    if (error instanceof ApiKeyError) {
      throw error; // Re-throw the custom error to be caught by the UI
    }
    if (error instanceof Error) {
        // Check for specific error messages related to API key invalidity
        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
            throw new ApiKeyError('Your API key is invalid. Please enter a valid one.');
        }
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error('An unknown error occurred during image generation.');
  }
};