import { useScheduling } from "@/hooks/use-scheduling";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function PoolingPage() {
  const { state, isLoading, updatePooling } = useScheduling();

  if (isLoading || !state) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Pooling Rules</h2>
        <p className="text-muted-foreground">
          Configure which days of the week associates are eligible to work. 
          These rules control dropdown visibility in the schedule view.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[250px]">Associate</TableHead>
                <TableHead>Shift Type</TableHead>
                <TableHead className="text-center">Sun-Wed Band</TableHead>
                <TableHead className="text-center">Wed-Sat Band</TableHead>
                <TableHead className="text-center">Weekend Part Time</TableHead>
                <TableHead className="text-center">Skip / Ineligible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.associates.map((assoc) => {
                const rule = state.pooling[assoc.id] || {
                  sunWed: false,
                  wedSat: false,
                  partTime: false,
                  skip: false,
                };

                return (
                  <TableRow key={assoc.id} data-testid={`row-pooling-${assoc.id}`}>
                    <TableCell className="font-medium">{assoc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-background">
                        {assoc.shiftType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={rule.sunWed}
                        onCheckedChange={(checked) => updatePooling(assoc.id, { ...rule, sunWed: !!checked })}
                        data-testid={`checkbox-sunwed-${assoc.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={rule.wedSat}
                        onCheckedChange={(checked) => updatePooling(assoc.id, { ...rule, wedSat: !!checked })}
                        data-testid={`checkbox-wedsat-${assoc.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={rule.partTime}
                        onCheckedChange={(checked) => updatePooling(assoc.id, { ...rule, partTime: !!checked })}
                        data-testid={`checkbox-parttime-${assoc.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={rule.skip}
                        onCheckedChange={(checked) => updatePooling(assoc.id, { ...rule, skip: !!checked })}
                        data-testid={`checkbox-skip-${assoc.id}`}
                      />
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
