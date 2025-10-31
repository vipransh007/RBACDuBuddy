import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Field = {
  id: string;
  name: string;
  field_type: string;
  required: boolean;
  default_value: string;
};

const ModelBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([]);

  useEffect(() => {
    if (id) {
      loadModel();
    }
  }, [id]);

  const loadModel = async () => {
    if (!id) return;

    try {
      const { data: model } = await supabase
        .from("models")
        .select("*")
        .eq("id", id)
        .single();

      if (model) {
        setModelName(model.name);
        setDescription(model.description || "");

        const { data: fieldsData } = await supabase
          .from("fields")
          .select("*")
          .eq("model_id", id)
          .order("order_index");

        setFields(fieldsData || []);
      }
    } catch (error) {
      console.error("Error loading model:", error);
      toast.error("Failed to load model");
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        id: crypto.randomUUID(),
        name: "",
        field_type: "string",
        required: false,
        default_value: "",
      },
    ]);
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (id) {
        // Update existing model
        const { error: modelError } = await supabase
          .from("models")
          .update({ name: modelName, description })
          .eq("id", id);

        if (modelError) throw modelError;

        // Delete existing fields
        await supabase.from("fields").delete().eq("model_id", id);

        // Insert new fields
        const { error: fieldsError } = await supabase.from("fields").insert(
          fields.map((field, index) => ({
            model_id: id,
            name: field.name,
            field_type: field.field_type as any,
            required: field.required,
            default_value: field.default_value,
            order_index: index,
          }))
        );

        if (fieldsError) throw fieldsError;

        toast.success("Model updated successfully");
      } else {
        // Create new model
        const { data: newModel, error: modelError } = await supabase
          .from("models")
          .insert({ name: modelName, description, created_by: user.id })
          .select()
          .single();

        if (modelError) throw modelError;

        // Insert fields
        const { error: fieldsError } = await supabase.from("fields").insert(
          fields.map((field, index) => ({
            model_id: newModel.id,
            name: field.name,
            field_type: field.field_type as any,
            required: field.required,
            default_value: field.default_value,
            order_index: index,
          }))
        );

        if (fieldsError) throw fieldsError;

        toast.success("Model created successfully");
      }

      navigate("/models");
    } catch (error: any) {
      console.error("Error saving model:", error);
      toast.error(error.message || "Failed to save model");
    } finally {
      setLoading(false);
    }
  };

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            {id ? "Edit Model" : "Create New Model"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Model Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Model Name</Label>
                  <Input
                    id="name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g., User, Product, Order"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this model represents..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Fields</CardTitle>
                <Button type="button" onClick={addField} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Field
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No fields added yet. Click "Add Field" to get started.
                  </p>
                ) : (
                  fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border border-border rounded-lg space-y-4 bg-secondary/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Field Name</Label>
                              <Input
                                value={field.name}
                                onChange={(e) =>
                                  updateField(index, { name: e.target.value })
                                }
                                placeholder="e.g., email, age"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Field Type</Label>
                              <Select
                                value={field.field_type}
                                onValueChange={(value) =>
                                  updateField(index, { field_type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="url">URL</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Default Value</Label>
                              <Input
                                value={field.default_value}
                                onChange={(e) =>
                                  updateField(index, { default_value: e.target.value })
                                }
                                placeholder="Optional"
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-8">
                              <Checkbox
                                id={`required-${field.id}`}
                                checked={field.required}
                                onCheckedChange={(checked) =>
                                  updateField(index, { required: !!checked })
                                }
                              />
                              <Label htmlFor={`required-${field.id}`}>Required</Label>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Saving..." : id ? "Update Model" : "Create Model"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/models")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ModelBuilder;
