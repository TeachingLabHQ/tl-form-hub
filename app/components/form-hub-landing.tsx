import React from "react";
import { Link } from "@remix-run/react";
import { Paper, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconClipboardList,
  IconChartBar,
  IconArrowRight,
  IconReceipt,
  IconSchool,
  type Icon,
} from "@tabler/icons-react";

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

// Time-of-day greeting in the viewer's local time. The hub only renders on the
// client (ProtectedRoute holds a skeleton until the session resolves), so this
// can't mismatch the server render.
const greetingFor = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export const FormHubLanding: React.FC<FormHubLandingProps> = ({ userName }) => {
  const firstName = userName.trim().split(/\s+/)[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-6 pb-12 md:pt-8 md:pb-16 flex flex-col gap-6">
      <div className="text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.35)]">
        <Title order={1} c="white" className="text-3xl sm:text-4xl">
          {greetingFor(new Date())}
          {firstName ? `, ${firstName}` : ""}
        </Title>
        <Text size="lg" c="white" className="opacity-90 mt-1">
          What would you like to work on today?
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {HUB_LINKS.map(
          ({ to, icon: LinkIcon, title, description, action, prefetch }) => (
            <Paper
              key={to}
              component={Link}
              to={to}
              prefetch={prefetch ?? "intent"}
              withBorder
              shadow="md"
              className="group p-6 sm:p-8 flex flex-col gap-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mantine-primary-color-filled)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <ThemeIcon variant="light" size={48} radius="md">
                <LinkIcon size={28} stroke={1.75} />
              </ThemeIcon>
              <Title order={3}>{title}</Title>
              <Text c="dimmed" className="flex-1">
                {description}
              </Text>
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--mantine-color-anchor)]">
                {action}
                <IconArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </span>
            </Paper>
          )
        )}
      </div>
    </div>
  );
};
