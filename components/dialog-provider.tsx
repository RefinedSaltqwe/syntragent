import React, { lazy, Suspense } from "react";
const ConfirmationDialog = lazy(() => import("./confirmation-dialog"));

const ModalProvider: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmationDialog />
    </Suspense>
  );
};
export default ModalProvider;
