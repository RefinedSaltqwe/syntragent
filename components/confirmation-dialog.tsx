"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirmationDialog } from "@/hooks/store/use-dialog";
import Spinner from "./spinner";

const ConfirmationDialog: React.FC = () => {
  const pending = useConfirmationDialog((state) => state.pending);
  const open = useConfirmationDialog((state) => state.isOpen);
  const setOpen = useConfirmationDialog((state) => state.onOpen);
  const title = useConfirmationDialog((state) => state.title);
  const description = useConfirmationDialog((state) => state.description);
  const onProceed = useConfirmationDialog((state) => state.onIsProceed);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => onProceed(true)} disabled={pending}>
            {pending ? <Spinner type="spinner" size="small" /> : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
