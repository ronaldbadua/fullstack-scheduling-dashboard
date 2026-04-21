import { useScheduling } from "@/hooks/use-scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Associate, ShiftType } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function AssociatesPage() {
  const { state, isLoading, addAssociate, updateAssociate, deleteAssociate } = useScheduling();
  const [newName, setNewName] = useState("");
  const [newShiftType, setNewShiftType] = useState<ShiftType>("FHD");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newAssoc: Associate = {
      id: uuidv4(),
      name: newName.trim(),
      shiftType: newShiftType,
      active: true,
    };
    addAssociate(newAssoc);
    setNewName("");
  };

  if (isLoading || !state) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Associate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter associate name"
                data-testid="input-new-associate-name"
              />
            </div>
            <div className="w-48 space-y-2">
              <label className="text-sm font-medium">Shift Type</label>
              <Select value={newShiftType} onValueChange={(val: ShiftType) => setNewShiftType(val)}>
                <SelectTrigger data-testid="select-new-associate-shift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FHD">FHD</SelectItem>
                  <SelectItem value="BHD">BHD</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                  <SelectItem value="Vacation">Vacation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} data-testid="button-add-associate">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Associates List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Shift Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.associates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No associates found.
                  </TableCell>
                </TableRow>
              ) : (
                state.associates.map((assoc) => (
                  <TableRow key={assoc.id} data-testid={`row-associate-${assoc.id}`}>
                    <TableCell>
                      <Input
                        value={assoc.name}
                        onChange={(e) => updateAssociate({ ...assoc, name: e.target.value })}
                        className="max-w-[250px]"
                        data-testid={`input-name-${assoc.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={assoc.shiftType}
                        onValueChange={(val: ShiftType) => updateAssociate({ ...assoc, shiftType: val })}
                      >
                        <SelectTrigger className="w-[150px]" data-testid={`select-shift-${assoc.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FHD">FHD</SelectItem>
                          <SelectItem value="BHD">BHD</SelectItem>
                          <SelectItem value="Part Time">Part Time</SelectItem>
                          <SelectItem value="Vacation">Vacation</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={assoc.active}
                        onCheckedChange={(checked) => updateAssociate({ ...assoc, active: checked })}
                        data-testid={`switch-active-${assoc.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAssociate(assoc.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        data-testid={`button-delete-${assoc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
