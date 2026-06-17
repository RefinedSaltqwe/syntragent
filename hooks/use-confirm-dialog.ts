import { useConfirmationDialog } from "./store/use-dialog";

type DialogProps = {
  open?: boolean;
  title?: string;
  description?: string;
  proceed?: boolean;
  postId?: string;
  pending?: boolean;
};
export function useHandleDialog() {
  const onOpen = useConfirmationDialog((state) => state.onOpen);
  const setTitle = useConfirmationDialog((state) => state.setTitle);
  const setDescription = useConfirmationDialog((state) => state.setDescription);
  const proceed = useConfirmationDialog((state) => state.proceed);
  const setProceed = useConfirmationDialog((state) => state.onIsProceed);
  const setPostId = useConfirmationDialog((state) => state.setPostId);
  const postId = useConfirmationDialog((state) => state.postId);
  const setPending = useConfirmationDialog((state) => state.setPending);

  const handleDialog = ({
    open = false,
    title = "",
    description = "",
    proceed = false,
    postId = "",
    pending = false,
  }: DialogProps) => {
    setTitle(title);
    setDescription(description);
    onOpen(open);
    setProceed(proceed);
    setPostId(postId);
    setPending(pending);
  };

  return { handleDialog, proceed, postId };
}
