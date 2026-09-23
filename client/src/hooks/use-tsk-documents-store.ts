import { useCallback, useEffect, useState } from "react";
import {
  createEmptyStore,
  getActiveProject,
  loadDocumentsStore,
  saveDocumentsStore,
  upsertProject,
} from "@/lib/tsk-documents/storage";
import { createProject, touchProject } from "@/lib/tsk-documents/project-factory";
import { nextDocumentNumber } from "@/lib/tsk-documents/numbering";
import { applyWorkflowAction, type WorkflowAction } from "@/lib/tsk-documents/workflow";
import type {
  TskDocumentKind,
  TskDocumentsStore,
  TskOrgSettings,
  TskProject,
} from "@/lib/tsk-documents/types";

export function useTskDocumentsStore() {
  const [store, setStore] = useState<TskDocumentsStore>(() => createEmptyStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadDocumentsStore();
    if (loaded.projects.length === 0) {
      const demo = createProject(loaded.settings);
      const withDemo = upsertProject(loaded, demo);
      setStore(withDemo);
    } else {
      setStore(loaded);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDocumentsStore(store);
  }, [store, hydrated]);

  const activeProject = getActiveProject(store);

  const setSettings = useCallback((settings: TskOrgSettings) => {
    setStore((prev) => ({ ...prev, settings }));
  }, []);

  const setActiveProjectId = useCallback((id: string | null) => {
    setStore((prev) => ({ ...prev, activeProjectId: id }));
  }, []);

  const saveProject = useCallback((project: TskProject) => {
    setStore((prev) => upsertProject(prev, touchProject(project)));
  }, []);

  const createNewProject = useCallback(() => {
    const project = createProject(store.settings);
    setStore((prev) => upsertProject(prev, project));
  }, [store.settings]);

  const runWorkflow = useCallback(
    (action: WorkflowAction): { project: TskProject; docKind?: TskDocumentKind } | null => {
      if (!activeProject) return null;
      const result = applyWorkflowAction(activeProject, store.counters, action);
      setStore((prev) =>
        upsertProject({ ...prev, counters: result.counters }, result.project),
      );
      return { project: result.project, docKind: result.docKind };
    },
    [activeProject, store.counters],
  );

  const ensureCgvNumber = useCallback((): TskOrgSettings => {
    if (store.settings.cgvNumber) return store.settings;
    const { number, counters } = nextDocumentNumber("cgv", store.counters);
    const settings = { ...store.settings, cgvNumber: number };
    setStore((prev) => ({ ...prev, settings, counters }));
    return settings;
  }, [store.settings, store.counters]);

  const deleteProject = useCallback((id: string) => {
    setStore((prev) => {
      const projects = prev.projects.filter((p) => p.id !== id);
      const activeProjectId =
        prev.activeProjectId === id ? projects[0]?.id ?? null : prev.activeProjectId;
      return { ...prev, projects, activeProjectId };
    });
  }, []);

  return {
    store,
    hydrated,
    activeProject,
    setSettings,
    setActiveProjectId,
    saveProject,
    createNewProject,
    runWorkflow,
    ensureCgvNumber,
    deleteProject,
  };
}
