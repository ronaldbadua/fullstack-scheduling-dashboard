import { useScheduling } from "@/hooks/use-scheduling";
import { useMonth } from "@/components/month-context";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutoAssign, useGetSummary, getGetStateQueryKey, getGetSummaryQueryKey, Associate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO } from "date-fns";
import { isAssociateEligibleForDate } from "@/lib/scheduling-utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function SchedulePage() {
  const { state, isLoading, updateAssignment } = useScheduling();
  const { month } = useMonth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading: isLoadingSummary } = useGetSummary(
    { month },
    { query: { enabled: !!month, queryKey: getGetSummaryQueryKey({ month }) } }
  );

  const autoAssignMutation = useAutoAssign();

  const handleAutoAssign = async () => {
    if (!state) return;
    const hasAssignments = Object.keys(state.assignments).some((dateStr) => dateStr.startsWith(month));
    let overwrite = false;

    if (hasAssignments) {
      const confirmOverwrite = window.confirm("Assignments already exist for this month. Overwrite?");
      if (!confirmOverwrite) return;
      overwrite = true;
    }

    try {
      await autoAssignMutation.mutateAsync({ data: { month, overwrite } });
      queryClient.invalidateQueries({ queryKey: getGetStateQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey({ month }) });
      toast({ title: "Schedule auto-assigned successfully" });
    } catch (error) {
      toast({ title: "Failed to auto-assign schedule", variant: "destructive" });
    }
  };

  if (isLoading || !state) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const monthStart = startOfMonth(parseISO(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const renderAssociateSelect = (dateStr: string, isSupport: boolean, currentValue: string, otherId: string) => {
    const eligibleAssociates = state.associates.filter((assoc) => {
      if (!isAssociateEligibleForDate(assoc, state.pooling[assoc.id], dateStr)) return false;
      if (assoc.id === otherId) return false; // Cannot be both main and support
      return true;
    });

    return (
      <Select
        value={currentValue || "none"}
        onValueChange={(val) => {
          const mainId = isSupport ? state.assignments[dateStr]?.mainId || "" : (val === "none" ? "" : val);
          const supportId = isSupport ? (val === "none" ? "" : val) : state.assignments[dateStr]?.supportId || "";
          updateAssignment(dateStr, mainId, supportId);
        }}
      >
        <SelectTrigger className="w-full text-xs h-8 [&>svg]:hidden" data-testid={`select-${isSupport ? "support" : "main"}-${dateStr}`}>
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {eligibleAssociates.map((assoc) => (
            <SelectItem key={assoc.id} value={assoc.id}>
              {assoc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <MonthPicker />
        <Button 
          onClick={handleAutoAssign} 
          disabled={autoAssignMutation.isPending}
          data-testid="button-auto-assign"
        >
          {autoAssignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Auto Assign Monthly
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle>Monthly Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 text-center border-r last:border-r-0">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr">
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2 border-r border-b bg-muted/20 min-h-[120px]"></div>
                ))}
                {days.map((date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const assignment = state.assignments[dateStr];
                  const mainId = assignment?.mainId || "";
                  const supportId = assignment?.supportId || "";

                  return (
                    <div key={dateStr} className="p-2 border-r border-b flex flex-col gap-2 min-h-[120px]" data-testid={`cell-date-${dateStr}`}>
                      <div className="text-right text-xs font-semibold text-muted-foreground">
                        {format(date, "d")}
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase mb-0.5">Main</div>
                          {renderAssociateSelect(dateStr, false, mainId, supportId)}
                        </div>
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase mb-0.5">Support</div>
                          {renderAssociateSelect(dateStr, true, supportId, mainId)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSummary || !summary ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg text-center" data-testid="stat-assigned-days">
                      <div className="text-2xl font-bold text-primary">{summary.assignedDays}</div>
                      <div className="text-xs text-muted-foreground">Assigned Days</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg text-center" data-testid="stat-unassigned-days">
                      <div className="text-2xl font-bold text-destructive">{summary.unassignedDays}</div>
                      <div className="text-xs text-muted-foreground">Unassigned Days</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Associate Workload</h4>
                    <div className="space-y-2">
                      {summary.associates.map((assoc) => (
                        <div key={assoc.id} className="flex justify-between items-center text-sm" data-testid={`stat-associate-${assoc.id}`}>
                          <span className="font-medium truncate mr-2" title={assoc.name}>{assoc.name}</span>
                          <div className="flex gap-2 text-xs">
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">M:{assoc.mainCount}</span>
                            <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded font-mono">S:{assoc.supportCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
