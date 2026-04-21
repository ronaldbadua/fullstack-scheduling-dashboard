import { format, startOfMonth } from "date-fns";
import { createContext, useContext, useState, ReactNode } from "react";

interface MonthContextType {
  month: string; // YYYY-MM format
  setMonth: (month: string) => void;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(() => format(startOfMonth(new Date()), "yyyy-MM"));

  return (
    <MonthContext.Provider value={{ month, setMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (context === undefined) {
    throw new Error("useMonth must be used within a MonthProvider");
  }
  return context;
}
