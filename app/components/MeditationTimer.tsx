'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FeedbackDocument } from '@/types/feedback';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const MEDITATION_TIMES = [
  { label: '5 mins', seconds: 300 },
  { label: '10 mins', seconds: 600 },
  { label: '15 mins', seconds: 900 },
  { label: '30 mins', seconds: 1800 },
  { label: 'Custom', seconds: -1 },
];

interface MeditationType {
  name: keyof FeedbackDocument;
  description: string;
  icon: string;
  sound: string;
}

const MEDITATION_TYPES: MeditationType[] = [
  { name: 'Breathing', description: 'Focus on your breath', icon: '🌬️', sound: '/sounds/ambient-breathing.mp3' },
  { name: 'Body Scan', description: 'Awareness of physical sensations', icon: '🧘‍♀️', sound: '/sounds/ambient-body-scan.mp3' },
  { name: 'Loving-Kindness', description: 'Cultivate compassion', icon: '💝', sound: '/sounds/ambient-loving-kindness.mp3' },
  { name: 'Mindfulness', description: 'Present moment awareness', icon: '🍃', sound: '/sounds/ambient-mindfulness.mp3' },
];

const createInitialFeedback = (): FeedbackDocument => ({
  Breathing: { likes: 0, dislikes: 0 },
  'Body Scan': { likes: 0, dislikes: 0 },
  'Loving-Kindness': { likes: 0, dislikes: 0 },
  Mindfulness: { likes: 0, dislikes: 0 }
});

// Add proper type for data validation
const isValidFeedbackData = (data: unknown): data is FeedbackDocument => {
  if (!data || typeof data !== 'object') return false;
  const feedbackData = data as Partial<FeedbackDocument>;
  return Boolean(
    feedbackData.Breathing?.likes !== undefined &&
    feedbackData['Body Scan']?.likes !== undefined &&
    feedbackData['Loving-Kindness']?.likes !== undefined &&
    feedbackData.Mindfulness?.likes !== undefined
  );
};

export default function MeditationTimer() {
  const [mounted, setMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [selectedTime, setSelectedTime] = useState(MEDITATION_TIMES[0].seconds);
  const [timeLeft, setTimeLeft] = useState(MEDITATION_TIMES[0].seconds);
  const [selectedType, setSelectedType] = useState<MeditationType>(MEDITATION_TYPES[0]);
  const [volume, setVolume] = useState(0.7);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [meditationFeedback, setMeditationFeedback] = useState<FeedbackDocument>(createInitialFeedback());
  const [votedTypes, setVotedTypes] = useState<Set<string>>(new Set());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    
    try {
      // Cleanup old audio if exists
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      // Create new audio instance
      audioRef.current = new Audio(selectedType.sound);
      audioRef.current.loop = true;
      audioRef.current.volume = 0;
      
      // Preload the audio
      audioRef.current.load();
    } catch (error) {
      console.error('Error setting up audio:', error);
    }

    const currentFadeInterval = fadeInterval.current;
    
    return () => {
      if (currentFadeInterval) {
        clearInterval(currentFadeInterval);
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current = null;
        } catch (error) {
          console.error('Error cleaning up audio:', error);
        }
      }
    };
  }, [selectedType.sound, mounted]);

  const fadeIn = useCallback(() => {
    if (!audioRef.current) return;
    
    let currentVolume = 0;
    audioRef.current.volume = currentVolume;
    
    const fadeInInterval = setInterval(() => {
      currentVolume = Math.min(currentVolume + 0.05, volume);
      if (audioRef.current) {
        audioRef.current.volume = currentVolume;
      }
      
      if (currentVolume >= volume) {
        clearInterval(fadeInInterval);
      }
    }, 50);
  }, [volume]);

  const fadeOut = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!audioRef.current) {
        resolve();
        return;
      }

      let currentVolume = audioRef.current.volume;
      const fadeOutInterval = setInterval(() => {
        currentVolume = Math.max(currentVolume - 0.05, 0);
        if (audioRef.current) {
          audioRef.current.volume = currentVolume;
        }
        
        if (currentVolume <= 0) {
          clearInterval(fadeOutInterval);
          resolve();
        }
      }, 50);
    });
  }, []);

  const startMeditation = useCallback(() => {
    if (!mounted || !audioRef.current) return;
    
    setIsActive(true);
    if (volume > 0) {
      audioRef.current.play().then(() => {
        fadeIn();
      }).catch(error => {
        console.error('Error starting meditation:', error);
      });
    }
  }, [mounted, volume, fadeIn]);

  const stopMeditation = useCallback(async () => {
    if (!mounted) return;
    
    // Force stop immediately if there's no audio
    if (!audioRef.current) {
      setIsActive(false);
      setTimeLeft(selectedTime);
      return;
    }

    try {
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1000));
      await Promise.race([fadeOut(), timeoutPromise]);
    } catch (error) {
      console.error('Error in stopMeditation:', error);
    } finally {
      // Always stop the meditation, even if fadeOut fails
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (error) {
          console.error('Error stopping audio:', error);
        }
      }
      setIsActive(false);
      setTimeLeft(selectedTime);
    }
  }, [mounted, selectedTime, fadeOut]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleTypeSelection = async (type: typeof MEDITATION_TYPES[0]) => {
    try {
      if (type.name === selectedType.name) return;
      
      // Update type immediately
      setSelectedType(type);

      // Handle audio switching
      const newAudio = new Audio(type.sound);
      newAudio.loop = true;
      
      // If currently playing, switch audio with fade
      if (isActive) {
        // Start loading new audio
        await newAudio.load();
        
        // Fade out current audio
        if (audioRef.current) {
          await fadeOut();
          audioRef.current.pause();
        }
        
        // Set up new audio
        newAudio.volume = 0;
        audioRef.current = newAudio;
        
        // Play and fade in new audio
        try {
          await newAudio.play();
          fadeIn();
        } catch (error) {
          console.error('Error playing new audio:', error);
        }
      } else {
        // If not playing, just update the audio reference
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = newAudio;
        audioRef.current.volume = volume;
      }
    } catch (error) {
      console.error('Error in handleTypeSelection:', error);
    }
  };

  const handleTimeSelection = (seconds: number) => {
    if (seconds === -1) {
      setShowCustomInput(true);
      return;
    }
    setShowCustomInput(false);
    setSelectedTime(seconds);
    setTimeLeft(seconds);
    setIsActive(false);
  };

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = parseInt(customMinutes);
    if (!isNaN(minutes) && minutes > 0 && minutes <= 180) { // Max 3 hours
      const seconds = minutes * 60;
      setSelectedTime(seconds);
      setTimeLeft(seconds);
      setShowCustomInput(false);
      setCustomMinutes('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            stopMeditation();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeLeft, stopMeditation]);

  // Load global feedback on mount
  useEffect(() => {
    fetch('/api/feedback')
      .then(res => res.json())
      .then((data: unknown) => {
        if (!isValidFeedbackData(data)) {
          console.error('Invalid feedback data received:', data);
          return setMeditationFeedback(createInitialFeedback());
        }

        const feedbackData: FeedbackDocument = {
          Breathing: { 
            likes: data.Breathing.likes || 0, 
            dislikes: data.Breathing.dislikes || 0 
          },
          'Body Scan': { 
            likes: data['Body Scan'].likes || 0, 
            dislikes: data['Body Scan'].dislikes || 0 
          },
          'Loving-Kindness': { 
            likes: data['Loving-Kindness'].likes || 0, 
            dislikes: data['Loving-Kindness'].dislikes || 0 
          },
          Mindfulness: { 
            likes: data.Mindfulness.likes || 0, 
            dislikes: data.Mindfulness.dislikes || 0 
          }
        };
        setMeditationFeedback(feedbackData);
      })
      .catch(error => {
        console.error('Failed to fetch feedback:', error);
        setMeditationFeedback(createInitialFeedback());
      });
  }, []);

  const handleFeedback = async (typeName: string, isLike: boolean) => {
    if (votedTypes.has(typeName)) {
      toast.error('You have already voted for this meditation type!');
      return;
    }

    try {
      console.log('Submitting feedback:', { typeName, isLike });
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ typeName, isLike })
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server response was not JSON');
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Feedback submission failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.details || `Failed to submit feedback: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Feedback response:', data);
      
      if (!isValidFeedbackData(data)) {
        console.error('Invalid feedback data received:', data);
        throw new Error('Invalid feedback data received from server');
      }

      // Update feedback state
      setMeditationFeedback(data);
      
      // Add type to voted set and save to localStorage
      const newVotedTypes = new Set(votedTypes).add(typeName);
      setVotedTypes(newVotedTypes);
      localStorage.setItem('votedTypes', JSON.stringify([...newVotedTypes]));
      
      // Show success message
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Failed to update feedback:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.');
    }
  };

  useEffect(() => {
    console.log('Current feedback state:', meditationFeedback);
  }, [meditationFeedback]);

  // Add this useEffect to load voted types from localStorage
  useEffect(() => {
    const savedVotes = localStorage.getItem('votedTypes');
    if (savedVotes) {
      setVotedTypes(new Set(JSON.parse(savedVotes)));
    }
  }, []);

  const getFeedbackCounts = (type: keyof FeedbackDocument) => {
    return meditationFeedback[type];
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center p-12 bg-white/50 dark:bg-gray-800/50 rounded-3xl shadow-xl">
          <h1 className="text-4xl font-bold mb-2 text-gray-800 dark:text-white">ZenFlow</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Loading your peaceful space...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-4xl font-bold mb-2 text-gray-800 dark:text-white">ZenFlow</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">Find your perfect state of flow</p>

      {/* Meditation Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-10">
        {MEDITATION_TYPES.map((type) => (
          <div key={type.name} className="flex flex-col h-full">
            <button
              onClick={() => handleTypeSelection(type)}
              className={`flex-1 p-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${
                selectedType.name === type.name
                  ? 'bg-indigo-100 dark:bg-indigo-900'
                  : 'bg-white/50 dark:bg-gray-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/50'
              }`}
            >
              <span className="text-4xl mb-2">{type.icon}</span>
              <h3 className="font-semibold text-gray-800 dark:text-white">{type.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                {type.description}
              </p>
            </button>
            
            {/* Feedback Section */}
            <div className="flex justify-center gap-4 mt-2">
              <div className="relative group">
                <motion.button
                  onClick={() => handleFeedback(type.name, true)}
                  className={`flex items-center gap-1 transition-colors ${
                    votedTypes.has(type.name)
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-300 hover:text-green-500'
                  }`}
                  disabled={votedTypes.has(type.name)}
                  whileTap={{ scale: votedTypes.has(type.name) ? 1 : 0.95 }}
                >
                  👍
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={getFeedbackCounts(type.name).likes}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-sm"
                    >
                      {getFeedbackCounts(type.name).likes}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  You can only give 1 feedback per type
                </div>
              </div>
              
              <div className="relative group">
                <motion.button
                  onClick={() => handleFeedback(type.name, false)}
                  className={`flex items-center gap-1 transition-colors ${
                    votedTypes.has(type.name)
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-300 hover:text-red-500'
                  }`}
                  disabled={votedTypes.has(type.name)}
                  whileTap={{ scale: votedTypes.has(type.name) ? 1 : 0.95 }}
                >
                  👎
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={getFeedbackCounts(type.name).dislikes}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-sm"
                    >
                      {getFeedbackCounts(type.name).dislikes}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  You can only give 1 feedback per type
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timer Display */}
      <div className="relative w-80 h-80 mb-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-7xl font-light text-gray-800 dark:text-white">
            {formatTime(timeLeft)}
          </div>
        </div>
        <svg className="transform -rotate-90 w-80 h-80">
          <circle
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            r="120"
            cx="160"
            cy="160"
          />
          <circle
            className="text-blue-500 dark:text-blue-400"
            strokeWidth="6"
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="120"
            cx="160"
            cy="160"
            strokeDasharray={754}
            strokeDashoffset={754 * (1 - timeLeft / selectedTime)}
          />
        </svg>
      </div>

      {/* Time Selection with Custom Input */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="flex flex-wrap justify-center gap-3">
          {MEDITATION_TIMES.map((time) => (
            <button
              key={time.seconds}
              onClick={() => handleTimeSelection(time.seconds)}
              className={`px-6 py-3 rounded-full text-sm transition-all duration-300 ${
                selectedTime === time.seconds && !showCustomInput
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
              } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isActive}
            >
              {time.label}
            </button>
          ))}
        </div>

        {showCustomInput && (
          <form 
            onSubmit={handleCustomTimeSubmit}
            className="flex items-center gap-2"
          >
            <input
              type="number"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="Enter minutes"
              min="1"
              max="180"
              className="w-32 px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-800/70 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Set Time
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false);
                setCustomMinutes('');
              }}
              className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Simplified Sound Controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-gray-600 dark:text-gray-400">🔈</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">🔊</span>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4">
        <button
          className={`rounded-full px-8 py-4 text-white transition-all duration-300 ${
            isActive
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
          }`}
          onClick={startMeditation}
          disabled={isActive}
        >
          Begin Journey
        </button>
        
        <button
          className={`rounded-full px-8 py-4 text-white transition-all duration-300 ${
            !isActive
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-400 hover:bg-red-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
          }`}
          onClick={stopMeditation}
          disabled={!isActive}
        >
          End Session
        </button>
      </div>
    </>
  );
} 