import { Divider, ScrollArea, Text } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { Link } from "@remix-run/react";

export interface ReminderItem {
  title: string | React.ReactNode;
  content: string | React.ReactNode;
}

export interface RemindersProps {
  title?: string;
  items: ReminderItem[];
  maxHeight?: number;
}

export const Reminders = ({
  title = "Important Reminders",
  items,
  maxHeight = 100,
}: RemindersProps) => {
  return (
    <div className="w-full p-6 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <Text size="xl" fw={700}>
          {title}
        </Text>
        {items.length > 1 && (
          <div className="flex items-center gap-1">
            <Text size="sm" fw={500}>
              Scroll for more
            </Text>
            <IconChevronDown size={16} className="animate-bounce" />
          </div>
        )}
      </div>

      <ScrollArea h={maxHeight} scrollbarSize={6} type="hover" offsetScrollbars>
        <div className="flex flex-col gap-4 pr-2">
          {items.map((item, index) => (
            <div key={index}>
              {index > 0 && <Divider />}
              <div>
                <Text size="lg" fw={700}>
                  {item.title}
                </Text>
                <Text size="md" fw={500} style={{ whiteSpace: "pre-line" }}>
                  {item.content}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
