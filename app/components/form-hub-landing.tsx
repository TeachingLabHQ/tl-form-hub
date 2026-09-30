import React from "react";
import { Link } from "@remix-run/react";
import { Button, Paper, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconClipboardList,
  IconChartBar,
  IconArrowRight,
  IconReceipt,
  IconSchool,
  type Icon,
} from "@tabler/icons-react";
import TLLogo from "../assets/tllogo.png";

interface FormHubLandingProps {
  userName: string;
}

type HubLink = {
  to: string;
  icon: Icon;
  title: string;
  description: string;
  action: string;
  // The weekly log is the most-used form, so it's fetched as soon as the hub
  // renders; the rest load on hover/focus
  prefetch?: "render" | "intent";
};

const HUB_LINKS: HubLink[] = [
  {
    to: "/weekly-project-log-form",
    icon: IconClipboardList,
    title: "Weekly Project Log",
    description:
      "Submit your weekly project hours and track your work across different projects. The form helps ensure accurate time tracking and project allocation.",
    action: "Submit Weekly Hours",
    prefetch: "render",
  },
  {
    to: "/staffing-dashboard",
    icon: IconChartBar,
    title: "Staffing Dashboard",
    description:
      "View your program project assignments and budgeted hours for each project role. Get insights into your work allocation and project commitments.",
    action: "View Dashboard",
  },
  {
    to: "/vendor-payment-form",
    icon: IconReceipt,
    title: "Project Consultant Payment Form",
    description:
      "Submit coach/facilitator payment requests and track payment status. This form helps streamline the coach/facilitator payment process and ensures proper documentation.",
    action: "Submit Payment Request",
  },
  {
    to: "/coach-log-form",
    icon: IconSchool,
    title: "Coach Log & Participant Roster",
    description:
      "Log your weekly coaching sessions, including 1:1 and group coaching, session details, and program-specific information — and add new participants to the coaching roster.",
    action: "Submit Coach Log or Roster",
  },
];

export const FormHubLanding: React.FC<FormHubLandingProps> = ({ userName }) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-6">
      <Paper withBorder shadow="xl" className="p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <img
            src={TLLogo}
            alt="Teaching Lab Logo"
            className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 dark:rounded-full dark:bg-white/90 dark:p-0.5"
          />
          <div>
            <Title order={1} className="text-2xl sm:text-3xl">
              Teaching Lab Form Hub
            </Title>
            <Text c="dimmed">
              Welcome, {userName}! Access all your forms and dashboards in one
              place.
            </Text>
          </div>
        </div>
      </Paper>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {HUB_LINKS.map(
          ({ to, icon: LinkIcon, title, description, action, prefetch }) => (
            <Paper
              key={to}
              withBorder
              shadow="md"
              className="p-6 sm:p-8 flex flex-col gap-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <ThemeIcon variant="light" size={48} radius="md">
                <LinkIcon size={28} stroke={1.75} />
              </ThemeIcon>
              <Title order={3}>{title}</Title>
              <Text c="dimmed" className="flex-1">
                {description}
              </Text>
              <Button
                component={Link}
                to={to}
                prefetch={prefetch ?? "intent"}
                rightSection={<IconArrowRight size={16} />}
                className="self-start"
              >
                {action}
              </Button>
            </Paper>
          )
        )}
      </div>
    </div>
  );
};
