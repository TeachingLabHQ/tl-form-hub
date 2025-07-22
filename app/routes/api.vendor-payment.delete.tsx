import type { ActionFunctionArgs } from "@vercel/remix";
import { json } from "@remix-run/node";
import { vendorPaymentRepository } from "~/domains/vendor-payment/repository";
import { vendorPaymentService } from "~/domains/vendor-payment/service";
import { createSupabaseServerClient } from "../../supabase/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "DELETE") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = await request.json();
  const { paymentRequestId } = body;

  if (!paymentRequestId) {
    return json({ error: "paymentRequestId is required" }, { status: 400 });
  }

  try {
    const { supabaseClient } = createSupabaseServerClient(request);
    const service = vendorPaymentService(vendorPaymentRepository(supabaseClient));
    const { error } = await service.deleteSubmission(paymentRequestId);
    if (error) {
      throw error;
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return json({ error: "Failed to delete submission" }, { status: 500 });
  }
};
