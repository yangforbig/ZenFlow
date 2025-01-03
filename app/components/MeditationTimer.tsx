'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MEDITATION_TIMES = [
  { label: '5 mins', seconds: 300 },
  { label: '10 mins', seconds: 600 },
  { label: '15 mins', seconds: 900 },
  { label: '30 mins', seconds: 1800 },
  { label: 'Custom', seconds: -1 },
];

const MEDITATION_TYPES = [
  { name: 'Breathing', description: 'Focus on your breath', icon: '🌬️', sound: '/sounds/ambient-breathing.mp3' },
  { name: 'Body Scan', description: 'Awareness of physical sensations', icon: '🧘‍♀️', sound: '/sounds/ambient-body-scan.mp3' },
  { name: 'Loving-Kindness', description: 'Cultivate compassion', icon: '💝', sound: '/sounds/ambient-loving-kindness.mp3' },
  { name: 'Mindfulness', description: 'Present moment awareness', icon: '🍃', sound: '/sounds/ambient-mindfulness.mp3' },
];

const STORAGE_KEY = 'zenflow_meditation_feedback';

const createInitialFeedback = () => {
  const feedback: {[key: string]: {likes: number, dislikes: number}} = {};
  MEDITATION_TYPES.forEach(type => {
    feedback[type.name] = { likes: 0, dislikes: 0 };
  });
  return feedback;
};

export default function MeditationTimer() {
  const [mounted, setMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [selectedTime, setSelectedTime] = useState(MEDITATION_TIMES[0].seconds);
  const [timeLeft, setTimeLeft] = useState(MEDITATION_TIMES[0].seconds);
  const [selectedType, setSelectedType] = useState(MEDITATION_TYPES[0]);
  const [volume, setVolume] = useState(0.7);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [meditationFeedback, setMeditationFeedback] = useState(createInitialFeedback);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    
    audioRef.current = new Audio(selectedType.sound);
    audioRef.current.loop = true;
    audioRef.current.volume = 0;

    return () => {
      if (fadeInterval.current) {
        clearInterval(fadeInterval.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fadeIn = () => {
    if (!audioRef.current) return;
    
    audioRef.current.volume = 0;
    audioRef.current.play();
    
    let currentVolume = 0;
    fadeInterval.current = setInterval(() => {
      currentVolume = Math.min(currentVolume + 0.05, volume);
      if (audioRef.current) {
        audioRef.current.volume = currentVolume;
      }
      
      if (currentVolume >= volume) {
        if (fadeInterval.current) clearInterval(fadeInterval.current);
      }
    }, 100);
  };

  const fadeOut = () => {
    return new Promise<void>((resolve) => {
      if (!audioRef.current) {
        resolve();
        return;
      }

      let currentVolume = audioRef.current.volume;
      fadeInterval.current = setInterval(() => {
        currentVolume = Math.max(currentVolume - 0.05, 0);
        if (audioRef.current) {
          audioRef.current.volume = currentVolume;
        }
        
        if (currentVolume <= 0) {
          if (fadeInterval.current) clearInterval(fadeInterval.current);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          resolve();
        }
      }, 100);
    });
  };

  const startMeditation = useCallback(() => {
    if (!mounted) return;
    setIsActive(true);
    if (audioRef.current && volume > 0) {
      fadeIn();
    }
  }, [mounted, volume]);

  const stopMeditation = useCallback(async () => {
    if (!mounted) return;
    await fadeOut();
    setIsActive(false);
    setTimeLeft(selectedTime);
  }, [mounted, selectedTime]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleTypeSelection = async (type: typeof MEDITATION_TYPES[0]) => {
    if (isActive) {
      await fadeOut();
    }
    
    setSelectedType(type);
    if (audioRef.current) {
      audioRef.current.src = type.sound;
      audioRef.current.loop = true;
      
      if (isActive && volume > 0) {
        fadeIn();
      }
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
            // Stop meditation when time is up
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
  }, [isActive, timeLeft]);

  // Load global feedback on mount
  useEffect(() => {
    fetch('/api/feedback')
      .then(res => res.json())
      .then(data => {
        const feedbackData = Object.fromEntries(
          Object.entries(data).filter(([key]) => key !== '_id')
        );
        setMeditationFeedback(feedbackData);
      })
      .catch(console.error);
  }, []);

  const handleFeedback = async (typeName: string, isLike: boolean) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typeName, isLike })
      });
      
      const data = await response.json();
      const feedbackData = Object.fromEntries(
        Object.entries(data).filter(([key]) => key !== '_id')
      );
      setMeditationFeedback(feedbackData);
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
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
              className={`flex-1 p-4 rounded-2xl transition-all duration-300 flex flex-col items-center text-center ${
                selectedType.name === type.name
                  ? 'bg-white dark:bg-gray-800 shadow-lg scale-105'
                  : 'bg-white/50 dark:bg-gray-800/50 hover:scale-102'
              }`}
            >
              <div className="text-3xl mb-2">{type.icon}</div>
              <div className="font-medium text-gray-800 dark:text-white">{type.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 flex-1">{type.description}</div>
            </button>
            
            {/* Feedback Buttons */}
            <div className="flex justify-center gap-4 mt-2">
              <button
                onClick={() => handleFeedback(type.name, true)}
                className="group flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"
              >
                <span className="text-lg">👍</span>
                <span className="text-sm">{meditationFeedback[type.name].likes}</span>
              </button>
              <button
                onClick={() => handleFeedback(type.name, false)}
                className="group flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <span className="text-lg">👎</span>
                <span className="text-sm">{meditationFeedback[type.name].dislikes}</span>
              </button>
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