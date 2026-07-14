import { GoogleGenAI } from "@google/genai";
import { Region } from '../types';

// Custom Error class to handle missing or invalid API Key issues explicitly
export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

// Global state for the SDK client instance and current API Key
let ai: GoogleGenAI | null = null;
let currentApiKey: string | undefined = process.env.API_KEY;

/**
 * Lazy-initializes and returns the GoogleGenAI client instance.
 */
const getAiClient = (): GoogleGenAI => {
  if (!currentApiKey) {
    throw new ApiKeyError('Google API key is not set. Please provide one.');
  }
  if (!ai) {
     ai = new GoogleGenAI({ apiKey: currentApiKey });
  }
  return ai;
}

/**
 * Updates the active API key and forces a re-initialization of the client.
 */
export const setApiKey = (newKey: string): void => {
  currentApiKey = newKey;
  ai = new GoogleGenAI({ apiKey: currentApiKey }); 
}

/**
 * Helper utility to convert a browser File object into a base64 encoded string.
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Calls the Google Imagen API to perform a photorealistic virtual try-on edit.
 * @param imageFile The user's uploaded portrait image file.
 * @param prompt The descriptive text prompt specifying the new clothing style/color.
 * @param regions The body zones targetted for replacement (e.g., ['upper body', 'torso']).
 * @returns A promise that resolves to the generated image's base64 string.
 */
export const generateVirtualTryOn = async (
  imageFile: File,
  prompt: string,
  regions: Region[]
): Promise<string> => {
  const base64ImageData = await fileToBase64(imageFile);
  const mimeType = imageFile.type;

  // Formatting the region string for the editing model to detect the clothing area accurately
  const regionText = regions.join(' and ');
  const editingPrompt = `In the provided image, replace the clothing on the ${regionText} with a photorealistic, highly detailed "${prompt}". Keep the person's face, body structure, pose, and background exactly the same.`;

  try {
    const client = getAiClient();
    
    // Using the dedicated Imagen 3 Editing model instead of Gemini Core
    const response = await client.models.editImage({
      model: 'imagen-3.0-editing-002',
      image: {
        data: base64ImageData,
        mimeType: mimeType,
      },
      prompt: editingPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1', // Options: "1:1", "3:4", "4:3", "9:16", "16:9"
      },
    });

    // Process the generated image from the specific Imagen response payload structure
    const generatedImage = response.generatedImages?.[0];
    if (generatedImage && generatedImage.image && generatedImage.image.imageBytes) {
      // Returns the base64 string of the newly edited try-on image
      return generatedImage.image.imageBytes;
    }

    throw new Error('Imagen API completed the request but did not return any image bytes.');
  } catch (error) {
    console.error('Error in virtual try-on image generation:', error);
    
    if (error instanceof ApiKeyError) {
      throw error;
    }
    
    if (error instanceof Error) {
        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
            throw new ApiKeyError('Your API key is invalid. Please enter a valid one.');
        }
        throw new Error(`Virtual Try-On Failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred during image editing.');
  }
};
