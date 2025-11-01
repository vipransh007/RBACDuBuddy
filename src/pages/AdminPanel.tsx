import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Database, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Permission = {
  id: string;
  role: "admin" | "editor" | "viewer";
  model_id: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
};

type UserWithRole = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

const AdminPanel = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState<any>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (modelId) {
      loadModel();
      loadPermissions();
      loadUsers();
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

  const loadPermissions = async () => {
    if (!modelId) return;

    try {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .eq("model_id", modelId)
        .order("role");

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Failed to load permissions");
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*, user_roles(role)");

      const usersWithRoles = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: (profile.user_roles as any)?.[0]?.role || "viewer"
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  };

  const updatePermission = async (
    role: "admin" | "editor" | "viewer",
    field: "can_create" | "can_read" | "can_update" | "can_delete",
    value: boolean
  ) => {
    if (!modelId) return;

    try {
      const existingPermission = permissions.find(p => p.role === role);
      
      if (existingPermission) {
        const { error } = await supabase
          .from("permissions")
          .update({ [field]: value })
          .eq("id", existingPermission.id);

        if (error) throw error;
      } else {
        const newPermission: any = {
          role,
          model_id: modelId,
          can_create: false,
          can_read: false,
          can_update: false,
          can_delete: false,
        };
        newPermission[field] = value;

        const { error } = await supabase
          .from("permissions")
          .insert([newPermission]);

        if (error) throw error;
      }

      toast.success("Permission updated successfully");
      loadPermissions();
    } catch (error: any) {
      console.error("Error updating permission:", error);
      toast.error(error.message || "Failed to update permission");
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: newRole as any }]);

      if (error) throw error;

      toast.success("User role updated successfully");
      loadUsers();
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast.error(error.message || "Failed to update user role");
    }
  };

  const getPermissionForRole = (role: "admin" | "editor" | "viewer") => {
    return permissions.find(p => p.role === role);
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/models")} className="gap-2 smooth-transition hover:bg-primary/10">
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

          <Card className="border-border bg-card smooth-transition">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Grant Access</CardTitle>
                  <CardDescription>
                    Manage permissions for roles and control user access to this model
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Role-Based Permissions</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure what each role can do with this model. Users' access depends on their role.
                  </p>
                  <div className="space-y-4">
                    {(["admin", "editor", "viewer"] as const).map((role) => {
                      const perm = getPermissionForRole(role);
                      return (
                        <div key={role} className="p-4 border rounded-lg space-y-3 smooth-transition hover:border-primary/50 hover:bg-card/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize w-20 smooth-transition">
                                {role}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {role === "admin" && "Full access"}
                                {role === "editor" && "Can create and edit"}
                                {role === "viewer" && "Read-only access"}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${role}-create`}
                                checked={perm?.can_create ?? false}
                                onCheckedChange={(checked) =>
                                  updatePermission(role, "can_create", checked as boolean)
                                }
                              />
                              <Label htmlFor={`${role}-create`} className="text-sm cursor-pointer">
                                Create
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${role}-read`}
                                checked={perm?.can_read ?? true}
                                onCheckedChange={(checked) =>
                                  updatePermission(role, "can_read", checked as boolean)
                                }
                              />
                              <Label htmlFor={`${role}-read`} className="text-sm cursor-pointer">
                                Read
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${role}-update`}
                                checked={perm?.can_update ?? false}
                                onCheckedChange={(checked) =>
                                  updatePermission(role, "can_update", checked as boolean)
                                }
                              />
                              <Label htmlFor={`${role}-update`} className="text-sm cursor-pointer">
                                Update
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${role}-delete`}
                                checked={perm?.can_delete ?? false}
                                onCheckedChange={(checked) =>
                                  updatePermission(role, "can_delete", checked as boolean)
                                }
                              />
                              <Label htmlFor={`${role}-delete`} className="text-sm cursor-pointer">
                                Delete
                              </Label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">User Access Control</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Change user roles to grant or restrict access. Users inherit permissions based on their role.
                  </p>
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Current Role</TableHead>
                            <TableHead>Change Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.email}</TableCell>
                              <TableCell>{user.full_name || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={user.role}
                                  onValueChange={(value) => updateUserRole(user.id, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card smooth-transition">
            <CardHeader>
              <CardTitle>Model Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {model.fields?.map((field: any) => (
                  <div key={field.id} className="p-4 bg-secondary rounded-lg smooth-transition hover:bg-secondary/80">
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
