import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ModelBuilder from "./pages/ModelBuilder";
import ModelManager from "./pages/ModelManager";
import AdminPanel from "./pages/AdminPanel";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const RequireRole = ({ children, allow }: { children: React.ReactNode; allow: Array<"admin" | "editor" | "viewer"> }) => {
  const [role, setRole] = useState<"admin" | "editor" | "viewer" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const localRole = localStorage.getItem("selectedRole") as any;
        if (localRole) {
          setRole(localRole);
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          return;
        }
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (error) {
          setRole("viewer");
        } else {
          setRole((data?.role as any) || "viewer");
        }
      } finally {
        setLoading(false);
      }
    };
    loadRole();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!role || !allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/models/new"
            element={
              <ProtectedRoute>
                <RequireRole allow={["admin", "editor"]}>
                  <ModelBuilder />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/models/:id/edit"
            element={
              <ProtectedRoute>
                <RequireRole allow={["admin", "editor"]}>
                  <ModelBuilder />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/models"
            element={
              <ProtectedRoute>
                <ModelManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/:modelId"
            element={
              <ProtectedRoute>
                <RequireRole allow={["admin"]}>
                  <AdminPanel />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <RequireRole allow={["admin"]}>
                  <Settings />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
