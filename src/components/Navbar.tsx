import { Ghost, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          <Ghost className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">GhostJob</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm">Log In</Button>
          <Button variant="hero" size="sm">Get Started Free</Button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          <a href="#features" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how-it-works" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>How It Works</a>
          <a href="#pricing" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
          <Button variant="hero" className="w-full">Get Started Free</Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
