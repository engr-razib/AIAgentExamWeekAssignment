import React, { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { Region } from './types';
import { generateVirtualTryOn, setApiKey, ApiKeyError } from './services/geminiService';
import { UploadIcon, ShirtIcon, PantsIcon, SparklesIcon, DownloadIcon } from './components/icons';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([Region.Upper, Region.Lower]);
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  const upperBodyHints = [
    "A classic black leather biker jacket",
    "A cozy knit sweater",
    "A vibrant Hawaiian shirt",
    "A crisp white linen shirt",
    "A sporty hoodie",
    "A tailored navy blazer",
    "A sleeveless denim vest",
    "A futuristic metallic jacket",
    "A red plaid flannel shirt",
    "A cropped bomber jacket",
    "A flowy off-shoulder blouse",
    "A striped sailor t-shirt",
    "A velvet blazer with embroidery",
    "A graphic oversized t-shirt",
    "A silk button-up shirt with floral prints",
    "A rugged camouflage jacket",
    "A long cardigan with pockets",
    "A satin corset top",
    "A fitted turtleneck sweater",
    "A festival-style fringe top",
    "A varsity jacket with bold patches",
    "A sheer lace blouse",
    "A puffer vest over a long-sleeve shirt",
    "A retro 80s windbreaker",
    "A leather harness top with buckles",
  ];


  const lowerBodyHints = [
    "Blue denim jeans",
    "High-waisted linen trousers",
    "A pleated midi skirt",
    "Tailored wool dress pants",
    "Black cargo pants",
    "Ripped skinny jeans",
    "Classic black pencil skirt",
    "Wide-leg palazzo pants",
    "Leather mini skirt",
    "Cropped chinos",
    "Flared 70s bell-bottoms",
    "Athletic jogger pants",
    "Denim shorts with frayed edges",
    "Sequin party skirt",
    "Futuristic metallic leggings",
    "Khaki Bermuda shorts",
    "Maxi skirt with floral prints",
    "Corduroy straight-leg pants",
    "Layered tulle skirt",
    "Traditional sarong-style wrap skirt",
    "Faux leather slim-fit pants",
    "High-slit satin skirt",
    "Harem pants with ethnic prints",
    "Utility pants with multiple pockets",
    "Velvet trousers for evening wear",
  ];

  const fullOutfitHints = [
    "Marvel Super hero costume like: ",
    "Vibrant floral summer dress",
    "Formal navy blue tuxedo",
    "A tan trench coat over a white t-shirt and jeans",
    "A standard colour power suit with a matching blazer and trousers",
    "Bohemian-style maxi dress with sandals",
    "A 90s grunge look with a flannel shirt and ripped jeans",
    "Classic black leather jacket with skinny jeans",
    "Traditional Japanese kimono with floral patterns",
    "Casual streetwear with oversized hoodie and sneakers",
    "Elegant evening gown with sequins",
    "Safari outfit with khaki shorts and hat",
    "Business casual look with blazer and chinos",
    "Retro 70s disco outfit with flared pants",
    "Winter coat with scarf and gloves",
    "Athletic sportswear set with joggers and trainers",
    "Beachwear with colorful swimsuit and sarong",
    "Steampunk-inspired Victorian outfit",
    "Cozy oversized sweater with leggings",
    "Traditional Indian saree with jewelry",
    "Futuristic cyberpunk neon outfit",
  ];

  // Utility: shuffle array (Fisher-Yates)
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const getHints = () => {
    const isUpperSelected = selectedRegions.includes(Region.Upper);
    const isLowerSelected = selectedRegions.includes(Region.Lower);

    let hints;
    if (isUpperSelected && isLowerSelected) {
      hints = fullOutfitHints;
    } else if (isUpperSelected) {
      hints = upperBodyHints;
    } else if (isLowerSelected) {
      hints = lowerBodyHints;
    } else {
      hints = fullOutfitHints;
    }

    // 🔀 Randomize order every time
    return shuffleArray(hints);
  };

  const hintsToDisplay = getHints();


  const handleFileChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setGeneratedImage(null);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file (PNG, JPG, etc.).');
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const onFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files?.[0] || null);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files?.[0] || null);
  };

  const handleRegionToggle = (region: Region) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );

  };

  const handleHintClick = (hint: string) => {
    setPrompt(hint);
  };

  const handleSubmit = useCallback(async () => {
    if (!imageFile || selectedRegions.length === 0 || !prompt.trim()) {
      setError('Please upload an image, select a region, and enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const generatedImgBase64 = await generateVirtualTryOn(imageFile, prompt, selectedRegions);
      setGeneratedImage(`data:image/png;base64,${generatedImgBase64}`);
      window.location.hash = "newGeneratedPhoto";
    } catch (e) {
      if (e instanceof ApiKeyError) {
        setError(e.message);
        setIsApiKeyModalOpen(true);
      } else {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, prompt, selectedRegions]);

  const handleApiKeySubmit = async () => {
    if (!apiKeyInput.trim()) {
      setError('API Key cannot be empty.');
      return;
    }
    setApiKey(apiKeyInput);
    setIsApiKeyModalOpen(false);
    setApiKeyInput('');
    await handleSubmit(); // Retry the submission
  };

  const isFormComplete = imageFile && selectedRegions.length > 0 && prompt.trim().length > 0;

  return (
    <>
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800">API Key Required</h2>
            <p className="text-sm text-gray-600 mt-2">
              {error || 'The Google Gemini API key is missing or invalid. Please provide a valid key to continue.'}
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your Google Gemini API key"
              className="mt-4 p-4 block w-full rounded-md border-black-800 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
              aria-label="API Key Input"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleApiKeySubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save & Retry
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gray-50 flex flex-col p-2 sm:p-2 lg:p-2 lg:h-screen">

        <main className="w-full max-w-[90%] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:flex-grow lg:min-h-0">
          {/* Controls Column */}
          <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 flex flex-col space-y-4 ">

            {/* Step 1: Upload Image */}
            <div>
              <label className="text-lg font-semibold text-gray-700">1. Upload Your Image</label>
              <div
                className={`mt-2 p-4 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
                style={{ cursor: 'pointer' }}
              >
                <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={onFileSelected} />
                <UploadIcon className="mx-auto h-10 w-10 text-gray-400" />
                <label htmlFor="file-upload" className="mt-2 block text-sm font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer">
                  Choose a file
                </label>
                <p className="text-xs text-gray-500">or drag and drop</p>
              </div>
            </div>

            {/* Step 2: Select Region */}
            <div>
              <label className="text-lg font-semibold text-gray-700">2. Select Clothing Region(s)</label>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleRegionToggle(Region.Upper)}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${selectedRegions.includes(Region.Upper) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'}`}
                >
                  <ShirtIcon className="mr-2 w-5 h-5" />
                  <span className="font-medium">Upper Body</span>
                </button>
                <button
                  onClick={() => handleRegionToggle(Region.Lower)}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${selectedRegions.includes(Region.Lower) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'}`}
                >
                  <PantsIcon className="mr-2 w-5 h-5" />
                  <span className="font-medium">Lower Body</span>
                </button>
              </div>
            </div>

            {/* Step 3: Describe Clothing */}
            <div className="flex-grow flex flex-col">
              <label htmlFor="prompt" className="text-lg font-semibold text-gray-700">3. Describe the Item(s)</label>
              <textarea
                id="prompt"
                rows={2}
                max={100}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={"e.g., A vintage leather jacket"}
                className="mt-2 block w-full  rounded-md border-[#ccc] border-2 border-solid shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm  p-4"
              />
              <label className="text-xs text-right font-normal text-gray-600">{prompt.length}/100</label>
              <div className="mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-center">
                  <label className="text-sm font-medium text-gray-600">Need inspiration?</label>

                  <button 
                    onClick={() => {
                        setPrompt(hintsToDisplay[Math.floor(Math.random() * hintsToDisplay.length)]);
                      }} 
                    className="w-full flex items-center justify-center py-2 px-2 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-indigo-600 hover:bg-indigo-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      Random Picks 
                    </button>
                  </div>
                
                <div className="mt-2 flex flex-wrap gap-2 h-[150px] overflow-y-auto">
                  {hintsToDisplay.map((hint, index) => (
                    <button
                      key={index}
                      onClick={() => handleHintClick(hint)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-indigo-100 hover:text-indigo-700 transition-colors duration-200 cursor-pointer"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && !isApiKeyModalOpen && <div className="text-red-600 bg-red-100 p-3 rounded-md text-sm flex-shrink-0">{error}</div>}

            {/* Generate Button */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4 items-center">
              <button
                onClick={handleSubmit}
                disabled={!isFormComplete || isLoading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {isLoading ? <Spinner className="mr-3 w-6 h-6" /> : <SparklesIcon className="mr-3 w-6 h-6" />}
                {isLoading ? 'Generating...' : ' Generate New Outfit'}
              </button>
              {/* <button
                onClick={() => {
                  setPrompt(hintsToDisplay[Math.floor(Math.random() * hintsToDisplay.length)], () => {
                    setTimeout(handleSubmit(), 2000);
                  });

                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {isLoading ? <Spinner className="mr-3 w-6 h-6" /> : <SparklesIcon className="mr-3 w-6 h-6" />}
                {isLoading ? 'Generating...' : ' Random Generate Outfit'}
              </button>
              */}
            </div>
          </div>

          {/* Image Display Column */}
          <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 flex flex-col">
            <header className="w-full max-w-[90%] mx-auto text-center mb-4 flex-shrink-0">
              <h1 className="text-4xl sm:text-3xl font-bold text-gray-800 tracking-tight">AI Dress</h1>
              <p className="mt-2 text-md text-gray-600">See yourself in new outfits instantly. Upload your photo to begin.</p>

            </header>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-center">

              <div className="flex flex-col items-center text-center">
                <h3 className="font-semibold text-gray-600 mb-2">Original Image</h3>
                <div className="aspect-[3/4] w-full bg-gray-200 rounded-lg overflow-hidden shadow-inner border">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Original upload" className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 p-4">Your image will appear here</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-600">Generated Image</h3>
                  {generatedImage && !isLoading && (
                    <a
                      href={generatedImage}
                      download={"ai-dress-" + Date.now() + ".png"}
                      className="inline-flex items-center justify-center p-1.5 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                      title="Download Image"
                    >
                      <DownloadIcon className="w-5 h-5" />
                    </a>
                  )}
                </div>
                <div className="aspect-[3/4] w-full bg-gray-200 rounded-lg overflow-hidden shadow-inner border">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <p className="mt-3 text-sm">AI is working its magic...</p>
                    </div>
                  ) : generatedImage ? (
                    <img src={generatedImage} alt="Generated outfit" className="object-cover w-full h-full" />
                  ) : (
                    <div id="newGeneratedPhoto" className="flex items-center justify-center h-full text-gray-400 p-4">Your new outfit will appear here</div>
                  )}
                </div>
              </div>

            </div>
            <div className="w-full max-w-[90%] mx-auto text-center mt-4 flex-shrink-0">
              <p className="text-md text-purple-600">Design & Developed By: <a className="text-blue-600" href="https://razib.vercel.app/" target="_blank">Razib Hossain</a> </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default App;