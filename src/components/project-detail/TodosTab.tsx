import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical, ListChecks, Loader2, Plus, X } from "lucide-react";
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { EmptyPanel } from "@/components/QueryState";
import type { ProjectStatus, ProjectTodo } from "@/types/project";
import { cn } from "@/lib/utils";
import { PHASES_WITH_TEMPLATES } from "./constants";

interface Props {
  todos: ProjectTodo[];
  status: ProjectStatus;
  isReadonly: boolean;
  onAdd: (title: string) => Promise<boolean>;
  onAddMany: (titles: string[]) => Promise<boolean>;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onReorder: (reordered: ProjectTodo[]) => void;
}

function SortableTodoRow({ todo, isReadonly, onToggle, onDelete }: {
  todo: ProjectTodo; isReadonly: boolean; onToggle: (done: boolean) => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id, disabled: isReadonly });
  const checkboxId = `todo-${todo.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-h-[44px] select-none items-center gap-2.5 bg-card px-3 py-2",
        isDragging && "relative z-10 shadow-[0_0_0_1px_hsl(var(--border-strong))]",
      )}
    >
      {!isReadonly && (
        <button
          type="button"
          className="-ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
          aria-label={t("project_detail.todos.drag_handle")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Checkbox id={checkboxId} checked={todo.done} onCheckedChange={v => onToggle(v === true)} disabled={isReadonly} />
      <label htmlFor={checkboxId} className={cn("flex-1 cursor-pointer text-sm", todo.done && "text-muted-foreground line-through")}>
        {todo.title}
      </label>
      {!isReadonly && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}
          aria-label={t("common.delete")}>
          <X className="!size-3.5" />
        </Button>
      )}
    </li>
  );
}

/** Phase checklist suggestion shown while the list is still empty. */
function PhaseTemplateNotice({ status, onApply, onDismiss }: {
  status: ProjectStatus; onApply: (titles: string[]) => Promise<void>; onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [applying, setApplying] = useState(false);
  const label = t(`project_detail.phase_template.phases.${status}.label`, { defaultValue: "" });
  const raw = t(`project_detail.phase_template.phases.${status}.todos`, { returnObjects: true, defaultValue: [] });
  const titles = Array.isArray(raw) ? (raw as unknown[]).filter((x): x is string => typeof x === "string") : [];
  if (!label || titles.length === 0) return null;

  const apply = async () => {
    setApplying(true);
    try { await onApply(titles); } finally { setApplying(false); }
  };

  return (
    <div className="surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <ListChecks className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("project_detail.phase_template.available", { label })}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("project_detail.phase_template.count_hint", { count: titles.length })}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={onDismiss} disabled={applying}>{t("project_detail.phase_template.dismiss")}</Button>
        <Button size="sm" variant="outline" onClick={apply} disabled={applying}>
          {applying && <Loader2 className="animate-spin" />}
          {t("project_detail.phase_template.apply")}
        </Button>
      </div>
    </div>
  );
}

export function TodosTab({ todos, status, isReadonly, onAdd, onAddMany, onToggle, onDelete, onReorder }: Props) {
  const { t } = useTranslation();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [templateDismissed, setTemplateDismissed] = useState<ProjectStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIdx = todos.findIndex(td => td.id === active.id);
    const newIdx = todos.findIndex(td => td.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) onReorder(arrayMove(todos, oldIdx, newIdx));
  };

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    const ok = await onAdd(title);
    setAdding(false);
    if (ok) setNewTitle("");
  };

  const applyTemplate = async (titles: string[]) => {
    if (await onAddMany(titles)) setTemplateDismissed(status);
  };

  const showTemplate = PHASES_WITH_TEMPLATES.includes(status) && templateDismissed !== status && !isReadonly && todos.length === 0;
  const doneCount = todos.filter(td => td.done).length;
  const pct = todos.length > 0 ? Math.round((doneCount / todos.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {showTemplate && (
        <PhaseTemplateNotice status={status} onApply={applyTemplate} onDismiss={() => setTemplateDismissed(status)} />
      )}

      {todos.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground">
            {t("project_detail.todos.progress", { done: doneCount, total: todos.length })}
          </span>
          <Progress value={pct} className="h-1.5 max-w-[200px] flex-1" />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      )}

      {todos.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={todos.map(td => td.id)} strategy={verticalListSortingStrategy}>
            <ul className="surface divide-y divide-border overflow-hidden">
              {todos.map(todo => (
                <SortableTodoRow
                  key={todo.id}
                  todo={todo}
                  isReadonly={isReadonly}
                  onToggle={done => onToggle(todo.id, done)}
                  onDelete={() => onDelete(todo.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        !showTemplate && (
          <EmptyPanel
            icon={ListChecks}
            title={t("project_detail.todos.empty_title")}
            description={isReadonly ? t("project_detail.todos.empty_archived") : t("project_detail.todos.empty_desc")}
          />
        )
      )}

      {!isReadonly && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            placeholder={t("project_detail.todos.new_placeholder")}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            aria-label={t("project_detail.todos.new_placeholder")}
          />
          <Button type="submit" variant="outline" disabled={!newTitle.trim() || adding} className="shrink-0">
            {adding ? <Loader2 className="animate-spin" /> : <Plus />}
            <span className="hidden sm:inline">{t("common.add")}</span>
          </Button>
        </form>
      )}
    </div>
  );
}
