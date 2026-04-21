import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { CalendarDays, Users, LayoutList, ShieldAlert } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Schedule", icon: CalendarDays },
    { href: "/associates", label: "Associates", icon: Users },
    { href: "/pooling", label: "Pooling Rules", icon: LayoutList },
    { href: "/backup", label: "Backups", icon: ShieldAlert },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold tracking-tight text-primary">ShiftManager</h1>
          <p className="text-xs text-muted-foreground">Operations Dashboard</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav (simple top bar) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-card flex items-center px-4 z-10 overflow-x-auto gap-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap text-sm font-medium ${
              location === item.href ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-14 md:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
