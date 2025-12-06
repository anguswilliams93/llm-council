"use client";

import * as React from "react";
import { Plus, MessageSquare, Archive, ArchiveRestore, Trash2, MoreHorizontal, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { ConversationMetadata } from "@/lib/types";

interface ConversationSidebarProps {
  conversations: ConversationMetadata[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onArchiveConversation: (id: string, archived: boolean) => void;
  onDeleteConversation: (id: string) => void;
  showArchived: boolean;
  onToggleShowArchived: (show: boolean) => void;
  isLoading?: boolean;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onArchiveConversation,
  onDeleteConversation,
  showArchived,
  onToggleShowArchived,
  isLoading,
}: ConversationSidebarProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Separate archived and active conversations
  const { activeConvs, archivedConvs } = React.useMemo(() => {
    const active: ConversationMetadata[] = [];
    const archived: ConversationMetadata[] = [];
    conversations.forEach((conv) => {
      if (conv.archived) {
        archived.push(conv);
      } else {
        active.push(conv);
      }
    });
    return { activeConvs: active, archivedConvs: archived };
  }, [conversations]);

  // Group conversations by date
  const groupedConversations = React.useMemo(() => {
    const groups: Record<string, ConversationMetadata[]> = {};
    activeConvs.forEach((conv) => {
      const dateKey = formatDate(conv.created_at);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(conv);
    });
    return groups;
  }, [activeConvs]);

  const ConversationItem = ({ conversation }: { conversation: ConversationMetadata }) => (
    <motion.div
      key={conversation.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <SidebarMenuItem>
        <div className="flex items-center w-full group">
          <SidebarMenuButton
            onClick={() => onSelectConversation(conversation.id)}
            isActive={activeConversationId === conversation.id}
            className="flex-1 justify-start gap-2 px-4 py-3"
          >
            <MessageSquare className={`h-4 w-4 shrink-0 ${conversation.archived ? "text-muted-foreground" : ""}`} />
            <div className="flex flex-col items-start truncate flex-1">
              <span className={`truncate text-sm font-medium w-full text-left ${conversation.archived ? "text-muted-foreground" : ""}`}>
                {conversation.title || "New Conversation"}
              </span>
              <span className="text-xs text-muted-foreground">
                {conversation.message_count} messages
              </span>
            </div>
          </SidebarMenuButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity mr-2"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onArchiveConversation(conversation.id, !conversation.archived);
                }}
              >
                {conversation.archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </motion.div>
  );

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">parLLMent</span>
            <span className="text-xs text-muted-foreground">LLM Council</span>
          </div>
        </div>
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2"
          variant="outline"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-200px)]">
          {/* Active Conversations */}
          {Object.entries(groupedConversations).map(([dateGroup, convs]) => (
            <SidebarGroup key={dateGroup}>
              <SidebarGroupLabel className="text-xs text-muted-foreground px-4 py-2">
                {dateGroup}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <AnimatePresence mode="popLayout">
                    {convs.map((conversation) => (
                      <ConversationItem key={conversation.id} conversation={conversation} />
                    ))}
                  </AnimatePresence>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

          {/* Archived Conversations */}
          {showArchived && archivedConvs.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground px-4 py-2 flex items-center gap-2">
                <Archive className="h-3 w-3" />
                Archived
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <AnimatePresence mode="popLayout">
                    {archivedConvs.map((conversation) => (
                      <ConversationItem key={conversation.id} conversation={conversation} />
                    ))}
                  </AnimatePresence>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {activeConvs.length === 0 && !isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet.
              <br />
              Start a new one!
            </div>
          )}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t space-y-3">
        <Link href="/scores">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Overall Scores
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Archive className="h-3 w-3" />
            Show archived
          </span>
          <Switch
            checked={showArchived}
            onCheckedChange={onToggleShowArchived}
            className="scale-75"
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
