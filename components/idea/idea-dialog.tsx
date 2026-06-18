import { cn } from "@/lib/utils";
import { IdeaType } from "@/types/idea.type";
import { ImageObject } from "@/types/post.type";
import { Shapes, Wand2, Image } from "lucide-react";
import { useEffect, useState } from "react";
import ContentTextarea from "../content-textarea";
import { AIAssistant } from "../schedule/ai-assitant";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import { ActionTabType } from "@/types/common.type";
import MediaList from "../schedule/media-list";

type IdeaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea?: IdeaType;
  selectedColumnId: string;
  isSaving?: boolean;
  onSave: (idea: IdeaType) => void;
  columns?: { id: string; title: string }[];
};

const IdeaDialog = ({
  open,
  onOpenChange,
  idea,
  selectedColumnId,
  isSaving,
  columns,
  onSave,
}: IdeaDialogProps) => {
  const isEdit = !!idea?.id;
  const [title, setTitle] = useState(idea?.title ?? "");
  const [description, setDescription] = useState(idea?.description ?? "");
  const [images, setImages] = useState<ImageObject[]>(idea?.images ?? []);
  const [selectedColumn, setSelectedColumn] = useState(
    idea?.columnId ?? selectedColumnId,
  );
  const [showRightTab, setShowRightTab] = useState<ActionTabType | null>(null);
  const rightTabs = [
    { id: "ai" as ActionTabType, label: "AI Assistant", icon: Wand2 },
    { id: "media" as ActionTabType, label: "Media", icon: Image },
  ];

  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(idea?.title ?? "");
    setDescription(idea?.description ?? "");
    setImages(idea?.images ?? []);
    setSelectedColumn(idea?.columnId ?? selectedColumnId);
    setShowRightTab(null);
  }, [open, idea, selectedColumnId]);

  const handleSave = () => {
    onSave({
      id: idea?.id,
      title: title,
      description,
      images,
      columnId: selectedColumn,
      sortOrder: idea?.sortOrder,
    });
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
  };
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          `flex max-h-[90vh] gap-0 overflow-hidden p-0 sm:w-[95%] sm:min-w-137.5`,
          showRightTab && "sm:max-w-225",
        )}
      >
        <div className="flex min-h-0 flex-1 ">
          <div className="flex min-w-0 flex-1 flex-col border-r border-border">
            <DialogHeader className="shrink-0 flex flex-row items-center justify-between px-5 py-4 border-b border-border">
              <DialogTitle className="text-base font-semibold">
                {isEdit ? "Edit Idea" : "Create Idea"}
              </DialogTitle>

              <div>
                <Select
                  value={selectedColumn}
                  onValueChange={setSelectedColumn}
                >
                  <SelectTrigger
                    className="min-w-25 
            max-w-33.75 gap-1! mr-5 text-sm"
                  >
                    <Shapes />
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns?.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-5 py-2">
              <Textarea
                value={title}
                placeholder="Give your idea a title"
                onChange={(e) => setTitle(e.target.value)}
                rows={2}
                className="w-full min-w-0 border-0 px-0 text-xl! font-semibold
          shadow-none placeholder:font-semibold bg-transparent! resize-none! whitespace-pre-wrap wrap-break-word
          overflow-wrap-anywhere overflow-hidden
          focus-visible:ring-0"
              />

              <ContentTextarea
                value={description}
                onChange={setDescription}
                placeholder="Everything begins with an idea"
                images={images}
                onImagesChange={setImages}
                showAIAssistant={true}
                onAIAssistantClick={() =>
                  setShowRightTab((prev) => {
                    if (prev) {
                      return null;
                    }

                    return "ai";
                  })
                }
              />
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                size="lg"
                disabled={isSaving || !title.trim()}
                onClick={handleSave}
                className={cn(showRightTab && "hidden")}
              >
                {isSaving && <Spinner />}
                Save Idea
              </Button>
              <div className="bg-transparent h-10" />
            </div>
          </div>

          <DialogDescription />

          {showRightTab && (
            <div
              className="w-90 flex flex-col shrink-0
            h-full
            "
            >
              <div className="flex flex-col w-full bg-background px-5 py-4 border-b border-border">
                <div className="flex items-center justify-end gap-px pr-6 ">
                  {rightTabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={showRightTab === tab.id ? "default" : "ghost"}
                      className={cn(!showRightTab && "size-8")}
                      onClick={() =>
                        setShowRightTab((prev) =>
                          prev === tab.id ? null : tab.id,
                        )
                      }
                    >
                      <tab.icon className="size-4" />
                      <span className={cn(!showRightTab && "hidden")}>
                        {" "}
                        {tab.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
              <div
                className={cn(
                  "py-4 flex-1 flex flex-col h-full px-2",
                  showRightTab != "media" && "bg-muted",
                )}
              >
                {showRightTab === "ai" && (
                  <AIAssistant
                    content={`${title}\n\n${description}`}
                    onGenerate={(content: string) => {
                      setDescription(content);
                    }}
                  />
                )}
                {showRightTab === "media" && (
                  <MediaList
                    mode="simple"
                    height="h-114"
                    setImgs={setImages}
                    imgs={images}
                  />
                )}
              </div>
              <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                <Button
                  size="lg"
                  disabled={isSaving || !title.trim()}
                  onClick={handleSave}
                >
                  {isSaving && <Spinner />}
                  Save Idea
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IdeaDialog;
