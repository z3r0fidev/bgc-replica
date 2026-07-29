"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Play, Lock, Users, GripVertical } from "lucide-react";
import Image from "next/image";
import type { GalleryMedia } from "@/types/gallery";

interface SortableAlbumGridProps {
  items: GalleryMedia[];
  onReorder: (items: GalleryMedia[]) => void;
  onItemClick?: (item: GalleryMedia, index: number) => void;
  showPrivacyBadge?: boolean;
  disabled?: boolean;
}

interface SortableItemProps {
  item: GalleryMedia;
  index: number;
  onItemClick?: (item: GalleryMedia, index: number) => void;
  showPrivacyBadge?: boolean;
  disabled?: boolean;
}

function SortableItem({
  item,
  index,
  onItemClick,
  showPrivacyBadge,
  disabled,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "PRIVATE":
        return <Lock className="h-3 w-3" />;
      case "FRIENDS_ONLY":
        return <Users className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative aspect-square rounded-lg overflow-hidden cursor-pointer
        group bg-muted
        ${isDragging ? "ring-2 ring-primary shadow-lg" : ""}
      `}
      onClick={() => !isDragging && onItemClick?.(item, index)}
    >
      {/* Drag handle */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 p-1.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Thumbnail */}
      <Image
        src={item.thumbnail_url || item.url}
        alt={item.filename || "Gallery item"}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
        className="object-cover transition-transform group-hover:scale-105"
        draggable={false}
      />

      {/* Video indicator */}
      {item.type === "VIDEO" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-3 rounded-full bg-black/50 text-white">
            <Play className="h-6 w-6" fill="white" />
          </div>
          {item.duration_seconds && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs bg-black/70 text-white rounded">
              {Math.floor(item.duration_seconds / 60)}:
              {(item.duration_seconds % 60).toString().padStart(2, "0")}
            </span>
          )}
        </div>
      )}

      {/* Privacy badge */}
      {showPrivacyBadge && item.privacy !== "PUBLIC" && (
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 text-xs gap-1"
        >
          {getPrivacyIcon(item.privacy)}
          {item.privacy === "PRIVATE" ? "Private" : "Friends"}
        </Badge>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
    </div>
  );
}

function MediaItemOverlay({ item }: { item: GalleryMedia }) {
  return (
    <div className="aspect-square rounded-lg overflow-hidden shadow-2xl ring-2 ring-primary bg-muted w-[150px] relative">
      <Image
        src={item.thumbnail_url || item.url}
        alt={item.filename || "Gallery item"}
        fill
        sizes="150px"
        className="object-cover"
      />
      {item.type === "VIDEO" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-2 rounded-full bg-black/50 text-white">
            <Play className="h-4 w-4" fill="white" />
          </div>
        </div>
      )}
    </div>
  );
}

export function SortableAlbumGrid({
  items,
  onReorder,
  onItemClick,
  showPrivacyBadge = false,
  disabled = false,
}: SortableAlbumGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);
      }
    },
    [items, onReorder]
  );

  const activeItem = activeId
    ? items.find((item) => item.id === activeId)
    : null;

  if (items.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-xl">
        <p className="text-muted-foreground">This album is empty</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add some photos to get started
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              onItemClick={onItemClick}
              showPrivacyBadge={showPrivacyBadge}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? <MediaItemOverlay item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
