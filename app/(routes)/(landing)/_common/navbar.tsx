"use client";

import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const navItems = ["Features", "Channels", "Made for", "Resources", "Pricing"];
export default function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo className="shrink-0" />

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <button
              key={item}
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{item}</span>
              {item !== "Pricing" && <ChevronDown className="h-4 w-4" />}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <>
              <Button asChild variant="outline" className="rounded-full px-5">
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/sign-up">Get started for free</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/schedule">Open workspace</Link>
              </Button>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
