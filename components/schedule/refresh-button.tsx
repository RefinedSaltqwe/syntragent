import React from "react";
import { Button } from "../ui/button";
import { RotateCw } from "lucide-react";
import { Spinner } from "../ui/spinner";

type RefreshButtonProps = {
  handleRefresh: () => Promise<void>;
  isPending: boolean;
};

const RefreshButton: React.FC<RefreshButtonProps> = ({
  handleRefresh,
  isPending,
}) => {
  return (
    <div className="flex w-full justify-end">
      <Button variant={"ghost"} onClick={handleRefresh} disabled={isPending}>
        {isPending ? (
          <>
            <Spinner /> Refreshing
          </>
        ) : (
          <>
            <RotateCw className="size-4" />
            Refresh
          </>
        )}
      </Button>
    </div>
  );
};
export default RefreshButton;
