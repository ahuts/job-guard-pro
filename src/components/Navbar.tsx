import { Menu, X, LogOut, Settings, Briefcase } from "lucide-react";
import ghostJobLogo from "@/assets/ghostjob-logo.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthDialog from "@/components/AuthDialog";
import { Link } from "react-router-dom";

function getUserInitials(email?: string | null): string {
  if (!email) return "U";
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-28 px-4">
          <Link to="/" className="flex items-center">
            <img src={ghostJobLogo} alt="GhostJob" className="h-24 object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="default">Dashboard</Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                      <Avatar className="h-9 w-9 cursor-pointer">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getUserInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive">
                      <LogOut className="h-4 w-4" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="default" onClick={() => setAuthOpen(true)}>Log In</Button>
                <Button variant="hero" size="default" onClick={() => setAuthOpen(true)}>Get Started Free</Button>
              </>
            )}
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
            {user ? (
              <>
                <Link to="/dashboard" className="block" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full">Dashboard</Button>
                </Link>
                <Link to="/dashboard/settings" className="block" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full">Settings</Button>
                </Link>
                <Button variant="ghost" className="w-full" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-1" /> Log Out
                </Button>
              </>
            ) : (
              <Button variant="hero" className="w-full" onClick={() => { setAuthOpen(true); setMobileOpen(false); }}>
                Get Started Free
              </Button>
            )}
          </div>
        )}
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
};

export default Navbar;
