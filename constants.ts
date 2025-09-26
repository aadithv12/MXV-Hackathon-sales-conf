import { DietaryPreference, TShirtSize, Session } from './types';

// In a real-world application, these should be stored in environment variables
// (e.g., .env.local) and accessed via `process.env.REACT_APP_SUPABASE_URL`
export const SUPABASE_URL = 'https://yfupozhxjyyuomjqynah.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdXBvemh4anl5dW9tanF5bmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NjI1MDgsImV4cCI6MjA3NDQzODUwOH0.2krGJW6zXfliuXzoIcQmOCq4ZPF2D60KBjuSN7Q8xcc';

export const BRANCH_REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia-Pacific',
  'Middle East & Africa',
];

export const TSHIRT_SIZES = Object.values(TShirtSize);
export const DIETARY_PREFERENCES = Object.values(DietaryPreference);

export const SESSIONS: Session[] = [
    { name: 'Keynote: Winning the Market in 2025', speaker: 'Rajesh Krishnamurthy', description: 'Transform your sales approach with cutting-edge strategies for the Indian market.', durationMinutes: 5 },
    { name: 'Workshop: Digital Tools for Smarter Selling', speaker: 'Priya Raghavan', description: 'Master CRM systems and AI-powered sales tools.', durationMinutes: 1 },
    { name: 'Tea Break', speaker: '', description: 'Networking and refreshments.', durationMinutes: 1 },
    { name: 'Panel: Customer-Centric Sales Strategies', speaker: 'Arjun Mehta, Sneha Patel, Vikram Singh, Anjali Desai', description: 'Industry leaders discuss building lasting customer relationships.', durationMinutes: 2 },
    { name: 'Lunch', speaker: '', description: 'Enjoy a delicious meal.', durationMinutes: 2 },
    { name: 'Session: Data-Driven Prospecting', speaker: 'Karthik Subramanian', description: 'Leverage analytics to identify and convert high-value prospects.', durationMinutes: 1 },
    { name: 'Closing: Celebrating Success', speaker: 'Meera Iyer', description: 'Recognize top performers and share inspiring success stories.', durationMinutes: 1 },
];
