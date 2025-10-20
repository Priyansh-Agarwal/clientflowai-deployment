import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface APIKey {
  id: string;
  name: string;
  key: string;
  description: string;
  createdAt: Date;
}

export default function APIConfiguration() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: "1",
      name: "Twilio API",
      key: "sk_test_****************************",
      description: "Voice call integration",
      createdAt: new Date(),
    },
  ]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState({ name: "", key: "", description: "" });
  const { toast } = useToast();

  const handleAddKey = () => {
    if (!newKey.name || !newKey.key) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const key: APIKey = {
      id: Date.now().toString(),
      name: newKey.name,
      key: newKey.key,
      description: newKey.description,
      createdAt: new Date(),
    };

    setApiKeys([...apiKeys, key]);
    setNewKey({ name: "", key: "", description: "" });

    toast({
      title: "Success",
      description: "API key added successfully",
    });
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter((key) => key.id !== id));
    toast({
      title: "Success",
      description: "API key deleted successfully",
    });
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Manage your custom API keys and integrations to customize the software for your business needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing API Keys */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your API Keys</h3>
            {apiKeys.length === 0 ? (
              <p className="text-muted-foreground text-sm">No API keys configured yet</p>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <Card key={key.id} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{key.name}</h4>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{key.description}</p>
                          <div className="flex items-center gap-2">
                            <Input
                              type={showKeys[key.id] ? "text" : "password"}
                              value={key.key}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleShowKey(key.id)}
                            >
                              {showKeys[key.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteKey(key.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Created: {key.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add New API Key */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New API Key
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-name">API Name *</Label>
                <Input
                  id="api-name"
                  placeholder="e.g., OpenAI API, Stripe API"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="api-key">API Key *</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk_test_..."
                  value={newKey.key}
                  onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="api-description">Description</Label>
                <Textarea
                  id="api-description"
                  placeholder="What is this API used for?"
                  value={newKey.description}
                  onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={handleAddKey} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add API Key
              </Button>
            </div>
          </div>

          {/* Popular Integrations */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Popular Integrations</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { name: "Twilio", desc: "Voice & SMS communications" },
                { name: "OpenAI", desc: "AI-powered conversations" },
                { name: "Google Calendar", desc: "Appointment scheduling" },
                { name: "Stripe", desc: "Payment processing" },
                { name: "Zapier", desc: "Workflow automation" },
                { name: "Slack", desc: "Team notifications" },
              ].map((integration) => (
                <Card key={integration.name} className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-1">{integration.name}</h4>
                    <p className="text-sm text-muted-foreground">{integration.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
