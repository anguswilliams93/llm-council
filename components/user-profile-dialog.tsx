"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { User, Loader2, AlertCircle, X, ChevronDown, Check, LogOut, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  chairmanModel: string;
  councilModels: string[];
}

interface UserProfileDialogProps {
  onAuthChange?: (user: AuthUser | null) => void;
}

export function UserProfileDialog({ onAuthChange }: UserProfileDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [models, setModels] = React.useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [chairmanOpen, setChairmanOpen] = React.useState(false);
  const [councilOpen, setCouncilOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [chairmanSearchQuery, setChairmanSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<string>("login");
  const [showPassword, setShowPassword] = React.useState(false);

  // Current logged in user
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);

  // Form state
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [chairmanModel, setChairmanModel] = React.useState("");
  const [councilModels, setCouncilModels] = React.useState<string[]>([]);

  // Load user from localStorage on mount
  React.useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as AuthUser;
        setCurrentUser(user);
        loadUserData(user);
        onAuthChange?.(user);
      } catch {
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  // Load models when dialog opens
  React.useEffect(() => {
    if (open && models.length === 0) {
      fetchModels();
    }
  }, [open, models.length]);

  const loadUserData = (user: AuthUser) => {
    setUsername(user.username);
    setEmail(user.email);
    setChairmanModel(user.chairmanModel);
    setCouncilModels(user.councilModels);
  };

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/models");

      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }

      const data = await response.json();
      setModels(data.models || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      console.error("Error fetching models:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      const user = data.user as AuthUser;
      setCurrentUser(user);
      loadUserData(user);
      localStorage.setItem("currentUser", JSON.stringify(user));
      onAuthChange?.(user);
      setPassword("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRegister = async () => {
    // Validate required fields
    if (!username.trim() || !email.trim() || !password) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!chairmanModel) {
      setError("Please select a chairman model");
      return;
    }

    if (councilModels.length === 0) {
      setError("Please select at least one council model");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          chairmanModel,
          councilModels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      const user = data.user as AuthUser;
      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));
      onAuthChange?.(user);
      setPassword("");
      setConfirmPassword("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;

    if (!username.trim() || !email.trim()) {
      setError("Username and email are required");
      return;
    }

    if (!chairmanModel) {
      setError("Please select a chairman model");
      return;
    }

    if (councilModels.length === 0) {
      setError("Please select at least one council model");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          username: username.trim(),
          email: email.trim(),
          chairmanModel,
          councilModels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Update failed");
      }

      const user = data.user as AuthUser;
      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));
      onAuthChange?.(user);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    onAuthChange?.(null);
    // Reset form
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setChairmanModel("");
    setCouncilModels([]);
    setActiveTab("login");
    setOpen(false);
  };

  const getInitials = () => {
    const name = currentUser?.username || username;
    return (
      name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  };

  const getChairmanModelName = () => {
    return models.find((m) => m.id === chairmanModel)?.name || "Select a model";
  };

  const getCouncilModelsDisplay = () => {
    if (councilModels.length === 0) return "Select models...";
    if (councilModels.length === 1) return `${councilModels.length} model selected`;
    return `${councilModels.length} models selected`;
  };

  const toggleCouncilModel = (modelId: string) => {
    setCouncilModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((m) => m !== modelId);
      } else {
        if (prev.length >= 4) {
          setError("Maximum 4 council models allowed");
          return prev;
        }
        return [...prev, modelId];
      }
    });
  };

  const filteredModels = models.filter(
    (model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChairmanModels = models.filter(
    (model) =>
      model.name.toLowerCase().includes(chairmanSearchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(chairmanSearchQuery.toLowerCase())
  );

  const renderModelSelection = () => (
    <>
      {/* Chairman Model Dropdown with Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Chairman Model <span className="text-red-500">*</span>
        </label>
        <Popover open={chairmanOpen} onOpenChange={(open) => {
          setChairmanOpen(open);
          if (!open) setChairmanSearchQuery("");
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn("w-full justify-between", !chairmanModel && "text-gray-500")}
              disabled={saving}
            >
              <span className="truncate">{getChairmanModelName()}</span>
              <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search models..."
                className="h-9"
                value={chairmanSearchQuery}
                onValueChange={setChairmanSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No models found.</CommandEmpty>
                <CommandGroup>
                  {filteredChairmanModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => {
                        setChairmanModel(model.id);
                        setChairmanOpen(false);
                        setChairmanSearchQuery("");
                      }}
                    >
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-gray-500 line-clamp-1">{model.description}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 flex-shrink-0",
                          chairmanModel === model.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {chairmanModel && (
          <p className="text-xs text-gray-500">
            {models.find((m) => m.id === chairmanModel)?.description}
          </p>
        )}
      </div>

      {/* Council Models Multi-Select with Search */}
      <div className="space-y-3 pt-2">
        <label className="text-sm font-medium text-gray-900">
          Council Models <span className="text-red-500">*</span> (Select 1-4)
        </label>
        <Popover open={councilOpen} onOpenChange={setCouncilOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn("w-full justify-between", councilModels.length === 0 && "text-gray-500")}
              disabled={saving}
            >
              {getCouncilModelsDisplay()}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search models..."
                className="h-9"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No models found.</CommandEmpty>
                <CommandGroup>
                  {filteredModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => {
                        toggleCouncilModel(model.id);
                      }}
                    >
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-gray-500 line-clamp-1">{model.description}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 flex-shrink-0",
                          councilModels.includes(model.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {councilModels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {councilModels.map((modelId) => {
              const model = models.find((m) => m.id === modelId);
              return (
                <div
                  key={modelId}
                  className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-2 py-1"
                >
                  <span className="text-sm text-blue-900">{model?.name || modelId}</span>
                  <button onClick={() => toggleCouncilModel(modelId)} className="text-blue-600 hover:text-blue-800">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10" title={currentUser ? currentUser.username : "Sign In"}>
          <Avatar className="h-8 w-8">
            <AvatarImage alt={currentUser?.username} />
            <AvatarFallback className={currentUser ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
              {currentUser ? getInitials() : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
                {currentUser ? "Profile Settings" : "Welcome to ParLLMent"}
              </DialogPrimitive.Title>
              <p className="mt-1 text-sm text-gray-600">
                {currentUser
                  ? "Manage your profile and model preferences"
                  : "Sign in or create an account to get started"}
              </p>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="px-6 py-4">
              {currentUser ? (
                // Logged in - Show profile editor
                <div className="space-y-6">
                  {/* User Info */}
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-green-200 text-green-800 text-lg">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-green-900">{currentUser.username}</p>
                      <p className="text-sm text-green-700">{currentUser.email}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <LogOut className="h-4 w-4 mr-1" />
                      Sign Out
                    </Button>
                  </div>

                  {/* Edit Profile */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Edit Profile</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Username</label>
                      <Input
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Email</label>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-900">LLM Model Selection</h3>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-gray-500">Loading available models...</span>
                      </div>
                    ) : (
                      renderModelSelection()
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 border border-red-200">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                </div>
              ) : (
                // Not logged in - Show login/register tabs
                <TabsPrimitive.Root value={activeTab} onValueChange={setActiveTab}>
                  <TabsPrimitive.List className="flex border-b border-gray-200 mb-4">
                    <TabsPrimitive.Trigger
                      value="login"
                      className={cn(
                        "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === "login"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      )}
                    >
                      Sign In
                    </TabsPrimitive.Trigger>
                    <TabsPrimitive.Trigger
                      value="register"
                      className={cn(
                        "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === "register"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      )}
                    >
                      Create Account
                    </TabsPrimitive.Trigger>
                  </TabsPrimitive.List>

                  {/* Login Tab */}
                  <TabsPrimitive.Content value="login" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Email</label>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 border border-red-200">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    )}
                  </TabsPrimitive.Content>

                  {/* Register Tab */}
                  <TabsPrimitive.Content value="register" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    {/* Model Selection for Registration */}
                    <div className="space-y-4 border-t pt-4 mt-4">
                      <h3 className="text-sm font-semibold text-gray-900">Select Your LLM Models</h3>
                      {loading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                          <span className="ml-2 text-sm text-gray-500">Loading available models...</span>
                        </div>
                      ) : (
                        renderModelSelection()
                      )}
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 border border-red-200">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    )}
                  </TabsPrimitive.Content>
                </TabsPrimitive.Root>
              )}
            </div>
          </ScrollArea>

          {/* Dialog Footer */}
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <DialogPrimitive.Close asChild>
              <Button variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogPrimitive.Close>
            {currentUser ? (
              <Button onClick={handleUpdateProfile} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            ) : activeTab === "login" ? (
              <Button onClick={handleLogin} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? "Signing in..." : "Sign In"}
              </Button>
            ) : (
              <Button onClick={handleRegister} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? "Creating..." : "Create Account"}
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
