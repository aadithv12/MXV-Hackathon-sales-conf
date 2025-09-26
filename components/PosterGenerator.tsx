import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HfInference } from '@huggingface/inference';
import { useUser } from '../context/UserContext';
import { usePoster } from '../context/PosterContext';
import { supabase } from '../services/supabase';
import { LoadingSpinner, UploadCloudIcon, DownloadIcon, Share2Icon, XIcon, FilmIcon } from './icons';

interface PosterGeneratorProps {
  onClose: () => void;
}

const PosterGenerator: React.FC<PosterGeneratorProps> = ({ onClose }) => {
  const { user } = useUser();
  const { generatedPoster, setGeneratedPoster } = usePoster();
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState<string | null>(null);
  const [showShimmer, setShowShimmer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing poster on component mount
  useEffect(() => {
    if (generatedPoster) {
      setGeneratedPosterUrl(generatedPoster.url);
    }
  }, [generatedPoster]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfieFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfiePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setGeneratedPosterUrl(null); // Reset if a new image is uploaded
    }
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  const handleGeneratePoster = async () => {
    if (!selfieFile || !user) return;
    setIsLoading(true);
    setError(null);
    setGeneratedPosterUrl(null);

    try {
      console.log("Step 1: Starting poster generation...");
      // --- 1. IMAGE GENERATION (Hugging Face with Custom Provider) ---
      const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

      const prompt = `Transform into a clean classic 1970s Bollywood movie poster painting style with ornamental decorative border inspired by traditional Tanjore paintings. Realistic oil painting portrait of ${user.name} in a heroic dramatic pose - confident stance, determined expression, heroic gesture like pointing forward or arms crossed. Soft brushstrokes, warm golden lighting, traditional Indian cinema poster aesthetic. Vintage hand-painted movie poster art with rich orange and red background gradients, dramatic shadows, realistic facial features, smooth painted textures. Style of classic Raj Kapoor era Bollywood posters - photorealistic painted portrait, not cartoon or comic style. Warm sepia tones, cinematic lighting, traditional movie poster composition. Add ornamental golden decorative border around the entire image in the style of traditional Tanjore paintings with intricate floral patterns, geometric designs, and gold leaf detailing typical of South Indian temple art. NO TEXT OR TYPOGRAPHY in the image, clean portrait only for text overlay.`;

      const generatedImageBlob = await hf.imageToImage({
        provider: "fal-ai", // Crucial for this model
        model: 'nharshavardhana/impasto_painting_kontext-lora',
        inputs: selfieFile,
        parameters: { prompt: prompt },
      });
      console.log("Step 2: Image generated from Hugging Face. Starting text overlay...");

      // --- 2. TEXT GENERATION (Simplified) ---
      const movieTitle = `${user.name}`;
      const brandTagline = `Elite Salesman`;

      // --- 3. COMBINE IMAGE AND TEXT (Canvas) --- 
 
      const finalImageBlob = await new Promise<Blob>((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(generatedImageBlob);
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Could not get canvas context');

            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);

            // --- Draw Title (Top) ---
            let titleFontSize = Math.max(32, Math.min(50, image.width / 15));
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD700'; // Gold color
            ctx.strokeStyle = '#B91C3C'; // Dark red outline

            // Auto-adjust font size to fit within 85% of canvas width
            do {
              ctx.font = `bold ${titleFontSize}px Arial, Impact, sans-serif`;
              const titleMetrics = ctx.measureText(movieTitle);
              if (titleMetrics.width <= canvas.width * 0.85) break;
              titleFontSize -= 2;
            } while (titleFontSize > 16);

            ctx.lineWidth = Math.max(2, titleFontSize / 20);
            const titleX = canvas.width / 2;
            const titleY = Math.max(titleFontSize + 40, canvas.height * 0.12);

            // Draw title with better visibility
            ctx.strokeText(movieTitle, titleX, titleY);
            ctx.fillText(movieTitle, titleX, titleY);

            // --- Draw Elite Salesman (Bottom) ---
            let taglineFontSize = Math.max(24, Math.min(40, image.width / 20));
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD700'; // Gold color
            ctx.strokeStyle = '#B91C3C'; // Dark red outline

            // Auto-adjust font size to fit within 85% of canvas width
            do {
              ctx.font = `bold ${taglineFontSize}px Arial, Impact, sans-serif`;
              const taglineMetrics = ctx.measureText(brandTagline);
              if (taglineMetrics.width <= canvas.width * 0.85) break;
              taglineFontSize -= 2;
            } while (taglineFontSize > 16);

            ctx.lineWidth = Math.max(3, taglineFontSize / 15);
            const taglineX = canvas.width / 2;
            const taglineY = Math.min(canvas.height - 30, canvas.height * 0.92);

            // Draw Elite Salesman tagline
            ctx.strokeText(brandTagline, taglineX, taglineY);
            ctx.fillText(brandTagline, taglineX, taglineY);

            canvas.toBlob(blob => {
              if (blob) {
                resolve(blob);
              } else {
                reject('Canvas to Blob conversion failed');
              }
            }, 'image/png');
        };
        image.onerror = () => reject('Failed to load generated image');
      });
      
      console.log("Step 4: Image and text combined. Displaying locally.");
      // --- 4. DISPLAY IMAGE LOCALLY (Bypassing Supabase) ---
      const localImageUrl = URL.createObjectURL(finalImageBlob);
      setGeneratedPosterUrl(localImageUrl);

      // Trigger shimmer effect for 6 seconds
      setShowShimmer(true);
      setTimeout(() => setShowShimmer(false), 6000);

      // Save to poster context
      const posterData = {
        url: localImageUrl,
        title: movieTitle,
        tagline: brandTagline,
        createdAt: new Date().toISOString()
      };
      setGeneratedPoster(posterData);

    } catch (err: any) {
      console.error("An error occurred during poster generation:", JSON.stringify(err, null, 2));
      setError(err.message || 'An unexpected error occurred. Check the console for details.');
    } finally {
      console.log("Step 5: Process finished. Hiding loader.");
      setIsLoading(false);
    }
  };


  const handleDownload = () => {
    if (!generatedPosterUrl) return;
    const link = document.createElement('a');
    link.href = generatedPosterUrl;
    link.download = `sales-conference-poster-${user?.name?.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedPosterUrl) return;
    try {
      // Convert the blob URL to actual blob for sharing
      const response = await fetch(generatedPosterUrl);
      const blob = await response.blob();
      const file = new File([blob], 'poster.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'My Bollywood Poster',
          text: 'Check out my awesome Bollywood-style poster!',
          files: [file]
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        alert('Poster copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('Share failed. Please try downloading instead.');
    }
  };

  const handleNewPhoto = () => {
    setSelfieFile(null);
    setSelfiePreview(null);
    setError(null);
  };
  
  const actionButtonClass = "flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      <style jsx>{`
        .shimmer-effect {
          position: relative;
          overflow: hidden;
        }

        .shimmer-overlay {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 215, 0, 0.4) 25%,
            rgba(255, 215, 0, 0.6) 50%,
            rgba(255, 215, 0, 0.4) 75%,
            transparent 100%
          );
          animation: shimmer 2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl h-full md:h-auto max-h-[90vh] bg-gradient-to-br from-[#2C1E3A] to-[#3D2F2F] rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-20 text-white/70 hover:text-white"><XIcon className="w-8 h-8" /></button>
        
        {/* === CONTROLS PANEL === */}
        <div className="w-full md:w-1/3 flex-shrink-0 p-6 flex flex-col space-y-4 bg-black/20 overflow-y-auto">
          <h2 className="text-3xl font-bold font-bangers tracking-wider text-center text-[#FFD700]">Poster Studio</h2>
          
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`${actionButtonClass} bg-[#FF9933] text-[#2C1E3A] hover:bg-[#CC5500]`}
          >
            <UploadCloudIcon className="w-6 h-6" />
            <span>{selfieFile ? 'Change Photo' : generatedPoster ? 'Upload New Photo' : 'Upload Your Selfie'}</span>
          </button>

          {generatedPoster && !selfieFile && (
            <div className="space-y-4">
              <button
                onClick={handleNewPhoto}
                className={`${actionButtonClass} bg-[#5D1E3F] text-white hover:bg-[#4A1831]`}
              >
                <span>Start Fresh</span>
              </button>

              {generatedPosterUrl && (
                <motion.div initial={{ opacity: 0}} animate={{ opacity: 1 }} className="p-4 bg-green-900/50 rounded-lg space-y-3">
                    <p className="text-green-300 font-semibold text-center">Your Existing Poster</p>
                     <div className="space-y-2">
                      <button onClick={handleDownload} className={`${actionButtonClass} bg-green-600 text-white hover:bg-green-700`}>
                        <DownloadIcon className="w-6 h-6" />
                        <span>Download</span>
                      </button>
                      <button onClick={handleShare} className={`${actionButtonClass} bg-blue-600 text-white hover:bg-blue-700`}>
                        <Share2Icon className="w-6 h-6" />
                        <span>Share</span>
                      </button>
                     </div>
                </motion.div>
              )}
            </div>
          )}
          
          {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-2 rounded">{error}</p>}
          
          <AnimatePresence>
          {selfiePreview && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <button
                onClick={handleGeneratePoster}
                disabled={isLoading}
                className={`${actionButtonClass} bg-[#B91C3C] text-white hover:bg-[#a11835]`}
              >
                {isLoading ? <LoadingSpinner/> : <span>Generate Poster</span>}
              </button>

              {generatedPosterUrl && (
                  <motion.div initial={{ opacity: 0}} animate={{ opacity: 1 }} className="p-4 bg-green-900/50 rounded-lg space-y-3">
                      <p className="text-green-300 font-semibold text-center">
                        {generatedPoster && !selfieFile ? 'Your Existing Poster' : 'Poster Generated!'}
                      </p>
                       <div className="space-y-2">
                        <button onClick={handleDownload} className={`${actionButtonClass} bg-green-600 text-white hover:bg-green-700`}>
                          <DownloadIcon className="w-6 h-6" />
                          <span>Download</span>
                        </button>
                        <button onClick={handleShare} className={`${actionButtonClass} bg-blue-600 text-white hover:bg-blue-700`}>
                          <Share2Icon className="w-6 h-6" />
                          <span>Share</span>
                        </button>
                       </div>
                  </motion.div>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
        
        {/* === POSTER CANVAS === */}
        <div className="flex-grow p-6 flex items-center justify-center overflow-hidden bg-black/30">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-white">
                <LoadingSpinner className="w-16 h-16 mx-auto" />
                <p className="mt-4 font-semibold">Generating your blockbuster poster...</p>
                <p className="text-sm text-white/70">This might take a moment.</p>
              </motion.div>
            ) : generatedPosterUrl ? (
              <motion.div key="poster" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full">
                <div className={`relative ${showShimmer ? 'shimmer-effect' : ''}`}>
                  <img src={generatedPosterUrl} alt="Generated Bollywood Poster" className="object-contain w-full h-full" />
                  {showShimmer && (
                    <div className="absolute inset-0 shimmer-overlay pointer-events-none"></div>
                  )}
                </div>
              </motion.div>
            ) : selfiePreview ? (
              <motion.div key="preview" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full flex items-center justify-center">
                <img src={selfiePreview} alt="Selfie Preview" className="object-contain max-h-full max-w-full rounded-lg shadow-lg" />
              </motion.div>
            ) : (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/50">
                <FilmIcon className="w-24 h-24 mx-auto mb-4"/>
                <p className="text-lg">Upload a photo to begin your stardom!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      </motion.div>
    </>
  );
};

export default PosterGenerator;
