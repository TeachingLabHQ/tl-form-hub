import { Button, Notification, Tabs } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useFetcher, useNavigate, useLoaderData } from "@remix-run/react";
import { IconCheck, IconX } from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import { CoachFacilitatorDetails } from "~/domains/coachFacilitator/repository";
import { Reminders } from "../weekly-project-log/reminders";
import { PaymentHistory } from "./payment-history/payment-history";
import { REMINDER_ITEMS, shouldExcludeVendorPaymentDate } from "./utils";
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [workDate, setWorkDate] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState("new");
  const [vendorPaymentEntries, setVendorPaymentEntries] = useState([
    {
      task: "",
      project: "",
      workHours: "",
      note: "",
    },
  ]);
  const [totalWorkHours, setTotalWorkHours] = useState(0);

  // Handle form submission response
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.error) {
        setError(fetcher.data.error);
        setShowSuccess(false);
      } else {
        setError(null);
        setShowSuccess(true);
        // Reset form after successful submission
        setVendorPaymentEntries([
          {
            task: "",
            project: "",
            workHours: "",
            note: "",
          },
        ]);
        setTotalWorkHours(0);
      }
    }
  }, [fetcher.data]);

  const calculateTotalPay = (entries: typeof vendorPaymentEntries): number => {
    if (entries.some((entry) => !entry.task || !entry.workHours)) {
      return 0;
    }
    return entries.reduce((total, entry) => {
      try {
        const taskData = JSON.parse(entry.task);
        const hours = parseFloat(entry.workHours) || 0;

        // Get rate based on tier
        let rate = 0;
        rate = taskData.rate || 0;

        return total + rate * hours;
      } catch (error) {
        console.error("Error calculating total pay:", error);
        return total;
      }
    }, 0);
  };

  const calculateHistoryTotalPay = (): number => {
    return paymentRequestHistory?.reduce((total, submission) => {
      return total + (submission.total_pay || 0);
    }, 0) || 0;
  };

  const getCurrentTotalPay = (): string => {
    if (activeTab === "new") {
      return vendorPaymentEntries.length > 0
        ? calculateTotalPay(vendorPaymentEntries).toFixed(2)
        : "0.00";
    } else {
      return calculateHistoryTotalPay().toFixed(2);
    }
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
    formData.append("workDate", workDate.toISOString());

    // Submit the form using fetcher
    fetcher.submit(formData, {
      method: "post",
      action: "/api/vendor-payment-form/submit",
    });
  };

  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-12  gap-8 py-8 px-4 md:px-0">
       <div className="row-start-1 col-span-1 md:col-start-2 md:col-span-10">
        <Reminders items={REMINDER_ITEMS} />
      </div>

      {/* Total Pay Section */}
      <div className="row-start-2 md:row-start-2 col-span-1 md:col-start-10 md:col-span-2 flex flex-col items-center">
        <div className="w-full sm:max-w-xs lg:w-fit py-5 px-8 sm:px-10 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white flex flex-col items-center gap-3">
          <h3 className="text-xl font-bold">
            {activeTab === "new" ? "Total Pay" : "Total Pay (Current Month)"}
          </h3>
          <h1 className="text-2xl font-bold">
            ${getCurrentTotalPay()}
          </h1>
        </div>
      </div>

      {/* Tabs Section (New Submission / History) */}
      <div className="row-start-3 md:row-start-2 col-span-1 md:col-start-2 md:col-span-8 h-fit p-8 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white">
        <Tabs defaultValue="new" onChange={(value: string | null) => setActiveTab(value || "new")}>
          <Tabs.List>
            <Tabs.Tab value="new" className="hover:bg-white/10">
              New Submission
            </Tabs.Tab>
            <Tabs.Tab value="history" className="hover:bg-white/10">
              Submission History (Current Month)
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="new">
            <fetcher.Form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-4"
            >
              <div className="flex flex-col gap-2">
                <h1 className="font-bold text-3xl">Project Consultant Payment Form</h1>
                <p className="text-white">This form is intended for contractors serving as coaches, facilitators, content developers and designers, and data evaluation consultants. Once submitted, it will be sent to the invoicing system at month-end for CPM approval and payment processing.</p>
               <p className="text-white">FY26 Facilitation Payment Guide:<br/>
                Please review the <a href="https://docs.google.com/document/d/1N8FOqieDQWt0sGJH1pFqyMnWv4Rb4ykmuvlhBShWrfA/edit?tab=t.0" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>FY26 Facilitation Payment Guide</a> for detailed information about payment processes and term definitions.</p>
              </div>

              <div className="mb-4">
                <label className="block text-white mb-2">Enter the date of the work</label>
                <DateInput
                  value={workDate}
                  onChange={setWorkDate}
                  placeholder="Select date"
                  required
                  className="w-full "
                  excludeDate={shouldExcludeVendorPaymentDate}
                  error={isValidated === true && !workDate ? "Date is required" : null}
                />
              </div>

              <VendorPaymentWidget
                isValidated={isValidated}
                vendorPaymentEntries={vendorPaymentEntries}
                setVendorPaymentEntries={setVendorPaymentEntries}
                setTotalWorkHours={setTotalWorkHours}
                cfTier={cfDetails?.tier || []}
                projects={projects}
              />

              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <Button
                    type="submit"
                    size="md"
                    color="#0053B3"
                    loading={fetcher.state === "submitting"}
                    disabled={fetcher.state === "submitting"}
                  >
                    Submit
                  </Button>
                </div>

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

                {showSuccess && (
                  <Notification
                    icon={<IconCheck size={20} />}
                    color="green"
                    title="Success"
                    onClose={() => setShowSuccess(false)}
                  >
                    Form submitted successfully!
                  </Notification>
                )}
              </div>
            </fetcher.Form>
          </Tabs.Panel>

          <Tabs.Panel value="history">
            <PaymentHistory cfDetails={cfDetails || null} paymentRequestHistory={paymentRequestHistory} />
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
};
