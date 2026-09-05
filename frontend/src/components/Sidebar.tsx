import React from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Workflow,
  SlidersHorizontal,
  CreditCard,
  Cpu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type NavRoute =
  | "overview"
  | "benchmark"
  | "decision-replay"
  | "simulator"
  | "cases"
  | "architecture";

interface SidebarProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  backendOnline: boolean;
  casesCount: number;
}

interface NavItem {
  id: NavRoute;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
  backendOnline,
  casesCount,
}) => {
  const navGroups: NavGroup[] = [
    {
      title: "Command",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "benchmark", label: "Benchmark Lab", icon: TrendingUp },
      ],
    },
    {
      title: "Intelligence",
      items: [
        {
          id: "decision-replay",
          label: "Decision Replay",
          icon: Workflow,
          badge: casesCount > 0 ? casesCount : undefined,
        },
        {
          id: "simulator",
          label: "Recovery Simulator",
          icon: SlidersHorizontal,
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          id: "cases",
          label: "Live Cases",
          icon: CreditCard,
          badge: casesCount > 0 ? casesCount : undefined,
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          id: "architecture",
          label: "AI Boundaries",
          icon: Cpu,
        },
      ],
    },
  ];

  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div
          className="sidebar-brand"
          onClick={() => {
            window.location.hash = "";
          }}
          style={{ cursor: "pointer" }}
          title="Return to Landing Page"
        >
          <div className="sidebar-logo">
            <img src="/Second_Logo.png" alt="Second" className="sidebar-logo-img" />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">Second</span>
              <span className="sidebar-brand-badge">AI Revenue Recovery</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav Groups */}
      <div className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.title} className="sidebar-group">
            {!collapsed && <div className="sidebar-group-title">{group.title}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentRoute === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="nav-icon">
                      <IconComponent size={18} />
                    </div>

                    {!collapsed && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              background: isActive ? "var(--rzp-blue)" : "rgba(255,255,255,0.08)",
                              color: isActive ? "#fff" : "var(--text-secondary)",
                              padding: "0.1rem 0.45rem",
                              borderRadius: "9999px",
                              fontWeight: 600,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="sidebar-footer">
        <div className="engine-status-badge" title={backendOnline ? "Decision engine is active and reachable" : "Backend unreachable"}>
          <div className={`pulse-dot ${backendOnline ? "" : "offline"}`} />
          {!collapsed && (
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {backendOnline ? "Decision Engine Active" : "Backend Disconnected"}
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="sidebar-buildathon-badge">
            ₹ Built for Razorpay Buildathon
          </div>
        )}
      </div>
    </aside>
  );
};
