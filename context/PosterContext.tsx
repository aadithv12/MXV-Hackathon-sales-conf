import React, { createContext, useState, useContext, ReactNode } from 'react';

interface Poster {
  url: string;
  title: string;
  tagline: string;
  createdAt: string;
}

interface PosterContextType {
  generatedPoster: Poster | null;
  setGeneratedPoster: (poster: Poster | null) => void;
}

const PosterContext = createContext<PosterContextType | undefined>(undefined);

export const PosterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [generatedPoster, setGeneratedPoster] = useState<Poster | null>(null);

  return (
    <PosterContext.Provider value={{ generatedPoster, setGeneratedPoster }}>
      {children}
    </PosterContext.Provider>
  );
};

export const usePoster = () => {
  const context = useContext(PosterContext);
  if (context === undefined) {
    throw new Error('usePoster must be used within a PosterProvider');
  }
  return context;
};