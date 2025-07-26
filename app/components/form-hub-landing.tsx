import React from "react";
import { Link, useNavigate } from "@remix-run/react";
import {
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Text,
  Title,
} from "@mantine/core";
import {
  IconClipboardList,
  IconChartBar,
  IconArrowRight,
  IconReceipt,
} from "@tabler/icons-react";
import TLLogo from "../assets/tllogo.png";

interface FormHubLandingProps {
  userName: string;
}

export const FormHubLanding: React.FC<FormHubLandingProps> = ({ userName }) => {
  const navigate = useNavigate();

  return (
    <Container size="lg" py="xl">
      <Card
        shadow="sm"
        p="xl"
        radius="md"
        withBorder
        className="bg-white/80 backdrop-blur-sm mb-8"
      >
        <Flex align="center" gap="md" mb="md">
          <img src={TLLogo} alt="Teaching Lab Logo" style={{ height: 60 }} />
          <div>
            <Title order={1}>Teaching Lab Form Hub</Title>
            <Text size="lg" c="dimmed">
              Welcome, {userName}! Access all your forms and dashboards in one
              place.
            </Text>
          </div>
        </Flex>

        <Text mb="xl">
          This hub provides quick access to all the forms and dashboards you
          need for your work at Teaching Lab. Select one of the options below to
          get started.
        </Text>
      </Card>

      <Grid>
        {/* hiding for now */}
        {/* <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            shadow="sm"
            p="xl"
            radius="md"
            withBorder
            className="h-full bg-white/80 backdrop-blur-sm"
          >
            <Flex direction="column" style={{ height: "100%" }}>
              <IconClipboardList
                size={48}
                color="#0053B3"
                style={{ marginBottom: 16 }}
              />
              <Title order={3} mb="xs">
                Weekly Project Log
              </Title>
              <Text mb="md" style={{ flex: 1 }}>
                Submit your weekly project hours and track your work across
                different projects. The form helps ensure accurate time tracking
                and project allocation.
              </Text>
              <Button
                component={Link}
                to="/weekly-project-log-form"
                rightSection={<IconArrowRight size={16} />}
                color="#0053B3"
                prefetch="render"
                onClick={(e) => {
                  e.preventDefault();
                  setTimeout(() => {
                    navigate("/weekly-project-log-form");
                  }, 50);
                }}
              >
                Submit Weekly Hours
              </Button>
            </Flex>
          </Card>
        </Grid.Col> */}

        {/* <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            shadow="sm"
            p="xl"
            radius="md"
            withBorder
            className="h-full bg-white/80 backdrop-blur-sm"
          >
            <Flex direction="column" style={{ height: "100%" }}>
              <IconChartBar
                size={48}
                color="#0053B3"
                style={{ marginBottom: 16 }}
              />
              <Title order={3} mb="xs">
                Staffing Dashboard
              </Title>
              <Text mb="md" style={{ flex: 1 }}>
                View your program project assignments and budgeted hours for
                each project role. Get insights into your work allocation and
                project commitments.
              </Text>
              <Button
                component={Link}
                to="/staffing-dashboard"
                rightSection={<IconArrowRight size={16} />}
                color="#0053B3"
              >
                View Dashboard
              </Button>
            </Flex>
          </Card>
        </Grid.Col> */}

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            shadow="sm"
            p="xl"
            radius="md"
            withBorder
            className="h-full bg-white/80 backdrop-blur-sm"
          >
            <Flex direction="column" style={{ height: "100%" }}>
              <IconReceipt
                size={48}
                color="#0053B3"
                style={{ marginBottom: 16 }}
              />
              <Title order={3} mb="xs">
                Project Consultant Payment Form
              </Title>
              <Text mb="md" style={{ flex: 1 }}>
                Submit coach/facilitator payment requests and track payment status. This
                form helps streamline the coach/facilitator payment process and ensures
                proper documentation.
              </Text>
              <Button
                component={Link}
                to="/vendor-payment-form"
                rightSection={<IconArrowRight size={16} />}
                color="#0053B3"
              >
                Submit Payment Request
              </Button>
            </Flex>
          </Card>
        </Grid.Col>
      </Grid>

      <Card
        shadow="sm"
        p="xl"
        radius="md"
        withBorder
        className="bg-white/80 backdrop-blur-sm mt-8"
      >
        <Title order={4} mb="xs">
          Coming Soon
        </Title>
        <Text>
          We're working on adding more forms and tools to make your work easier.
          Check back soon for updates!
        </Text>
      </Card>
    </Container>
  );
};
