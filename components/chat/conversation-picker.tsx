"use client";

import groupBy from "lodash.groupby";
import { Check, ChevronsUpDown } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
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
import { listConversations } from "@/llm/actions/history";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface ConversationPickerProps extends PopoverTriggerProps {
  selectedConversationID: string;
  //This is only used to trigger the reload of the conversations
  messagesLenght?: number;
}

const getTitle = (conversation?: ConversationData) => {
  if (!conversation) { return; }
  return conversation.title ?? `Chat from ${DateTime.fromJSDate(conversation.createdAt).toRelative()}`;
}

export default function ConversationPicker({
  selectedConversationID,
  messagesLenght,
}: ConversationPickerProps) {
  console.log("ConversationPicker");
  const [conversations, setConversation ] = React.useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<
    ConversationData
  >();

  React.useEffect(() => {
    (async () => {
      let conversations = await listConversations();
      if (!conversations.some(c => c.conversationID === selectedConversationID)) {
        conversations = [
          ...conversations,
          { conversationID: selectedConversationID, createdAt: new Date(), updatedAt: new Date(), userID: "", title: "This chat" },
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      setConversation(conversations);
      setSelectedConversation(conversations.find(c => c.conversationID === selectedConversationID));
    })();
  }, [selectedConversationID, messagesLenght]);

  const [open, setOpen] = React.useState(false);

  const groups = groupBy(conversations, (conversation: ConversationData) => {
    return DateTime.fromJSDate(conversation.createdAt).startOf('day').toRelativeCalendar();
  });

  return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a team"
            className={`w-full justify-between pr-1 pl-2 $border-0`}
          >
            <div className="flex flex-col items-start">
              <span className="text-sm">{getTitle(selectedConversation)}</span>
              {/* {subtitle && (
                <span className="text-gray-500 font-light text-xs">
                  {typeof subtitle === "string"
                    ? subtitle
                    : subtitle(selectedConversation)}
                </span>
              )} */}
            </div>
            <ChevronsUpDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="end">
          <Command>
            <CommandList>
              <CommandEmpty>
                No chats found.
              </CommandEmpty>
            </CommandList>

            <CommandList>
              {Object.entries(groups).map(([day, conversations]) => (
                <CommandGroup key={day} heading={day}>
                  {conversations.map(
                    (conversation) => (
                      <CommandItem
                        key={conversation.conversationID}
                        onSelect={() => {
                          setSelectedConversation(conversation);
                          setOpen(false);
                        }}
                        className="text-sm"
                        value={conversation.conversationID}
                      >
                        <Link
                          href={`/chat/${conversation.conversationID}`}
                          className="flex w-full items-center"
                        >
                          {getTitle(conversation)}
                          {selectedConversationID === conversation.conversationID && (
                            <Check className={"ml-auto h-4 w-4"} />
                          )}
                        </Link>
                      </CommandItem>
                    )
                  )}
                </CommandGroup>
              ))}
            </CommandList>

            <>
              <CommandSeparator />
              <CommandList>
                <CommandGroup>
                  <CommandItem>
                    <a
                      href="/new"
                      className="flex items-center justify-between gap-3 w-full block text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                    >
                      Start new chat
                      <div className="RightSlot">+</div>
                    </a>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </>
          </Command>
        </PopoverContent>
      </Popover>
  );
}
