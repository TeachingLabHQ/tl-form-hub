import { Accordion } from "@mantine/core";
import { useRevalidator } from "@remix-run/react";
import { CoachFacilitatorDetails } from "~/domains/coachFacilitator/repository";
import { PaymentHistoryItem } from "./payment-history-item";
import { VendorPaymentSubmissionWithEntries } from "~/domains/vendor-payment/model";

type PaymentHistoryProps = {
  cfDetails: CoachFacilitatorDetails | null;
  paymentRequestHistory: VendorPaymentSubmissionWithEntries[];
};

export const PaymentHistory = ({
  cfDetails,
  paymentRequestHistory,
}: PaymentHistoryProps) => {
  const { revalidate } = useRevalidator();

  if (!paymentRequestHistory?.length) {
    return (
      <div className="text-white text-center py-8">
        No payment history found
      </div>
    );
  }

  return (
    <Accordion>
      {paymentRequestHistory.map((paymentRequest) => (
        <PaymentHistoryItem key={paymentRequest.id} paymentRequest={paymentRequest} />
      ))}
    </Accordion>
  );
};
