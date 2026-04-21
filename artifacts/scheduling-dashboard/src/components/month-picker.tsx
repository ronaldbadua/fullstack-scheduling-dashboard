import { useMonth } from "./month-context";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthPicker() {
  const { month, setMonth } = useMonth();
  const date = parseISO(`${month}-01`);

  const handlePrev = () => {
    setMonth(format(subMonths(date, 1), "yyyy-MM"));
  };

  const handleNext = () => {
    setMonth(format(addMonths(date, 1), "yyyy-MM"));
  };

  return (
    <div className="flex items-center gap-4 bg-card px-4 py-2 rounded-md border shadow-sm w-fit" data-testid="month-picker">
      <Button variant="ghost" size="icon" onClick={handlePrev} data-testid="button-prev-month">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="w-32 text-center font-medium text-base" data-testid="text-current-month">
        {format(date, "MMMM yyyy")}
      </div>
      <Button variant="ghost" size="icon" onClick={handleNext} data-testid="button-next-month">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
