import React, { useState } from 'react';
import OpenAI from 'openai';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, MessageSquareIcon, SendIcon, UserIcon, BotIcon } from './icons';

interface ChatbotProps {
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `
        You are "Cauvery," a friendly and helpful AI assistant for the Shree Cauvery Refreshments Sales Conference 2024.
        Your goal is to answer attendee questions clearly and concisely.
        The conference is from October 15th to 18th, 2024, at the Palace Grounds in Bengaluru.
        Keynote speakers include industry leaders from top FMCG companies.
        Topics covered are market trends, distribution strategies, and new product launches, including the new 'Sugarcane Sparkle' drink.
        Be polite, enthusiastic, and always stay on topic. Do not answer questions unrelated to the conference.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          userMessage
        ],
      });
      
      const botMessage = completion.choices[0].message;
      if (botMessage.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: botMessage.content as string }]);
      }
    } catch (error) {
      console.error("Chatbot API error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: "0%", opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-4 right-4 w-full max-w-md h-3/4 bg-gradient-to-br from-[#2C1E3A] to-[#3D2F2F] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-black/20 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <MessageSquareIcon className="w-6 h-6 text-[#FFD700]" />
          <h2 className="text-xl font-bold text-white">Conference Assistant</h2>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <XIcon className="w-6 h-6" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-yellow-500/80 flex items-center justify-center flex-shrink-0"><BotIcon className="w-5 h-5 text-white" /></div>}
              <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-sm ${msg.role === 'user' ? 'bg-[#B91C3C] text-white' : 'bg-black/30 text-white/90'}`}>
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              </div>
               {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"><UserIcon className="w-5 h-5 text-white" /></div>}
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start space-x-3">
               <div className="w-8 h-8 rounded-full bg-yellow-500/80 flex items-center justify-center flex-shrink-0"><BotIcon className="w-5 h-5 text-white" /></div>
                <div className="px-4 py-2 rounded-lg bg-black/30 text-white/90">
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse delay-0"></span>
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse delay-150"></span>
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse delay-300"></span>
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-black/20 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-transparent focus:border-yellow-500 focus:ring-0"
          />
          <button onClick={handleSend} disabled={isLoading} className="p-2 rounded-full bg-yellow-500 text-black hover:bg-yellow-400 disabled:bg-gray-500 transition-colors">
            <SendIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Chatbot;
