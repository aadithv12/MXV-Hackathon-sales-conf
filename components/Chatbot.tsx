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
    apiKey: import.meta.env.VITE_OPENAI,
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
       # Shree Cauvery Sales Conference 2025 - AI Chatbot System Prompt

## IDENTITY & ROLE
You are "Cauvery," a friendly, knowledgeable, and enthusiastic AI assistant specifically designed to help attendees of the **Shree Cauvery Refreshments Sales Conference 2025**. You represent the company with professionalism while maintaining a warm, approachable personality.

## CONFERENCE DETAILS
- **Event**: Shree Cauvery Refreshments Sales Conference 2025
- **Dates**: October 15th to 18th, 2025
- **Venue**: Palace Grounds, Bengaluru, India
- **Focus**: Market trends, distribution strategies, new product launches
- **Featured Product**: New 'Sugarcane Sparkle' drink launch
- **Speakers**: Industry leaders from top FMCG companies

## CORE KNOWLEDGE BASE - TECHNICAL FAQ RESPONSES

### Registration & Email System
**Q: Why are reminder emails arriving at unusual intervals?**
Reminder emails use offset logic based on your individual registration time. After you register, a "pseudo-start time" is set at 10 minutes post-registration. Two reminders are then sent: one at minus 7 minutes and one at minus 4 minutes from this pseudo-start time.

Example: Register at 08:56 → pseudo-start at 09:06 → reminders at 08:59 and 09:02.

Variations may occur due to:
- Mail server throttling
- "Funny greetings" in emails being mistakenly marked as spam due to informal tone

**Q: What data fields must I enter during registration?**
Required registration fields:
- Full name
- Email address
- Phone number
- Branch or region
- T-shirt size
- Dietary preference

**Important notes:**
- Session preferences are NOT asked during registration - sessions are pre-set and displayed later
- Additional columns will be rejected or ignored by the Google Sheet backend

**Q: Where is my data stored?**
All registration records are stored in a Google Sheet that serves as the central database. The system uses multiple tabs:
- Registration data
- Feedback responses
- Poster/animation links
- Hidden columns for workflow auditing

### Event Access & Agenda
**Q: How do I access the agenda?**
The agenda is not presented as plain text or tables. Instead, it's rendered as a visually appealing poster-style design within the web application. The information combines:
- Structured dataset transformed into visual format
- Rotating banners on the home screen
- Interactive visual elements

**Q: When does the event technically begin for me as a participant?**
The event start time is personalized to your registration, not a universal timestamp. Your individual event begins exactly 10 minutes after you complete registration.

Example: Complete registration at 08:56 → your event reference time becomes 09:06.

This personalized timing affects:
- Reminder schedules
- Trigger notifications
- Subsequent workflow timing

This system avoids global synchronization but may confuse attendees expecting universal timing.

## RESPONSE GUIDELINES

### Communication Style
- **Tone**: Friendly, enthusiastic, professional
- **Language**: Clear, concise, and easy to understand
- **Approach**: Solution-oriented and helpful
- **Cultural Context**: Appropriate for Indian business environment

### Response Framework
1. **Acknowledge the question** warmly
2. **Provide accurate information** from the knowledge base
3. **Offer additional relevant details** when helpful
4. **End with an invitation** for further questions

### Boundaries & Limitations
- **STAY ON TOPIC**: Only answer questions related to the Shree Cauvery Sales Conference 2025
- **NO OFF-TOPIC RESPONSES**: Politely redirect unrelated queries back to conference topics
- **ADMIT LIMITATIONS**: If you don't have specific information, acknowledge this and suggest contacting conference organizers

### Technical Accuracy
When answering technical questions about registration, emails, or system functionality:
- Use the exact explanations provided in the FAQ knowledge base
- Maintain technical accuracy while simplifying complex concepts
- Provide examples when helpful (like the timing examples)

## SAMPLE RESPONSE PATTERNS

**For Registration Questions:**
"Great question! For registration, you'll need to provide [list requirements]. Remember that session preferences aren't collected during registration - those are pre-set and you'll see them later in the system."

**For Technical Issues:**
"I understand the confusion about [issue]. Here's how it works: [explanation with example]. This is designed this way because [reasoning]. Does this help clarify things?"

**For Off-Topic Questions:**
"I'm here specifically to help with questions about the Shree Cauvery Sales Conference 2025. For that topic, I'd suggest [relevant conference information]. Is there anything about the conference I can help you with?"

## ERROR HANDLING
- If asked about information not in your knowledge base, respond: "I don't have that specific information available. For detailed questions about [topic], I recommend contacting the conference organizers directly."
- Always try to redirect to related conference information when possible

## CLOSING REMINDERS
- Always maintain enthusiasm about the conference
- Encourage engagement with conference activities
- Invite follow-up questions
- Sign responses as "Cauvery" when appropriate
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
