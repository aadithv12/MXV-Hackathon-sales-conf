import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { SESSIONS } from '../constants';

interface SessionFeedback {
  id: string;
  registration_id: string;
  session_name: string;
  rating: number;
  feedback: string;
  submitted_at: string;
}

interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  emotion: string;
  score: number;
  keywords: string[];
}

interface SessionStats {
  sessionName: string;
  totalResponses: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
  comments: string[];
  sentimentAnalysis: {
    overall: 'positive' | 'negative' | 'neutral';
    emotions: { [key: string]: number };
    commonKeywords: { word: string; count: number }[];
    commentAnalysis: { comment: string; analysis: SentimentAnalysis }[];
  };
}

interface BackendPortalProps {
  onClose: () => void;
}

// Sentiment Analysis Functions
const emotionKeywords = {
  excited: ['amazing', 'fantastic', 'awesome', 'incredible', 'outstanding', 'excellent', 'brilliant', 'superb', 'wonderful', 'thrilled', 'excited', 'love', 'loved'],
  happy: ['good', 'great', 'nice', 'pleased', 'satisfied', 'happy', 'glad', 'enjoyed', 'appreciate', 'positive', 'thank', 'thanks'],
  impressed: ['impressed', 'impressive', 'professional', 'insightful', 'valuable', 'useful', 'helpful', 'informative', 'learned', 'educational'],
  neutral: ['okay', 'fine', 'average', 'normal', 'standard', 'regular', 'typical', 'usual'],
  concerned: ['concerned', 'worried', 'confused', 'unclear', 'difficult', 'challenging', 'issues', 'problems', 'questions'],
  disappointed: ['disappointed', 'bad', 'poor', 'terrible', 'awful', 'horrible', 'waste', 'boring', 'dull', 'useless'],
  frustrated: ['frustrated', 'annoying', 'annoyed', 'irritated', 'angry', 'mad', 'upset', 'hate', 'dislike']
};

const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 'perfect', 'outstanding', 'brilliant', 'superb', 'impressive', 'helpful', 'useful', 'valuable', 'informative', 'professional', 'clear', 'engaging', 'interesting', 'love', 'like', 'enjoy', 'appreciate', 'thank', 'thanks'];
const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointing', 'boring', 'confusing', 'unclear', 'difficult', 'problems', 'issues', 'waste', 'useless', 'hate', 'dislike', 'frustrated', 'annoying', 'disappointed'];

const analyzeSentiment = (text: string): SentimentAnalysis => {
  const words = text.toLowerCase().split(/\s+/);
  const cleanWords = words.map(word => word.replace(/[^\w]/g, ''));

  let positiveScore = 0;
  let negativeScore = 0;
  let detectedEmotion = 'neutral';
  let emotionScore = 0;

  // Count positive and negative words
  cleanWords.forEach(word => {
    if (positiveWords.includes(word)) positiveScore++;
    if (negativeWords.includes(word)) negativeScore++;
  });

  // Detect emotions
  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    const matches = keywords.filter(keyword => cleanWords.some(word => word.includes(keyword))).length;
    if (matches > emotionScore) {
      emotionScore = matches;
      detectedEmotion = emotion;
    }
  });

  // Determine overall sentiment
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (positiveScore > negativeScore) sentiment = 'positive';
  else if (negativeScore > positiveScore) sentiment = 'negative';

  // Extract keywords (remove common words)
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'];
  const keywords = cleanWords
    .filter(word => word.length > 2 && !commonWords.includes(word))
    .slice(0, 5);

  return {
    sentiment,
    emotion: detectedEmotion,
    score: positiveScore - negativeScore,
    keywords
  };
};

const analyzeSentiments = (comments: string[]) => {
  if (comments.length === 0) {
    return {
      overall: 'neutral' as const,
      emotions: {},
      commonKeywords: [],
      commentAnalysis: []
    };
  }

  const analyses = comments.map(comment => ({
    comment,
    analysis: analyzeSentiment(comment)
  }));

  // Calculate overall sentiment
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
  analyses.forEach(({ analysis }) => {
    sentimentCounts[analysis.sentiment]++;
  });

  let overall: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (sentimentCounts.positive > sentimentCounts.negative && sentimentCounts.positive > sentimentCounts.neutral) {
    overall = 'positive';
  } else if (sentimentCounts.negative > sentimentCounts.positive && sentimentCounts.negative > sentimentCounts.neutral) {
    overall = 'negative';
  }

  // Count emotions
  const emotions: { [key: string]: number } = {};
  analyses.forEach(({ analysis }) => {
    emotions[analysis.emotion] = (emotions[analysis.emotion] || 0) + 1;
  });

  // Extract common keywords
  const allKeywords: { [key: string]: number } = {};
  analyses.forEach(({ analysis }) => {
    analysis.keywords.forEach(keyword => {
      allKeywords[keyword] = (allKeywords[keyword] || 0) + 1;
    });
  });

  const commonKeywords = Object.entries(allKeywords)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  return {
    overall,
    emotions,
    commonKeywords,
    commentAnalysis: analyses
  };
};

const BackendPortal: React.FC<BackendPortalProps> = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [sessionStats, setSessionStats] = useState<SessionStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'namma cauvery') {
      setIsAuthenticated(true);
      setPasswordError('');
      fetchFeedbackData();
    } else {
      setPasswordError('Invalid password');
    }
  };

  const fetchFeedbackData = async () => {
    setLoading(true);
    try {
      // Try a simple query first
      const { data: feedbackData, error } = await supabase
        .from('session_feedback')
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        throw error;
      }

      console.log('Raw feedback data:', feedbackData);
      console.log('Available sessions:', SESSIONS.map(s => s.name));

      // Process data for each session
      const stats: SessionStats[] = SESSIONS.map(session => {
        const sessionFeedback = feedbackData?.filter(f => f.session_name.trim() === session.name.trim()) || [];
        console.log(`Session "${session.name}" feedback count:`, sessionFeedback.length);

        // Debug exact string comparison
        if (feedbackData) {
          const dbSessionNames = feedbackData.map(f => f.session_name);
          console.log(`Database session names:`, dbSessionNames);
          console.log(`Looking for: "${session.name}"`);
          console.log(`Trimmed matches:`, feedbackData.filter(f => f.session_name.trim() === session.name.trim()));
        }

        const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
          rating,
          count: sessionFeedback.filter(f => f.rating === rating).length
        }));

        const averageRating = sessionFeedback.length > 0
          ? sessionFeedback.reduce((sum, f) => sum + f.rating, 0) / sessionFeedback.length
          : 0;

        const comments = sessionFeedback
          .filter(f => f.feedback && f.feedback.trim())
          .map(f => f.feedback);

        const sentimentAnalysis = analyzeSentiments(comments);

        return {
          sessionName: session.name,
          totalResponses: sessionFeedback.length,
          averageRating: Math.round(averageRating * 100) / 100,
          ratingDistribution,
          comments,
          sentimentAnalysis
        };
      });

      console.log('Processed stats:', stats);
      setSessionStats(stats);
    } catch (error) {
      console.error('Error fetching feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
    return colors[rating - 1] || '#6b7280';
  };

  const getAverageRatingColor = (avg: number) => {
    if (avg >= 4.5) return 'text-green-500';
    if (avg >= 4) return 'text-lime-500';
    if (avg >= 3.5) return 'text-yellow-500';
    if (avg >= 3) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSentimentColor = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSentimentBgColor = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 border-green-300';
      case 'negative': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: { [key: string]: string } = {
      excited: '🤩',
      happy: '😊',
      impressed: '👏',
      neutral: '😐',
      concerned: '😟',
      disappointed: '😞',
      frustrated: '😤'
    };
    return emojiMap[emotion] || '😐';
  };

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Backend Portal Access</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter backend password"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Access Portal
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-blue-100 mt-1">Session Feedback & Ratings Overview</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-300 transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Debug Section - Remove this after fixing */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">Debug Information</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Total raw feedback records:</strong> {sessionStats.reduce((sum, s) => sum + s.totalResponses, 0)}</p>
                  <p><strong>Sessions with feedback:</strong> {sessionStats.filter(s => s.totalResponses > 0).length}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-yellow-700">View all feedback from database</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify({
                        allFeedback: sessionStats.reduce((acc, session) => {
                          if (session.totalResponses > 0) {
                            acc[session.sessionName] = {
                              responses: session.totalResponses,
                              avgRating: session.averageRating,
                              comments: session.comments
                            };
                          }
                          return acc;
                        }, {} as any),
                        rawStats: sessionStats.map(s => ({
                          session: s.sessionName,
                          responses: s.totalResponses,
                          avgRating: s.averageRating
                        }))
                      }, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold">Total Sessions</h3>
                  <p className="text-3xl font-bold">{sessionStats.filter(s => s.totalResponses > 0).length}</p>
                  <p className="text-sm opacity-90">with feedback</p>
                </div>
                <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold">Total Responses</h3>
                  <p className="text-3xl font-bold">{sessionStats.reduce((sum, s) => sum + s.totalResponses, 0)}</p>
                  <p className="text-sm opacity-90">feedback submissions</p>
                </div>
                <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold">Overall Rating</h3>
                  <p className="text-3xl font-bold">
                    {sessionStats.length > 0
                      ? (sessionStats.reduce((sum, s) => sum + (s.averageRating * s.totalResponses), 0) /
                         sessionStats.reduce((sum, s) => sum + s.totalResponses, 0) || 0).toFixed(1)
                      : '0.0'}
                  </p>
                  <p className="text-sm opacity-90">average rating</p>
                </div>
                <div className="bg-gradient-to-r from-indigo-400 to-purple-500 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold">Overall Sentiment</h3>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const allSentiments = sessionStats.filter(s => s.comments.length > 0);
                      if (allSentiments.length === 0) return '😐 Neutral';

                      const sentimentCounts = allSentiments.reduce((acc, session) => {
                        acc[session.sentimentAnalysis.overall]++;
                        return acc;
                      }, { positive: 0, negative: 0, neutral: 0 });

                      const dominant = Object.entries(sentimentCounts).sort(([,a], [,b]) => b - a)[0][0];
                      const emoji = dominant === 'positive' ? '😊' : dominant === 'negative' ? '😞' : '😐';
                      return `${emoji} ${dominant.charAt(0).toUpperCase() + dominant.slice(1)}`;
                    })()}
                  </p>
                  <p className="text-sm opacity-90">from comments</p>
                </div>
              </div>

              {/* Session Details */}
              <div className="space-y-6">
                {sessionStats.filter(stat => stat.totalResponses > 0).map((stat, index) => (
                  <motion.div
                    key={stat.sessionName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-xl p-6 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{stat.sessionName}</h3>
                        <p className="text-gray-600">{stat.totalResponses} responses</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getAverageRatingColor(stat.averageRating)}`}>
                          {stat.averageRating}/5.0
                        </p>
                        <p className="text-sm text-gray-500">avg rating</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Rating Distribution Chart */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Rating Distribution</h4>
                        <div className="space-y-2">
                          {stat.ratingDistribution.reverse().map(({ rating, count }) => (
                            <div key={rating} className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1 w-12">
                                <span className="text-sm font-medium">{rating}</span>
                                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${stat.totalResponses > 0 ? (count / stat.totalResponses) * 100 : 0}%`,
                                      backgroundColor: getRatingColor(rating)
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm font-medium w-8">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sentiment Analysis */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Sentiment Analysis</h4>
                        {stat.comments.length > 0 ? (
                          <div className="space-y-3">
                            {/* Overall Sentiment */}
                            <div className={`p-3 rounded-lg border ${getSentimentBgColor(stat.sentimentAnalysis.overall)}`}>
                              <div className="flex items-center space-x-2">
                                <span className="text-2xl">
                                  {stat.sentimentAnalysis.overall === 'positive' ? '😊' :
                                   stat.sentimentAnalysis.overall === 'negative' ? '😞' : '😐'}
                                </span>
                                <div>
                                  <p className={`font-semibold ${getSentimentColor(stat.sentimentAnalysis.overall)}`}>
                                    {stat.sentimentAnalysis.overall.toUpperCase()}
                                  </p>
                                  <p className="text-xs text-gray-600">Overall sentiment</p>
                                </div>
                              </div>
                            </div>

                            {/* Emotions */}
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">Detected Emotions:</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(stat.sentimentAnalysis.emotions).map(([emotion, count]) => (
                                  <div key={emotion} className="flex items-center space-x-1 bg-white px-2 py-1 rounded-full border text-xs">
                                    <span>{getEmotionEmoji(emotion)}</span>
                                    <span className="capitalize">{emotion}</span>
                                    <span className="bg-gray-200 rounded-full px-1 text-xs">{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Keywords */}
                            {stat.sentimentAnalysis.commonKeywords.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">Common Keywords:</p>
                                <div className="flex flex-wrap gap-1">
                                  {stat.sentimentAnalysis.commonKeywords.slice(0, 8).map(({ word, count }) => (
                                    <span key={word} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                      {word} ({count})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">No comments to analyze</p>
                        )}
                      </div>

                      {/* Comments with Sentiment */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">
                          Comments ({stat.comments.length})
                        </h4>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {stat.sentimentAnalysis.commentAnalysis.length > 0 ? (
                            stat.sentimentAnalysis.commentAnalysis.map(({ comment, analysis }, idx) => (
                              <div key={idx} className={`p-3 rounded-lg border ${getSentimentBgColor(analysis.sentiment)}`}>
                                <div className="flex items-start space-x-2 mb-1">
                                  <span className="text-sm">{getEmotionEmoji(analysis.emotion)}</span>
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-700">{comment}</p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className={`text-xs font-medium ${getSentimentColor(analysis.sentiment)}`}>
                                        {analysis.sentiment}
                                      </span>
                                      <span className="text-xs text-gray-500">•</span>
                                      <span className="text-xs text-gray-500 capitalize">{analysis.emotion}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm italic">No comments yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {sessionStats.filter(stat => stat.totalResponses > 0).length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-24 h-24 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zM4 19V8h16v11H4z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Feedback Yet</h3>
                  <p className="text-gray-500">Session feedback will appear here once users start rating sessions.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BackendPortal;