import { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AccessDeniedState } from "~/components/vendor-payment-form/access-denied-state";
import { VendorPaymentForm } from "~/components/vendor-payment-form/vendor-payment-form";
import { CoachFacilitatorDetails, coachFacilitatorRepository } from "~/domains/coachFacilitator/repository";
import { coachFacilitatorService } from "~/domains/coachFacilitator/service";
import { projectRepository } from "~/domains/project/repository";
import { projectService } from "~/domains/project/service";
import { vendorPaymentRepository } from "~/domains/vendor-payment/repository";
import { vendorPaymentService } from "~/domains/vendor-payment/service";
import { createSupabaseServerClient } from "../../supabase/supabase.server";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);

  // Get cfDetails from session or wherever it's stored
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  const supabaseUser = session?.user?.email
    ? {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || "",
        tier: session.user.user_metadata?.tier || "",
      }
    : null;

  if (!supabaseUser?.email) {
    return json(
      { paymentRequestHistory: [], projects: [], cfDetails: null },
      { headers }
    );
  }

  // Determine coach/facilitator access (server-side)
  const newCoachFacilitatorService = coachFacilitatorService(
    coachFacilitatorRepository()
  );
  const { data: fetchedCfDetails } =
    await newCoachFacilitatorService.fetchCoachFacilitatorDetails(
      supabaseUser.email
    );

  // For testing purposes, allow specific emails to access the form
  const overrides: Record<string, CoachFacilitatorDetails> = {
    "yancheng.pan@teachinglab.org": {
      email: "yancheng.pan@teachinglab.org",
      name: "Yancheng Pan",
      tier: [
        { type: "facilitator", value: "Tier 1" },
        { type: "copyRightPermissions", value: "Tier 2" },
        { type: "copyEditor", value: "Tier 2" },
        { type: "presentationDesign", value: "Tier 2" },
        { type: "contentDeveloper", value: "Tier 4" },
      ],
    },
    "daissan.colbert@teachinglab.org": {
      email: "daissan.colbert@teachinglab.org",
      name: "Daisann Colbert",
      tier: [
        { type: "facilitator", value: "Tier 2" },
        { type: "copyRightPermissions", value: "Tier 2" },
        { type: "copyEditor", value: "Tier 2" },
        { type: "presentationDesign", value: "Tier 2" },
        { type: "contentDeveloper", value: "Tier 2" },
      ],
    },
    "samantha.wilner@teachinglab.org": {
      email: "samantha.wilner@teachinglab.org",
      name: "Samantha Wilner",
      tier: [
        { type: "facilitator", value: "Tier 1" },
        { type: "contentDeveloper", value: "Tier 1" },
        { type: "copyEditor", value: "Tier 1" },
        { type: "copyRightPermissions", value: "Tier 1" },
        { type: "presentationDesign", value: "Tier 1" },
        { type: "dataEvaluation", value: "Tier 1" },
      ],
    },
    "tonia.lonie@teachinglab.org": {
      email: "tonia.lonie@teachinglab.org",
      name: "Tonia Lonie",
      tier: [
        { type: "facilitator", value: "Tier 1" },
        { type: "contentDeveloper", value: "Tier 1" },
        { type: "copyEditor", value: "Tier 1" },
        { type: "copyRightPermissions", value: "Tier 1" },
        { type: "presentationDesign", value: "Tier 1" },
        { type: "dataEvaluation", value: "Tier 1" },
      ],
    },
    "ellen.greig@teachinglab.org": {
      email: "ellen.greig@teachinglab.org",
      name: "Ellen Greig",
      tier: [
        { type: "facilitator", value: "Tier 2" },
        { type: "copyRightPermissions", value: "Tier 2" },
        { type: "copyEditor", value: "Tier 2" },
        { type: "presentationDesign", value: "Tier 2" },
        { type: "contentDeveloper", value: "Tier 2" },
      ],
    },
  };

  const cfDetails: CoachFacilitatorDetails | null =
    fetchedCfDetails ?? overrides[supabaseUser.email] ?? null;

  const newVendorPaymentService = vendorPaymentService(vendorPaymentRepository(supabaseClient));
  const { data: paymentRequestHistory, error: paymentRequestHistoryError } = await newVendorPaymentService.getSubmissionsByEmail(
    supabaseUser.email
  );
  if (paymentRequestHistoryError) {
    throw new Error("Failed to fetch payment history");
  }

  const newProjectService = projectService(projectRepository());

  const { data: projects } = await newProjectService.fetchProjectSourceNames();
  return json({ paymentRequestHistory, projects, cfDetails }, { headers });
};

export default function VendorPaymentFormRoute() {
  const { cfDetails } = useLoaderData<typeof loader>();

  if (!cfDetails) {
    return <AccessDeniedState errorMessage="This form is only accessible to coaches and facilitators. If you believe this is an error, please contact your administrator." />;
  }

  return (
    <div className="h-full w-full overflow-auto flex items-center justify-center">
      <VendorPaymentForm cfDetails={cfDetails} />
    </div>
  );
}
