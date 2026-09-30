import { Paper, Text, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";

export const AccessDeniedState = ({errorMessage}: {errorMessage: string}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <Paper withBorder shadow="xl" className="p-8 max-w-md w-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[var(--mantine-color-red-filled)]">
          <IconLock size={24} />
          <Title order={2} size="h3">
            Access Denied
          </Title>
        </div>
        <Text c="dimmed">{errorMessage}</Text>
      </Paper>
    </div>
  );
};
