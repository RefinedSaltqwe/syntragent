import React from "react";
import Navbar from "./_common/navbar";

type Props = { children: React.ReactNode };

const LandingLayout: React.FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <div className="container mx-auto px-4 py-8">{children}</div>
      </main>
    </div>
  );
};
export default LandingLayout;
