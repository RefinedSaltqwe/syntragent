import { create } from "zustand";

type CustomerDialogStore = {
  postId: string;
  type: "preset" | "none";
  pending: boolean;
  title?: string;
  description?: string;
  proceed: boolean;
  isOpen: boolean;
  setPending: (pending: boolean) => void;
  setPostId: (id: string) => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  onOpen: (isOpen: boolean) => void;
  onIsProceed: (is: boolean) => void;
  onClose: () => void;
};

export const useConfirmationDialog = create<CustomerDialogStore>((set) => ({
  postId: "",
  type: "none",
  pending: false,
  title: "",
  description: "",
  proceed: false,
  isOpen: false,
  setPending: (pending: boolean) => set({ pending }),
  setPostId: (id: string) => set({ postId: id }),
  setTitle: (title: string) => set({ title }),
  setDescription: (description: string) => set({ description }),
  onOpen: (isOpen: boolean) => set({ isOpen }),
  onIsProceed: (is: boolean) => set({ proceed: is }),
  onClose: () =>
    set({
      isOpen: false,
      postId: "",
      proceed: false,
      type: "none",
      title: "",
      description: "",
    }),
}));
