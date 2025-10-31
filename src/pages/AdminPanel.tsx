import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Database } from "lucide-react";
import { toast } from "sonner";

const AdminPanel = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (modelId) {
      loadModel();
    }
  }, [modelId]);

  const loadModel = async () => {
    if (!modelId) return;

    try {
      const { data, error } = await supabase
        .from("models")
        .select("*, fields(*)")
        .eq("id", modelId)
        .single();

      if (error) throw error;
      setModel(data);
    } catch (error) {
      console.error("Error loading model:", error);
      toast.error("Failed to load model");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Model not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/models")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Models
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{model.name}</h1>
            <p className="text-muted-foreground">
              {model.description || "No description available"}
            </p>
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Dynamic Admin Interface</CardTitle>
              <CardDescription>
                Manage data for the {model.name} model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground mb-4">
                  The dynamic admin interface for managing {model.name} data will be available soon.
                </p>
                <p className="text-sm text-muted-foreground">
                  This will include CRUD operations with full RBAC support.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Model Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {model.fields?.map((field: any) => (
                  <div key={field.id} className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{field.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Type: {field.field_type} {field.required && "• Required"}
                        </p>
                      </div>
                      {field.default_value && (
                        <div className="text-sm text-muted-foreground">
                          Default: {field.default_value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
