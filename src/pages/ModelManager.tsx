import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Database, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Model = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

const ModelManager = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
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
    }
  };

  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error("Error loading models:", error);
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModelId) return;

    try {
      const { error } = await supabase
        .from("models")
        .delete()
        .eq("id", deleteModelId);

      if (error) throw error;

      toast.success("Model deleted successfully");
      setModels(models.filter((m) => m.id !== deleteModelId));
      setDeleteModelId(null);
    } catch (error: any) {
      console.error("Error deleting model:", error);
      toast.error(error.message || "Failed to delete model");
    }
  };

  const canEdit = userRole === "admin" || userRole === "editor";
  const canDelete = userRole === "admin";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Model Manager</h1>
              <p className="text-muted-foreground">
                View and manage all your data models
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => navigate("/models/new")}>
                Create Model
              </Button>
            )}
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>All Models</CardTitle>
              <CardDescription>
                {models.length} {models.length === 1 ? "model" : "models"} created
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading models...
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No models created yet</p>
                  {canEdit && (
                    <Button onClick={() => navigate("/models/new")}>
                      Create Your First Model
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {model.description || "No description"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {new Date(model.created_at).toLocaleDateString()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/admin/${model.id}`)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View Data
                            </Button>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/models/${model.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteModelId(model.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={!!deleteModelId} onOpenChange={() => setDeleteModelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this model and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModelManager;
