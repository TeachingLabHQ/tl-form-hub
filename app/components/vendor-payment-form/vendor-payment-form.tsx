import { Button, Notification, Tabs, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { IconCheck, IconX } from "@tabler/icons-react";
import {
  FormActions,
  FormCard,
  FormPage,
  FormSection,
} from "~/components/form-kit";
import React, { useEffect, useMemo, useState } from "react";
import { CoachFacilitatorDetails } from "~/domains/coachFacilitator/repository";
import { Reminders } from "../weekly-project-log/reminders";
import { PaymentHistory } from "./payment-history/payment-history";
import {
  parseStoredTask,
  REMINDER_ITEMS,
  shouldExcludeVendorPaymentDate,
} from "./utils";
import { VendorPaymentWidget } from "./vendor-payment-widget";
import { loader } from "~/routes/vendor-payment-form";

type FetcherData =
  | {
      error?: string;
      data?: any;
    }
  | undefined;

export const VendorPaymentForm = ({ cfDetails }: { cfDetails: CoachFacilitatorDetails|null }) => {
  const { paymentRequestHistory, projects } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<FetcherData>();
  const [isValidated, setIsValidated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workDate, setWorkDate] = useState<Date | null>(new Date());
  const [vendorPaymentEntries, setVendorPaymentEntries] = useState([
    {
      task: "",
      project: "",
      workHours: "",
      note: "",
    },
  ]);
  const totalWorkHours = useMemo(
    () =>
      vendorPaymentEntries.reduce(
        (sum, row) => sum + (parseFloat(row.workHours) || 0),
        0
      ),
    [vendorPaymentEntries]
  );

  // Handle form submission response
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.error) {
        setError(fetcher.data.error);
      } else {
        setError(null);
        notifications.show({
          color: "teal",
          icon: <IconCheck size={18} />,
          title: "Payment request submitted",
          message: "Your payment request was submitted successfully!",
        });
        // Reset form after successful submission
        setVendorPaymentEntries([
          {
            task: "",
            project: "",
            workHours: "",
            note: "",
          },
        ]);
      }
    }
  }, [fetcher.data]);

  const calculateTotalPay = (entries: typeof vendorPaymentEntries): number => {
    if (entries.some((entry) => !entry.task || !entry.workHours)) {
      return 0;
    }
    return entries.reduce((total, entry) => {
      const taskData = parseStoredTask(entry.task);
      if (!taskData) {
        return total;
      }
      const hours = parseFloat(entry.workHours) || 0;
      return total + taskData.rate * hours;
    }, 0);
  };

  const calculateHistoryTotalPay = (): number => {
    return paymentRequestHistory?.reduce((total, submission) => {
      return total + (submission.total_pay || 0);
    }, 0) || 0;
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidated(true);
    setError(null);
    // Check if all required fields are filled
    const hasEmptyFields = vendorPaymentEntries.some(
      (entry) => !entry.task || !entry.project || !entry.workHours
    );

    if (hasEmptyFields) {
      setError("Please fill in all fields");
      return;
    }

    if (!workDate) {
      setError("Please select a date");
      return;
    }

    if (totalWorkHours > 50) {
      setError("Total work hours cannot exceed 50 hours.");
      return;
    }

    if (!cfDetails) {
      setError("Missing coach/facilitator details");
      return;
    }

    const totalPay = calculateTotalPay(vendorPaymentEntries);

    // Create form data
    const formData = new FormData();
    formData.append("entries", JSON.stringify(vendorPaymentEntries));
    formData.append("cfDetails", JSON.stringify(cfDetails));
    formData.append("totalPay", totalPay.toString());
    // Send local calendar date (YYYY-MM-DD) to avoid UTC day-shift near midnight ET
    const yyyy = workDate.getFullYear();
    const mm = String(workDate.getMonth() + 1).padStart(2, "0");
    const dd = String(workDate.getDate()).padStart(2, "0");
    formData.append("workDate", `${yyyy}-${mm}-${dd}`);

    // Submit the form using fetcher
    fetcher.submit(formData, {
      method: "post",
      action: "/api/vendor-payment-form/submit",
    });
  };

  return (
    <FormPage width="lg">
      <Reminders items={REMINDER_ITEMS} />

      <FormCard>
        <Tabs defaultValue="new">
          <Tabs.List>
            <Tabs.Tab value="new">New Submission</Tabs.Tab>
            <Tabs.Tab value="history">
              Submission History (Current Month)
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="new" pt="xl">
            <fetcher.Form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <h2 className="font-bold text-2xl sm:text-3xl">
                  Project Consultant Payment Form
                </h2>
                <Text c="dimmed">
                  This form is intended for contractors serving as coaches,
                  facilitators, content developers and designers, and data
                  evaluation consultants. Once submitted, it will be sent to the
                  invoicing system at month-end for CPM approval and payment
                  processing.
                </Text>
                <Text c="dimmed">
                  FY27 Facilitation Payment Guide:
                  <br />
                  Please review the{" "}
                  <a
                    href="https://docs.google.com/document/d/1qxZ8BClhZgaj1Ol1p1Dc5EfrIzmBtiiAYNz2I9CogW8/edit?tab=t.0#heading=h.afbcr7vh5ok3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[var(--mantine-color-anchor)]"
                  >
                    FY27 Facilitation Payment Guide
                  </a>{" "}
                  for detailed information about payment processes and term
                  definitions.
                </Text>
              </div>

              <FormSection step={1} title="Date of work">
                <div className="flex flex-col gap-1 sm:max-w-xs">
                  <label className="font-semibold">
                    Enter the date of the work
                  </label>
                  <DateInput
                    value={workDate}
                    onChange={setWorkDate}
                    placeholder="Select date"
                    required
                    excludeDate={shouldExcludeVendorPaymentDate}
                    error={
                      isValidated === true && !workDate
                        ? "Date is required"
                        : null
                    }
                  />
                </div>
              </FormSection>

              <FormSection step={2} title="Tasks">
                <VendorPaymentWidget
                  isValidated={isValidated}
                  vendorPaymentEntries={vendorPaymentEntries}
                  setVendorPaymentEntries={setVendorPaymentEntries}
                  cfTier={cfDetails?.tier || []}
                  projects={projects}
                />
              </FormSection>

              {error && (
                <Notification
                  icon={<IconX size={20} />}
                  color="red"
                  title="Error"
                  onClose={() => setError(null)}
                >
                  {error}
                </Notification>
              )}

              <FormActions
                summary={
                  <div className="flex items-baseline gap-2">
                    <Text size="sm" c="dimmed">
                      Total pay
                    </Text>
                    <Text size="xl" fw={700}>
                      ${calculateTotalPay(vendorPaymentEntries).toFixed(2)}
                    </Text>
                  </div>
                }
              >
                <Button
                  type="submit"
                  size="md"
                  loading={fetcher.state === "submitting"}
                  disabled={fetcher.state === "submitting"}
                >
                  Submit
                </Button>
              </FormActions>
            </fetcher.Form>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="xl">
            <div className="flex flex-col gap-4">
              <div className="flex items-baseline justify-end gap-2">
                <Text size="sm" c="dimmed">
                  Total pay (current month)
                </Text>
                <Text size="xl" fw={700}>
                  ${calculateHistoryTotalPay().toFixed(2)}
                </Text>
              </div>
              <PaymentHistory
                cfDetails={cfDetails || null}
                paymentRequestHistory={paymentRequestHistory}
              />
            </div>
          </Tabs.Panel>
        </Tabs>
      </FormCard>
    </FormPage>
  );
};
