"use client";

export const dynamic = 'force-dynamic';

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, RefreshCw, X } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { ChatPanel } from "@/components/chat-panel";
import * as api from "@/lib/api";
import type {
  ConversationMetadata,
  Message,
  CouncilMetadata,
  Stage1Result,
  Stage2Result,
  Stage3Result,
} from "@/lib/types";

export default function HomePage() {
  // Conversation state
  const [conversations, setConversations] = React.useState<
    ConversationMetadata[]
  >([]);
  const [activeConversationId, setActiveConversationId] = React.useState<
    string | null
  >(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [metadata, setMetadata] = React.useState<CouncilMetadata | undefined>();

  // Loading states
  const [isLoadingConversations, setIsLoadingConversations] =
    React.useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [stage1Loading, setStage1Loading] = React.useState(false);
  const [stage2Loading, setStage2Loading] = React.useState(false);
  const [stage3Loading, setStage3Loading] = React.useState(false);

  // Ref to track if we should skip loading messages (e.g., when sending a new message)
  const skipLoadMessagesRef = React.useRef(false);

  // Error state
  const [error, setError] = React.useState<string | null>(null);

  // Archive filter state
  const [showArchived, setShowArchived] = React.useState(false);

  // Backend health check
  const [backendHealthy, setBackendHealthy] = React.useState<boolean | null>(
    null
  );

  // Check backend health on mount
  React.useEffect(() => {
    const checkHealth = async () => {
      const healthy = await api.checkHealth();
      setBackendHealthy(healthy);
    };
    checkHealth();
  }, []);

  // Load conversations on mount and when showArchived changes
  React.useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoadingConversations(true);
        const convs = await api.listConversations(showArchived);
        setConversations(convs);
        setError(null);
      } catch (err) {
        setError("Failed to load conversations");
        console.error(err);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    if (backendHealthy) {
      loadConversations();
    }
  }, [backendHealthy, showArchived]);

  // Load messages when active conversation changes
  React.useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) {
        setMessages([]);
        setMetadata(undefined);
        return;
      }

      // Skip loading if we're currently sending - the message state is being managed by handleSendMessage
      if (skipLoadMessagesRef.current) {
        skipLoadMessagesRef.current = false;
        return;
      }

      try {
        setIsLoadingMessages(true);
        const conversation = await api.getConversation(activeConversationId);
        setMessages(conversation.messages);
        setError(null);
      } catch (err) {
        setError("Failed to load messages");
        console.error(err);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadMessages();
  }, [activeConversationId]);

  // Handle creating new conversation
  const handleNewConversation = async () => {
    try {
      const conversation = await api.createConversation();
      setConversations((prev) => [
        {
          id: conversation.id,
          created_at: conversation.created_at,
          title: conversation.title,
          message_count: 0,
        },
        ...prev,
      ]);
      setActiveConversationId(conversation.id);
      setMessages([]);
      setMetadata(undefined);
      setError(null);
    } catch (err) {
      setError("Failed to create conversation");
      console.error(err);
    }
  };

  // Handle selecting conversation
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  // Handle archiving/unarchiving conversation
  const handleArchiveConversation = async (id: string, archive: boolean) => {
    try {
      await api.archiveConversation(id, archive);
      // Update local state
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, archived: archive } : c))
      );
      // If archiving the active conversation, clear selection
      if (archive && activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        setMetadata(undefined);
      }
    } catch (err) {
      setError(`Failed to ${archive ? "archive" : "unarchive"} conversation`);
      console.error(err);
    }
  };

  // Handle deleting conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      // Remove from local state
      setConversations((prev) => prev.filter((c) => c.id !== id));
      // If deleting the active conversation, clear selection
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        setMetadata(undefined);
      }
    } catch (err) {
      setError("Failed to delete conversation");
      console.error(err);
    }
  };

  // Handle sending message with streaming
  const handleSendMessage = async (content: string) => {
    if (isSending) return;

    // Create a new conversation if none exists
    let convId = activeConversationId;
    if (!convId) {
      try {
        const conversation = await api.createConversation();
        convId = conversation.id;
        // Set the ref to skip the useEffect that loads messages
        skipLoadMessagesRef.current = true;
        setActiveConversationId(convId);
        setConversations((prev) => [
          {
            id: conversation.id,
            created_at: conversation.created_at,
            title: conversation.title,
            message_count: 0,
          },
          ...prev,
        ]);
      } catch (err) {
        setError("Failed to create conversation");
        console.error(err);
        return;
      }
    }

    // Add user message optimistically
    const userMessage: Message = {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder assistant message
    const assistantMessage: Message = {
      role: "assistant",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    setIsSending(true);
    setStage1Loading(true);
    setError(null);

    try {
      await api.sendMessageStream(convId, content, (event) => {
        switch (event.type) {
          case "stage1_start":
            setStage1Loading(true);
            break;
          case "stage1_complete":
            setStage1Loading(false);
            setStage2Loading(true);
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === "assistant") {
                (lastMsg as { stage1?: Stage1Result[] }).stage1 =
                  event.data as Stage1Result[];
              }
              return updated;
            });
            break;
          case "stage2_start":
            setStage2Loading(true);
            break;
          case "stage2_complete":
            setStage2Loading(false);
            setStage3Loading(true);
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === "assistant") {
                (lastMsg as { stage2?: Stage2Result[] }).stage2 =
                  event.data as Stage2Result[];
              }
              return updated;
            });
            if (event.metadata) {
              setMetadata(event.metadata);
            }
            break;
          case "stage3_start":
            setStage3Loading(true);
            break;
          case "stage3_complete":
            setStage3Loading(false);
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === "assistant") {
                (lastMsg as { stage3?: Stage3Result }).stage3 =
                  event.data as Stage3Result;
              }
              return updated;
            });
            break;
          case "title_complete":
            // Update conversation title
            const titleData = event.data as { title: string };
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId ? { ...c, title: titleData.title } : c
              )
            );
            break;
          case "complete":
            // Update message count
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? { ...c, message_count: c.message_count + 2 }
                  : c
              )
            );
            break;
          case "error":
            setError(event.message || "An error occurred");
            break;
        }
      });
    } catch (err) {
      setError("Failed to send message");
      console.error(err);
      // Remove the placeholder assistant message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSending(false);
      setStage1Loading(false);
      setStage2Loading(false);
      setStage3Loading(false);
    }
  };

  // Backend not healthy view
  if (backendHealthy === false) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div
          className="text-center space-y-4 p-8 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold">API Unavailable</h2>
          <p className="text-muted-foreground">
            Cannot connect to the parLLMent API. Please try refreshing the page.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </motion.div>
      </div>
    );
  }

  // Loading view
  if (backendHealthy === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent mx-auto"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          />
          <p className="text-muted-foreground">Connecting to backend...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex w-full">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onArchiveConversation={handleArchiveConversation}
          onDeleteConversation={handleDeleteConversation}
          showArchived={showArchived}
          onToggleShowArchived={setShowArchived}
          isLoading={isLoadingConversations}
        />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 border-b flex items-center px-4 gap-4 shrink-0">
            <SidebarTrigger />
            <div className="flex-1">
              {activeConversationId && (
                <h1 className="text-sm font-medium truncate">
                  {conversations.find((c) => c.id === activeConversationId)
                    ?.title || "New Conversation"}
                </h1>
              )}
            </div>
          </header>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="bg-destructive/10 text-destructive px-4 py-2 text-sm flex items-center gap-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="h-4 w-4" />
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2"
                  onClick={() => setError(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Panel */}
          <div className="flex-1 min-h-0">
            <ChatPanel
              messages={messages}
              metadata={metadata}
              onSendMessage={handleSendMessage}
              isLoading={isSending}
              stage1Loading={stage1Loading}
              stage2Loading={stage2Loading}
              stage3Loading={stage3Loading}
              hasActiveConversation={!!activeConversationId}
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
