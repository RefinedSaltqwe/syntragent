"use client";

import { cn } from "@/lib/utils";
import { WaypointsIcon } from "lucide-react";

interface LogoProps {
  name?: string;
  className?: string;
  hideName?: boolean;
}

const Logo = ({
  name = "Syntragent.ai",
  className,
  hideName = false,
}: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <WaypointsIcon className="h-4 w-4" />
      </div>
      {!hideName && <span className="text-base font-bold">{name}</span>}
    </div>
  );
};

export default Logo;
