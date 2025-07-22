import { Accordion, ActionIcon, Group, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useFetcher, useRevalidator } from "@remix-run/react";
import { VendorPaymentSubmissionWithEntries } from "~/domains/vendor-payment/model";
import { notifications } from "@mantine/notifications";
import { useEffect } from 'react';

type PaymentHistoryItemProps = {
  paymentRequest: VendorPaymentSubmissionWithEntries;
};

export const PaymentHistoryItem = ({
  paymentRequest,
}: PaymentHistoryItemProps) => {
  const fetcher = useFetcher<{ success?: boolean; error?: string; message?: string }>();
  const { revalidate } = useRevalidator();

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this submission?")) {
      fetcher.submit(
        { paymentRequestId: paymentRequest.id },
        {
          method: "DELETE",
          action: "/api/vendor-payment/delete",
          encType: "application/json",
        }
      );
    }
  };

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        notifications.show({
          title: 'Submission Deleted',
          message: 'The payment submission has been successfully deleted.',
          color: 'green',
        });
        console.log("Submission successful, revalidating...");
        revalidate();
      } else if (fetcher.data.error) {
        notifications.show({
          title: 'Deletion Failed',
          message: fetcher.data.error || 'Could not delete the submission. Please try again.',
          color: 'red',
        });
        console.log("Deletion failed, server error:", fetcher.data.error);
      }
    }
  }, [fetcher.state, fetcher.data, revalidate]);

  return (
    <Accordion.Item value={paymentRequest.id.toString()}>
      <Accordion.Control className="hover:bg-white/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-white">
              {dayjs(paymentRequest.submission_date).format("MMM D, YYYY")}
            </span>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              loading={fetcher.state === "submitting"}
              className="opacity-60 hover:opacity-100"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </div>
          <span className="text-white font-bold">
            ${paymentRequest.total_pay.toFixed(2)}
          </span>
        </div>
      </Accordion.Control>
      <Accordion.Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-2 px-4 w-1/4">Task</th>
                <th className="text-left py-2 px-4">Project</th>
                <th className="text-right py-2 px-4">Hours</th>
                <th className="text-right py-2 px-4">Rate</th>
                <th className="text-right py-2 px-4">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {paymentRequest.entries.map((entry, index) => (
                <tr
                  key={index}
                  className="border-b border-white/10 last:border-0"
                >
                  <td className="py-3 px-4 w-1/4">{entry.task_name}</td>
                  <td className="py-3 px-4">{entry.project_name}</td>
                  <td className="py-3 px-4 text-right">{entry.work_hours}</td>
                  <td className="py-3 px-4 text-right">${entry.rate}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    ${(entry.work_hours * entry.rate).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/20">
                <td colSpan={4} className="py-2 px-4 text-right font-bold">
                  Total:
                </td>
                <td className="py-2 px-4 text-right font-bold">
                  ${paymentRequest.total_pay.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  );
};
