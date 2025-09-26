import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { usePoster } from '../context/PosterContext';
import { SESSIONS, FEEDBACK_WEBHOOK_URL } from '../constants';
import { supabase } from '../services/supabase';
import { Session } from '../types';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, FilmIcon, QuestionMarkCircleIcon, StarIcon, LoadingSpinner, DownloadIcon, Share2Icon } from './icons';
import PosterGenerator from './PosterGenerator';
import Chatbot from './Chatbot';

// --- TILE WRAPPER ---
const TileWrapper: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.4)' }}
    className={`backdrop-blur-md bg-white/5 rounded-2xl p-6 text-[#FFF5E6] overflow-hidden relative ${className}`}
  >
    {children}
  </motion.div>
);

// --- CAROUSEL TILE ---
const carouselItems = [
  { img: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1470', title: 'Our Sponsors', description: 'Powering the future of sales.' },
  { img: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1632', title: 'Featured Speakers', description: 'Insights from industry leaders.' },
  { img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1470', title: 'Conference Themes', description: 'Innovation, Strategy, and Growth.' },
];

const CarouselTile: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % carouselItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const changeSlide = (direction: number) => {
      setIndex(prev => (prev + direction + carouselItems.length) % carouselItems.length);
  }

  return (
    <TileWrapper className="lg:col-span-2 row-span-1 relative h-64 md:h-full !p-0">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img src={carouselItems[index].img} className="w-full h-full object-cover" alt={carouselItems[index].title} />
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(93,30,63,0.8)] to-[rgba(185,28,60,0.8)]" />
        </motion.div>
      </AnimatePresence>
      <div className="relative z-10 flex flex-col justify-end h-full p-6">
        <h3 className="text-2xl font-bold">{carouselItems[index].title}</h3>
        <p className="text-[#FFD700]">{carouselItems[index].description}</p>
      </div>
       <button onClick={() => changeSlide(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-[#FFF5E6]/20 p-1 rounded-full hover:bg-[#FFF5E6]/40"><ChevronLeftIcon className="w-6 h-6"/></button>
      <button onClick={() => changeSlide(1)} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-[#FFF5E6]/20 p-1 rounded-full hover:bg-[#FFF5E6]/40"><ChevronRightIcon className="w-6 h-6"/></button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {carouselItems.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full ${i === index ? 'bg-[#FFF5E6]' : 'bg-[#FFF5E6]/50'}`} />
        ))}
      </div>
    </TileWrapper>
  );
};

// --- SESSION TRACKER HOOK ---
interface SessionStatus {
  currentSession: Session | null;
  displayNextSession: Session | null;
  countdownToNext: string;
  timeRemainingInCurrent: string;
  progress: number;
  conferenceState: 'before' | 'running' | 'after';
}

const formatTime = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const useSessionTracker = (eventStartTimeStr: string): SessionStatus => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    let correctedTimestamp = eventStartTimeStr;
    // FIX: Timestamps from the database are now treated as IST.
    // We append the IST offset to ensure they are parsed correctly by the Date object,
    // regardless of the user's local timezone.
    if (correctedTimestamp && correctedTimestamp.includes(' ') && !correctedTimestamp.includes('+')) {
        correctedTimestamp = correctedTimestamp.replace(' ', 'T') + '+05:30';
    }

    const eventStart = new Date(correctedTimestamp).getTime();

    const defaultState: SessionStatus = {
        currentSession: null, displayNextSession: SESSIONS[0], countdownToNext: '00:00',
        timeRemainingInCurrent: '00:00', progress: 0, conferenceState: 'before',
    };

    if (isNaN(eventStart) || !eventStartTimeStr) return defaultState;

    const totalDuration = SESSIONS.reduce((acc, s) => acc + s.durationMinutes, 0) * 60 * 1000;
    const nowMs = now.getTime();

    if (nowMs < eventStart) {
        return { ...defaultState, countdownToNext: formatTime(eventStart - nowMs) };
    }

    const elapsedMs = nowMs - eventStart;

    if (elapsedMs >= totalDuration) {
         return {
            currentSession: null, displayNextSession: null, countdownToNext: '00:00',
            timeRemainingInCurrent: '00:00', progress: 100, conferenceState: 'after',
        };
    }

    let currentSession: Session | null = null;
    let timeCursor = 0;
    let currentSessionIndex = -1;

    for (let i = 0; i < SESSIONS.length; i++) {
      const session = SESSIONS[i];
      const sessionDurationMs = session.durationMinutes * 60 * 1000;
      const sessionStartOffset = timeCursor;
      const sessionEndOffset = timeCursor + sessionDurationMs;

      if (elapsedMs >= sessionStartOffset && elapsedMs < sessionEndOffset) {
        currentSession = session;
        currentSessionIndex = i;
        break;
      }
      timeCursor += sessionDurationMs;
    }

    let displayNextSession: Session | null = null;
    let nextSessionStartTime = 0;
    
    let timeToNextCursor = 0;
    for (let i = 0; i < SESSIONS.length; i++) {
        // Find the current or next session that has a speaker
        if (i >= currentSessionIndex && SESSIONS[i].speaker) {
            // If the found session is the current one, find the *next* one with a speaker
            if (i === currentSessionIndex) {
                for (let j = i + 1; j < SESSIONS.length; j++) {
                    if (SESSIONS[j].speaker) {
                        displayNextSession = SESSIONS[j];
                        break;
                    }
                }
            } else {
                 displayNextSession = SESSIONS[i];
            }
            break;
        }
    }
    
    if(displayNextSession) {
        let timeToNextSessionOffset = 0;
        for(const session of SESSIONS) {
            if(session.name === displayNextSession.name) break;
            timeToNextSessionOffset += session.durationMinutes * 60 * 1000;
        }
        nextSessionStartTime = eventStart + timeToNextSessionOffset;
    }
    
    const timeRemainingInCurrent = currentSession 
        ? formatTime((eventStart + SESSIONS.slice(0, currentSessionIndex + 1).reduce((acc, s) => acc + s.durationMinutes, 0) * 60 * 1000) - nowMs) 
        : '00:00';

    return {
      currentSession,
      displayNextSession,
      countdownToNext: formatTime(nextSessionStartTime - nowMs),
      timeRemainingInCurrent,
      progress: Math.min(100, (elapsedMs / totalDuration) * 100),
      conferenceState: 'running',
    };

  }, [now, eventStartTimeStr]);
};


// --- NEXT SESSION TILE ---
const NextSessionTile: React.FC<{ session: Session | null; countdown: string; progress: number; conferenceState: 'before' | 'running' | 'after' }> = ({ session, countdown, progress, conferenceState }) => {
  return (
    <TileWrapper className="lg:col-span-1 row-span-2 bg-gradient-to-br from-[#FF9933] to-[#CC5500]">
      <h3 className="text-2xl font-bold mb-4 flex items-center"><CalendarIcon className="w-6 h-6 mr-2"/> Next Session</h3>
      <AnimatePresence mode="wait">
        <motion.div key={session?.name || conferenceState} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {conferenceState === 'after' || !session ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-xl font-bold">Conference has ended.</p>
                <p>Thank you for attending!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#FFF5E6]/80">Starts in: <span className="font-bold text-lg">{countdown}</span></p>
              <h4 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-white leading-tight break-words" title={session.name}>{session.name}</h4>
              {session.speaker && (
                <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex-shrink-0 mt-0.5"></div>
                    <p className="font-semibold text-[#FFD700] leading-tight break-words" title={session.speaker}>{session.speaker}</p>
                </div>
              )}
              <p className="text-sm text-[#FFF5E6]/90 leading-tight">{session.description}</p>
              <p className="text-xs text-[#FFF5E6]/70">{session.durationMinutes} min session</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-6 left-6 right-6">
        <p className="text-sm text-[#FFF5E6]/80 mb-1">Conference Progress</p>
        <div className="w-full bg-[#FFF5E6]/20 rounded-full h-2.5">
          <div className="bg-[#B91C3C] h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </TileWrapper>
  );
};

// --- FAQ TILE ---
const FaqTile: React.FC<{ onChatbotOpen: () => void }> = ({ onChatbotOpen }) => (
  <TileWrapper className="flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#B91C3C] to-[#5D1E3F]">
    <QuestionMarkCircleIcon className="w-16 h-16 text-[#FF9933] mb-4"/>
    <h3 className="text-2xl font-bold">FAQs</h3>
    <p className="text-[#FFD700] mt-2">Got questions? Get instant answers.</p>
    <button
      onClick={onChatbotOpen}
      className="mt-4 bg-[#FF9933] text-[#2C1E3A] px-4 py-2 rounded-lg font-semibold hover:bg-[#CC5500] transition-colors"
    >
      Ask Away
    </button>
  </TileWrapper>
);

// --- POSTER TILE ---
const PosterTile: React.FC<{ onPosterClick: () => void }> = ({ onPosterClick }) => {
  const { generatedPoster } = usePoster();

  const handleDownload = () => {
    if (!generatedPoster) return;
    const link = document.createElement('a');
    link.href = generatedPoster.url;
    link.download = `sales-conference-poster.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedPoster) return;
    try {
      // Convert the blob URL to actual blob for sharing
      const response = await fetch(generatedPoster.url);
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

  return (
    <TileWrapper className={`${generatedPoster ? '!p-0 overflow-hidden' : 'flex flex-col items-center justify-center text-center'} bg-gradient-to-br from-[#CC5500] to-[#FF9933] cursor-pointer`}>
      {generatedPoster ? (
        <div className="relative w-full h-full" onClick={onPosterClick}>
          <img
            src={generatedPoster.url}
            alt="Generated Poster"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300 flex items-end">
            <div className="w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-lg font-bold text-white">{generatedPoster.title}</h3>
              <p className="text-sm text-white/80">{generatedPoster.tagline}</p>
              <div className="flex space-x-2 mt-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleDownload}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <DownloadIcon className="w-3 h-3" />
                  <span>Download</span>
                </button>
                <button
                  onClick={handleShare}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <Share2Icon className="w-3 h-3" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div onClick={onPosterClick} className="w-full h-full flex flex-col items-center justify-center text-center">
          <FilmIcon className="w-16 h-16 text-[#B91C3C] mb-4"/>
          <h3 className="text-2xl font-bold">Your Poster</h3>
          <p className="text-[#FFD700] mt-2">Create a unique Bollywood-style poster!</p>
          <button
            className="mt-4 bg-[#B91C3C] px-4 py-2 rounded-lg font-semibold hover:bg-[#a11835] transition-colors"
          >
            Create Now
          </button>
        </div>
      )}
    </TileWrapper>
  );
};


// --- RATING TILE ---
const RatingTile: React.FC<{ session: Session | null, timeRemaining: string, conferenceState: 'before' | 'running' | 'after' }> = ({ session, timeRemaining, conferenceState }) => {
  const { user } = useUser();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sessionRated, setSessionRated] = useState<string | null>(null);

  useEffect(() => {
    // Reset feedback form when a new session starts
    if (session?.name !== sessionRated) {
      setSubmitted(false);
      setRating(0);
      setFeedback('');
    }
  }, [session, sessionRated]);

  const handleSubmit = async () => {
    if (!rating || !session || !user) return;
    setLoading(true);

    try {
      // Submit to Supabase first
      const { error } = await supabase.from('session_feedback').insert({
        registration_id: user.id,
        session_name: session.name,
        rating: rating,
        feedback: feedback
      });

      if (error) {
        console.error("Feedback submission error:", error);
        setLoading(false);
        return;
      }

      // If Supabase submission successful, send to webhook
      const webhookPayload = {
        email: user.email,
        session_name: session.name,
        rating: rating,
        feedback: feedback || '',
        timestamp: new Date().toISOString(),
        user_name: user.name,
        user_phone: user.phone,
        branch_region: user.branch_region,
        conference: "Shree Cauvery Refreshments Sales Conference 2025"
      };

      try {
        const webhookResponse = await fetch(FEEDBACK_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
          console.warn('Webhook submission failed:', await webhookResponse.text());
        } else {
          console.log('Feedback successfully sent to webhook');
        }
      } catch (webhookError) {
        console.warn('Webhook submission error:', webhookError);
        // Don't fail the entire submission if webhook fails
      }

      // Mark as successful regardless of webhook status
      setSubmitted(true);
      setSessionRated(session.name);

    } catch (error) {
      console.error("Feedback submission error:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const isActionableSession = session && session.speaker;

  return (
    <TileWrapper className="lg:col-span-3 bg-gradient-to-br from-[#5D1E3F] to-[#2C1E3A]">
      <h3 className="text-xl font-bold mb-2">Now Playing</h3>
        <AnimatePresence mode="wait">
            <motion.div key={session?.name || conferenceState} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {isActionableSession ? (
                    <div className="mb-4">
                        <h4 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-white truncate" title={session.name}>{session.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                            <div className="w-6 h-6 rounded-full bg-white/20 flex-shrink-0"></div>
                            <p className="font-semibold text-[#FFD700] truncate" title={session.speaker}>{session.speaker}</p>
                        </div>
                        <p className="text-sm mt-2 text-[#FFF5E6]/90 h-10 overflow-hidden">{session.description}</p>
                        <p className="text-xs text-right text-[#FFF5E6]/70 font-mono">Ends in: {timeRemaining}</p>
                    </div>
                ) : (
                    <div className="h-28 flex items-center justify-center">
                        <p className="text-[#FFD700] mb-4 text-lg">
                            {conferenceState === 'before' && 'Conference has not started yet.'}
                            {conferenceState === 'running' && 'Enjoy your break! The next session is coming up.'}
                            {conferenceState === 'after' && 'Conference has ended. Thank you!'}
                        </p>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
      
      {submitted ? <p className="text-[#FFD700] font-bold">Thank you for your feedback!</p> : isActionableSession ? (
      <div className="space-y-4">
        <div className={`flex space-x-2 transition-colors duration-200 ${rating > 0 || hoverRating > 0 ? 'text-[#FFD700]' : 'text-[#FF9933]'}`}>
          {[1, 2, 3, 4, 5].map(star => (
            <motion.div key={star} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
              <StarIcon
                className="w-8 h-8 cursor-pointer"
                filled={(hoverRating || rating) >= star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            </motion.div>
          ))}
        </div>
        {rating > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share Feedback (optional)..."
              className="w-full bg-[#FFF5E6]/10 p-2 rounded-md border border-[#FFF5E6]/20 focus:ring-2 focus:ring-[#FF9933] outline-none transition"
              rows={2}
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-2 bg-[#FF9933] text-[#2C1E3A] font-bold py-2 px-4 rounded-md hover:bg-[#CC5500] disabled:bg-[#FF9933]/50 flex items-center justify-center"
            >
              {loading ? <LoadingSpinner/> : 'Submit Feedback'}
            </button>
          </motion.div>
        )}
      </div>) : null}
    </TileWrapper>
  );
};

// --- MAIN HOME SCREEN ---
const HomeScreen: React.FC = () => {
  const { user } = useUser();
  const [showPosterGenerator, setShowPosterGenerator] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  
  const eventStartTime = useMemo(() => {
      // Simplified: Rely on event_start_time being present.
      // The previous fallback logic for registered_at could create timezone inconsistencies
      // with the new IST-based timestamp approach.
      return user?.event_start_time || '';
  }, [user]);

  const { currentSession, displayNextSession, countdownToNext, timeRemainingInCurrent, progress, conferenceState } = useSessionTracker(eventStartTime);
  
  if (!user) return null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CarouselTile />
        <NextSessionTile session={displayNextSession} countdown={countdownToNext} progress={progress} conferenceState={conferenceState} />
        <FaqTile onChatbotOpen={() => setShowChatbot(true)} />
        <PosterTile onPosterClick={() => setShowPosterGenerator(true)} />
        <RatingTile session={currentSession} timeRemaining={timeRemainingInCurrent} conferenceState={conferenceState} />
      </div>
      <AnimatePresence>
        {showPosterGenerator && (
            <PosterGenerator onClose={() => setShowPosterGenerator(false)} />
        )}
        {showChatbot && (
            <Chatbot onClose={() => setShowChatbot(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default HomeScreen;
