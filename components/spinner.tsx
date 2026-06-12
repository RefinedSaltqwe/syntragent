import { cn } from "@/lib/utils";
import React from "react";

type LoaderProps = {
  classNames?: string;
  type?: "spinner" | "pulse";
  size?: "small" | "large";
};

const Loader: React.FC<LoaderProps> = ({
  classNames,
  type = "spinner",
  size = "large",
}) => {
  if (type == "spinner") {
    return (
      <div
        className={cn(
          "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_.2s_linear_infinite]",
          classNames,
          size === "small" ? "h-4 w-4 border-2" : "h-8 w-8 border-4",
        )}
        role="status"
      ></div>
    );
  } else {
    return (
      <div
        className={cn(
          "inline-block h-4 w-4 animate-[spinner-grow_0.75s_linear_infinite] rounded-full bg-current align-[-0.125em] opacity-0 motion-reduce:animate-[spinner-grow_1.5s_linear_infinite]",
          classNames,
        )}
        role="status"
      >
        <span className="absolute! -m-px! h-px! w-px! overflow-hidden! border-0! p-0! whitespace-nowrap! [clip:rect(0,0,0,0)]!">
          Loading...
        </span>
      </div>
    );
  }
};
export default Loader;
