"use client";

import { useUIState } from "ai/rsc";
import { groupBy } from "lodash-es";
import { DateTime } from "luxon";
import Link from "next/link";
import * as React from "react";

import { Button, ButtonProps } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConversationData } from "@/lib/db/aiState";
import { cn } from "@/lib/utils";
import { getHistoryFromStore, listUserConversations } from "@/llm/actions/history";

import { CheckIcon, ChevronUpDownIcon, SimplePlusIcon } from "../icons";
import { useChat } from "./context";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>;

interface ConversationPickerProps extends PopoverTriggerProps {
  selectedConversationID: string;
}

const getTitle = (conversation?: ConversationData) => {
  if (!conversation) {
    return;
  }
  return conversation.title ?? `Chat from ${DateTime.fromJSDate(conversation.createdAt).toRelative()}`;
};

const PickerButton = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, className, ...props }, ref) => (
  <Button
    ref={ref}
    variant="outline"
    role="combobox"
    className={cn(
      // common styles
      "inline-flex items-center justify-between overflow-hidden whitespace-nowrap truncate text-sm",
      // (desktop)
      "sm:max-w-[320px]",
      // (mobile)
      "w-full max-w-[240px]",
      // additional styles provided by user
      className
    )}
    {...props}
  >
    <div className="truncate">{children}</div>
    <ChevronUpDownIcon className="h-4 w-4 ml-2.5" />
  </Button>
));

PickerButton.displayName = "PickerButton";

export default function ConversationPicker({ selectedConversationID }: ConversationPickerProps) {
  const [currentConversation] = useUIState();
  // const { readOnly } = useChat();
  const [conversations, setConversations] = React.useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<ConversationData>();

  const fetchConversations = async () => {
    let cs = await listUserConversations();
    let cconv = await getHistoryFromStore(selectedConversationID);
    if (!cs.some((c) => c.conversationID === selectedConversationID)) {
      cs = [
        ...cs,
        {
          conversationID: selectedConversationID,
          createdAt: cconv.createdAt,
          updatedAt: cconv.updatedAt,
          userID: cconv.ownerID,
          title: cconv.title,
        },
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    setConversations(cs);
    setSelectedConversation(cs.find((c) => c.conversationID === selectedConversationID));
  };

  React.useEffect(() => {
    //TODO: we should find a more reliable way to determine when the conversation has finished streaming.
    const userMessages = currentConversation.filter((m: { role: string }) => m.role === "user");
    let i = 0;
    if (userMessages.length > 4) {
      return;
    }
    const poolingInterval = setInterval(async () => {
      i++;
      await fetchConversations();
      if (i === 60) {
        clearInterval(poolingInterval);
      }
    }, 1000);
    return () => clearInterval(poolingInterval);
  }, [selectedConversationID, currentConversation]);

  const [open, setOpen] = React.useState(false);

  const groups = groupBy(conversations, (conversation: ConversationData) => {
    return DateTime.fromJSDate(conversation.createdAt).startOf("day").toRelativeCalendar();
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PickerButton>{getTitle(selectedConversation)}</PickerButton>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="end">
        <Command>
          <CommandList>
            <CommandEmpty>No chats found.</CommandEmpty>
          </CommandList>

          <CommandList>
            {Object.entries(groups).map(([day, conversations]) => (
              <CommandGroup key={day} heading={day}>
                {conversations.map((conversation) => (
                  <CommandItem
                    key={conversation.conversationID}
                    onSelect={() => {
                      setSelectedConversation(conversation);
                      setOpen(false);
                    }}
                    className="text-sm"
                    value={conversation.conversationID}
                  >
                    <Link href={`/chat/${conversation.conversationID}`} className="flex w-full items-center">
                      {getTitle(conversation)}
                      {selectedConversationID === conversation.conversationID && <CheckIcon className="ml-auto" />}
                    </Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>

          <>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <CommandItem>
                  <Link href="/new" className="flex w-full items-center justify-between">
                    Start new chat
                    <SimplePlusIcon />
                  </Link>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
