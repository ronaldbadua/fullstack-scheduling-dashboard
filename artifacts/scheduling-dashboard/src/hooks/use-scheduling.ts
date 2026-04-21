import { useQueryClient } from "@tanstack/react-query";
import {
  useGetState,
  useSetState,
  getGetStateQueryKey,
  SchedulingState,
  Associate,
  PoolRule,
  ShiftType,
} from "@workspace/api-client-react";

export function useScheduling() {
  const queryClient = useQueryClient();
  const { data: state, isLoading, error } = useGetState();
  const { mutateAsync: setState } = useSetState();

  const saveState = async (newState: SchedulingState) => {
    await setState({ data: newState });
    queryClient.invalidateQueries({ queryKey: getGetStateQueryKey() });
  };

  const addAssociate = async (associate: Associate) => {
    if (!state) return;
    const newState = { ...state, associates: [...state.associates, associate] };
    
    // Auto-update pooling rules based on shiftType
    const poolRule: PoolRule = {
      sunWed: associate.shiftType === "FHD",
      wedSat: associate.shiftType === "BHD",
      partTime: associate.shiftType === "Part Time",
      skip: associate.shiftType === "Vacation"
    };
    newState.pooling = { ...newState.pooling, [associate.id]: poolRule };

    await saveState(newState);
  };

  const updateAssociate = async (updatedAssociate: Associate) => {
    if (!state) return;
    const associates = state.associates.map((a) =>
      a.id === updatedAssociate.id ? updatedAssociate : a
    );
    const newState = { ...state, associates };

    // Auto-update pooling rules
    const poolRule: PoolRule = {
      sunWed: updatedAssociate.shiftType === "FHD",
      wedSat: updatedAssociate.shiftType === "BHD",
      partTime: updatedAssociate.shiftType === "Part Time",
      skip: updatedAssociate.shiftType === "Vacation"
    };
    newState.pooling = { ...newState.pooling, [updatedAssociate.id]: poolRule };

    await saveState(newState);
  };

  const deleteAssociate = async (id: string) => {
    if (!state) return;
    const associates = state.associates.filter((a) => a.id !== id);
    const newState = { ...state, associates };
    // We could clean up pooling/assignments, but simple approach is fine.
    await saveState(newState);
  };

  const updatePooling = async (associateId: string, rule: PoolRule) => {
    if (!state) return;
    const newState = {
      ...state,
      pooling: { ...state.pooling, [associateId]: rule },
    };
    await saveState(newState);
  };

  const updateAssignment = async (
    dateStr: string,
    mainId: string,
    supportId: string
  ) => {
    if (!state) return;
    const newState = { ...state };
    
    // if both are empty, delete
    if (!mainId && !supportId) {
      const { [dateStr]: _, ...rest } = newState.assignments;
      newState.assignments = rest;
    } else {
      newState.assignments = {
        ...newState.assignments,
        [dateStr]: {
          mainId,
          supportId,
          categoryMain: state.associates.find((a) => a.id === mainId)?.shiftType || "FHD",
          categorySupport: state.associates.find((a) => a.id === supportId)?.shiftType || "FHD",
        },
      };
    }
    await saveState(newState);
  };

  const updateBackup = async (dateStr: string, mainId: string, backupId: string) => {
    if (!state) return;
    const newState = { ...state };
    if (!mainId && !backupId) {
      const { [dateStr]: _, ...rest } = newState.backups;
      newState.backups = rest;
    } else {
      newState.backups = {
        ...newState.backups,
        [dateStr]: { mainId, backupId },
      };
    }
    await saveState(newState);
  };

  return {
    state,
    isLoading,
    error,
    saveState,
    addAssociate,
    updateAssociate,
    deleteAssociate,
    updatePooling,
    updateAssignment,
    updateBackup,
  };
}
