import { Ghost } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <Ghost className="h-5 w-5 text-primary" />
              <span className="font-bold text-foreground">GhostJob</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Detect ghost jobs on LinkedIn before you apply.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
              <li><Link to="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="/#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Learn</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/what-is-a-ghost-job" className="hover:text-foreground transition-colors">What is a ghost job?</Link></li>
              <li><Link to="/ghost-jobs-on-linkedin" className="hover:text-foreground transition-colors">Ghost jobs on LinkedIn</Link></li>
              <li><Link to="/how-trust-score-works" className="hover:text-foreground transition-colors">How the Trust Score works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 GhostJob. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">jobghost.io</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
