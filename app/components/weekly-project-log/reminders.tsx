import { Paper, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

export interface ReminderItem {
  title: string | React.ReactNode;
  content: string | React.ReactNode;
}

export interface RemindersProps {
  title?: string;
  items: ReminderItem[];
}

// Meant for FormPage's `aside`: a sticky side column on wide screens, where it
// can use nearly the full viewport height, and a shorter scrolling panel above
// the form on smaller screens.
export const Reminders = ({
  title = "Important Reminders",
  items,
}: RemindersProps) => {
  return (
    <Paper withBorder shadow="md" className="w-full p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[var(--mantine-primary-color-light-color)]">
        <IconInfoCircle size={20} className="shrink-0" />
        <Text size="lg" fw={700}>
          {title}
        </Text>
      </div>

      <div className="max-h-72 xl:max-h-[calc(100vh-11rem)] overflow-y-auto overscroll-contain -mr-2 pr-2">
        <div className="flex flex-col divide-y divide-[var(--mantine-color-default-border)]">
          {items.map((item, index) => (
            <div key={index} className="py-3 first:pt-0 last:pb-0">
              <Text size="sm" fw={600}>
                {item.title}
              </Text>
              {item.content && (
                <Text
                  size="sm"
                  mt={4}
                  className="text-[var(--mantine-color-dimmed)]"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {item.content}
                </Text>
              )}
            </div>
          ))}
        </div>
      </div>
    </Paper>
  );
};
