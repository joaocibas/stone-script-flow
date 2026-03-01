import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/materials", label: "Materials" },
  { href: "/slabs", label: "Slab Gallery" },
  { href: "/quote", label: "Get Estimate" },
  { href: "/book", label: "Book Consultation" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground text-xs py-1.5">
        <div className="container flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> (941) 555-0123</span>
            <span className="hidden sm:flex items-center gap-1"><MapPin className="h-3 w-3" /> Sarasota, FL</span>
          </div>
          <span className="hidden md:block">Licensed & Insured · CBC1234567</span>
        </div>
      </div>

      {/* Main nav */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            Altar <span className="text-accent">Stones</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  location.pathname === link.href
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild size="sm" className="ml-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/login">Client Portal</Link>
            </Button>
          </nav>

          {/* Mobile toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t bg-background p-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 text-sm font-medium rounded-md",
                  location.pathname === link.href
                    ? "bg-secondary text-accent"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild size="sm" className="w-full mt-2 bg-accent text-accent-foreground">
              <Link to="/login" onClick={() => setMobileOpen(false)}>Client Portal</Link>
            </Button>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="font-display text-xl font-semibold mb-3">
                Altar <span className="text-accent">Stones</span>
              </h3>
              <p className="text-primary-foreground/70 text-sm max-w-sm">
                Premium countertop fabrication & installation serving the Sarasota, FL area. 
                Granite, quartz, marble, and more.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider mb-3 text-accent">Quick Links</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li><Link to="/materials" className="hover:text-accent transition-colors">Materials</Link></li>
                <li><Link to="/slabs" className="hover:text-accent transition-colors">Slab Gallery</Link></li>
                <li><Link to="/quote" className="hover:text-accent transition-colors">Get Estimate</Link></li>
                <li><Link to="/faq" className="hover:text-accent transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider mb-3 text-accent">Legal</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li><Link to="/legal/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
                <li><Link to="/legal/warranty" className="hover:text-accent transition-colors">Warranty</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/10 mt-8 pt-6 text-xs text-primary-foreground/50 text-center">
            © {new Date().getFullYear()} Altar Stones Countertops. All rights reserved. Licensed & Insured.
          </div>
        </div>
      </footer>
    </div>
  );
}
