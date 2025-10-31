import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Plus, Settings as SettingsIcon, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const localRole = localStorage.getItem("selectedRole");
      if (localRole) {
        setUserRole(localRole);
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserRole(roleData?.role || "viewer");
    } catch (error) {
      console.error("Error loading user role:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("selectedRole");
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isAdmin = userRole === "admin";
  const canCreate = userRole === "admin" || userRole === "editor";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium capitalize text-muted-foreground">{userRole}</span>
            </div>
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
                <SettingsIcon className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <p className="text-muted-foreground">
            Welcome. Use the actions below to manage your data.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="border-border bg-card cursor-pointer" onClick={() => navigate("/models")}> 
              <CardHeader>
                <div className="p-3 bg-muted rounded-md w-fit mb-2">
                  <Database className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle>View Models</CardTitle>
                <CardDescription>Browse and manage your models</CardDescription>
              </CardHeader>
            </Card>

            {canCreate && (
              <Card className="border-border bg-card cursor-pointer" onClick={() => navigate("/models/new")}>
                <CardHeader>
                  <div className="p-3 bg-muted rounded-md w-fit mb-2">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>Create Model</CardTitle>
                  <CardDescription>Define a new data model</CardDescription>
                </CardHeader>
              </Card>
            )}

            {isAdmin && (
              <Card className="border-border bg-card cursor-pointer" onClick={() => navigate("/settings")}>
                <CardHeader>
                  <div className="p-3 bg-muted rounded-md w-fit mb-2">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>RBAC Settings</CardTitle>
                  <CardDescription>Manage roles and permissions</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
