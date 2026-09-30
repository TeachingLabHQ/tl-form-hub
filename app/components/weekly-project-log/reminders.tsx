import { Divider, Paper, ScrollArea, Text } from "@mantine/core";
import { IconChevronDown, IconInfoCircle } from "@tabler/icons-react";

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
    <Paper
      withBorder
      shadow="md"
      className="w-full p-5 flex flex-col gap-3"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-[var(--mantine-primary-color-light-color)]">
          <IconInfoCircle size={20} />
          <Text size="lg" fw={700}>
            {title}
          </Text>
        </div>
        {items.length > 1 && (
          <div className="flex items-center gap-1 text-[var(--mantine-color-dimmed)]">
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
                <Text fw={600}>{item.title}</Text>
                <Text size="sm" style={{ whiteSpace: "pre-line" }}>
                  {item.content}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Paper>
  );
};
