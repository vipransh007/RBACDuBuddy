import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Database, Zap, Shield, Code2, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-primary/10 rounded-2xl glow-effect animate-pulse">
              <Database className="h-16 w-16 text-primary" />
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            Auto-Generated
            <br />
            <span className="gradient-text">CRUD Platform</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Build dynamic admin interfaces with role-based access control. Generate CRUD APIs instantly without writing code.
          </p>

          <div className="flex justify-center gap-4 pt-8">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="gap-2 text-lg px-8"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16">
            <div className="p-6 bg-card border border-border rounded-xl smooth-transition hover:border-primary/50">
              <Zap className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Model Builder</h3>
              <p className="text-muted-foreground">
                Create data models visually with custom fields and validation
              </p>
            </div>

            <div className="p-6 bg-card border border-border rounded-xl smooth-transition hover:border-primary/50">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">RBAC System</h3>
              <p className="text-muted-foreground">
                Fine-grained role-based access control for every model
              </p>
            </div>

            <div className="p-6 bg-card border border-border rounded-xl smooth-transition hover:border-primary/50">
              <Code2 className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Dynamic APIs</h3>
              <p className="text-muted-foreground">
                Auto-generated RESTful APIs with authentication built-in
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
