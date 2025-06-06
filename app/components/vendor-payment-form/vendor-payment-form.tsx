import { useEffect, useState } from "react";
import { Button, Text, Title, Notification, Tabs } from "@mantine/core";
import React from "react";
import BackgroundImg from "~/assets/background.png";
import { VendorPaymentWidget } from "./vendor-payment-widget";
import { taskOptions, Tier, REMINDER_ITEMS } from "./utils";
import { useNavigate, useFetcher } from "@remix-run/react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { PaymentHistory } from "./payment-history/payment-history";
import { Reminders } from "../weekly-project-log/reminders";

type CfDetails = {
  email: string;
  name: string;
  tier: string;
} | null;

type FetcherData =
  | {
      error?: string;
      data?: any;
    }
  | undefined;

export const VendorPaymentForm = ({ cfDetails }: { cfDetails: CfDetails }) => {
  const navigate = useNavigate();
  const fetcher = useFetcher<FetcherData>();
  const [isValidated, setIsValidated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [vendorPaymentEntries, setVendorPaymentEntries] = useState([
    {
      task: "",
      project: "",
      workHours: "",
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
          },
        ]);
        setTotalWorkHours(0);
      }
    }
  }, [fetcher.data]);

  const calculateTotalPay = (entries: typeof vendorPaymentEntries): number => {
    return entries.reduce((total, entry) => {
      try {
        const taskData = JSON.parse(entry.task);
        const hours = parseFloat(entry.workHours) || 0;

        // Get rate based on tier
        let rate = 0;
        switch (cfDetails?.tier) {
          case Tier.TIER_1:
            rate = taskData["Tier 1"];
            break;
          case Tier.TIER_2:
            rate = taskData["Tier 2"];
            break;
          case Tier.TIER_3:
            rate = taskData["Tier 3"];
            break;
          default:
            rate = 0;
        }

        return total + rate * hours;
      } catch (error) {
        console.error("Error calculating total pay:", error);
        return total;
      }
    }, 0);
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

    // Submit the form using fetcher
    fetcher.submit(formData, {
      method: "post",
      action: "/api/vendor-payment-form/submit",
    });
  };

  return (
    <div
      className="w-screen h-screen grid grid-cols-12 py-14 px-2"
      style={{
        backgroundImage: `url(${BackgroundImg})`,
      }}
    >
      <div className="row-start-1 col-start-2 col-span-10">
        <Reminders items={REMINDER_ITEMS} />
      </div>
      <div className="row-start-2 col-start-2 col-span-8 h-fit p-8 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white">
        <Tabs defaultValue="new">
          <Tabs.List>
            <Tabs.Tab value="new" className="hover:bg-white/10">
              New Submission
            </Tabs.Tab>
            <Tabs.Tab value="history" className="hover:bg-white/10">
              Submission History
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="new">
            <fetcher.Form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-4"
            >
              <h1 className="font-bold text-3xl">Vendor Payment Form</h1>

              <VendorPaymentWidget
                isValidated={isValidated}
                vendorPaymentEntries={vendorPaymentEntries}
                setVendorPaymentEntries={setVendorPaymentEntries}
                setTotalWorkHours={setTotalWorkHours}
                cfTier={cfDetails?.tier || ""}
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
            <PaymentHistory cfDetails={cfDetails} />
          </Tabs.Panel>
        </Tabs>
      </div>
      <div className="row-start-2 col-start-10 col-span-2 flex flex-col items-center">
        <div className="w-fit py-5 px-10 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white flex flex-col items-center gap-3">
          <h3 className="text-xl font-bold">Total Pay</h3>
          <h1 className="text-xl font-bold">
            $
            {vendorPaymentEntries.length > 0
              ? calculateTotalPay(vendorPaymentEntries).toFixed(2)
              : "0.00"}
          </h1>
        </div>
      </div>
    </div>
  );
};
