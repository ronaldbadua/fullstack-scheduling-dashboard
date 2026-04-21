import { useScheduling } from "@/hooks/use-scheduling";
import { useMonth } from "@/components/month-context";
import { MonthPicker } from "@/components/month-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO } from "date-fns";

export default function BackupPage() {
  const { state, isLoading, updateBackup } = useScheduling();
  const { month } = useMonth();

  if (isLoading || !state) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  const monthStart = startOfMonth(parseISO(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const activeAssociates = state.associates.filter(a => a.active && a.shiftType !== "Vacation");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Daily Backups</h2>
          <p className="text-muted-foreground">Assign main and backup coverage for each day of the month.</p>
        </div>
        <MonthPicker />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead className="w-[100px]">Day</TableHead>
                <TableHead>Main</TableHead>
                <TableHead>Backup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const backupInfo = state.backups[dateStr];
                const mainId = backupInfo?.mainId || "";
                const backupId = backupInfo?.backupId || "";

                return (
                  <TableRow key={dateStr} data-testid={`row-backup-${dateStr}`}>
                    <TableCell className="font-medium font-mono text-sm">
                      {format(date, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(date, "EEEE")}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mainId || "none"}
                        onValueChange={(val) => {
                          const mId = val === "none" ? "" : val;
                          updateBackup(dateStr, mId, backupId);
                        }}
                      >
                        <SelectTrigger className="w-[200px]" data-testid={`select-backup-main-${dateStr}`}>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {activeAssociates
                            .filter(a => a.id !== backupId)
                            .map((assoc) => (
                              <SelectItem key={assoc.id} value={assoc.id}>
                                {assoc.name} ({assoc.shiftType})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={backupId || "none"}
                        onValueChange={(val) => {
                          const bId = val === "none" ? "" : val;
                          updateBackup(dateStr, mainId, bId);
                        }}
                      >
                        <SelectTrigger className="w-[200px]" data-testid={`select-backup-sub-${dateStr}`}>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {activeAssociates
                            .filter(a => a.id !== mainId)
                            .map((assoc) => (
                              <SelectItem key={assoc.id} value={assoc.id}>
                                {assoc.name} ({assoc.shiftType})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
