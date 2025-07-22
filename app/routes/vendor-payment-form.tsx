import { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useSession } from "~/components/auth/hooks/useSession";
import { AccessDeniedState } from "~/components/vendor-payment-form/access-denied-state";
import { VendorPaymentForm } from "~/components/vendor-payment-form/vendor-payment-form";
import { CoachFacilitatorDetails, coachFacilitatorRepository } from "~/domains/coachFacilitator/repository";
import { coachFacilitatorService } from "~/domains/coachFacilitator/service";
import { projectRepository } from "~/domains/project/repository";
import { projectService } from "~/domains/project/service";
import { vendorPaymentRepository } from "~/domains/vendor-payment/repository";
import { vendorPaymentService } from "~/domains/vendor-payment/service";
import { LoadingSpinner } from "~/utils/LoadingSpinner";
import { createSupabaseServerClient } from "../../supabase/supabase.server";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient } = createSupabaseServerClient(request);

  // Get cfDetails from session or wherever it's stored
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  const cfDetails = session?.user?.email
    ? {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || "",
        tier: session.user.user_metadata?.tier || "",
      }
    : null;

  if (!cfDetails?.email) {
    return json({ paymentRequestHistory: [], projects: [] });
  }

  const newVendorPaymentService = vendorPaymentService(vendorPaymentRepository(supabaseClient));
  const { data: paymentRequestHistory, error: paymentRequestHistoryError } = await newVendorPaymentService.getSubmissionsByEmail(
    cfDetails.email
  );
  if (paymentRequestHistoryError) {
    throw new Error("Failed to fetch payment history");
  }

  const newProjectService = projectService(projectRepository());

  const { data: projects } = await newProjectService.fetchProgramProjects();
  console.log(projects);
  return json({ paymentRequestHistory, projects });
};

export default function VendorPaymentFormRoute() {
  const { isAuthenticated, errorMessage, session, mondayProfile } =
    useSession();
  const [isCoachOrFacilitator, setIsCoachOrFacilitator] = useState<
    boolean | null
  >(null);
  const [cfDetails, setCfDetails] = useState<CoachFacilitatorDetails | null>(null);

  useEffect(() => {
    const checkCoachOrFacilitator = async () => {
      if (mondayProfile?.email) {
        const newCoachFacilitatorService = coachFacilitatorService(
          coachFacilitatorRepository()
        );
        const { data, error } =
          await newCoachFacilitatorService.fetchCoachFacilitatorDetails(
            mondayProfile?.email
          );
        setIsCoachOrFacilitator(!!data);
        setCfDetails(data || null);
        // For testing purposes, allow YC and Finance to access the form
        if(mondayProfile?.email === "yancheng.pan@teachinglab.org"){
          setIsCoachOrFacilitator(true);
          setCfDetails({
            email: "yancheng.pan@teachinglab.org",
            name: "Yancheng Pan",
            tier: [{
              type: "facilitator",
              value: "Tier 1",
            },
            {
              type: "copyRightPermissions",
              value: "Tier 2",
            },
            {
              type: "copyEditor",
              value: "Tier 2",
            },
            {
              type: "presentationDesign",
              value: "Tier 2",
            },
            {
              type: "contentDeveloper",
              value: "Tier 2",
            },
            
            ],
          });
        }
         else if(mondayProfile?.email === "daissan.colbert@teachinglab.org"){
          setIsCoachOrFacilitator(true);
          setCfDetails({
            email: "daissan.colbert@teachinglab.org",
            name: "Daisann Colbert",
            tier: [{
              type: "facilitator",
              value: "Tier 2",
            },
            {
              type: "copyRightPermissions",
              value: "Tier 2",
            },
            {
              type: "copyEditor",
              value: "Tier 2",
            },
            {
              type: "presentationDesign",
              value: "Tier 2",
            },
            {
              type: "contentDeveloper",
              value: "Tier 2",
            },
            
            ],
          });
        }
        else if(mondayProfile?.email === "samantha.wilner@teachinglab.org"){
          setIsCoachOrFacilitator(true);
          setCfDetails({
            email: "samantha.wilner@teachinglab.org",
            name: "Samantha Wilner",
            tier: [{
              type: "facilitator",
              value: "Tier 1",
            },
            {
              type: "contentDeveloper",
              value: "Tier 1",
            },
            {
              type: "copyEditor",
              value: "Tier 1",
            },
            {
              type: "copyRightPermissions",
              value: "Tier 1",
            },
            {
              type: "presentationDesign",
              value: "Tier 1",
            },
            {
              type: "dataEvaluation",
              value: "Tier 1",
            },
            ],
          });
        }
       else if(mondayProfile?.email === "tonia.lonie@teachinglab.org"){
          setIsCoachOrFacilitator(true);
          setCfDetails({
            email: "tonia.lonie@teachinglab.org",
            name: "Tonia Lonie",
            tier: [{
              type: "facilitator",
              value: "Tier 1",
            },
            {
              type: "contentDeveloper",
              value: "Tier 1",
            },
            {
              type: "copyEditor",
              value: "Tier 1",
            },
            {
              type: "copyRightPermissions",
              value: "Tier 1",
            },
            {
              type: "presentationDesign",
              value: "Tier 1",
            },
            {
              type: "dataEvaluation",
              value: "Tier 1",
            },
            ],
          });
        }
        else if(mondayProfile?.email === "ellen.greig@teachinglab.org"){
          setIsCoachOrFacilitator(true);
          setCfDetails({
            email: "ellen.greig@teachinglab.org",
            name: "Ellen Greig",
            tier: [{
              type: "facilitator",
              value: "Tier 2",
            },
            {
              type: "copyRightPermissions",
              value: "Tier 2",
            },
            {
              type: "copyEditor",
              value: "Tier 2",
            },
            {
              type: "presentationDesign",
              value: "Tier 2",
            },
            {
              type: "contentDeveloper",
              value: "Tier 2",
            },
            
            ],
          });
        }
       
      }
    };

    checkCoachOrFacilitator();
  }, [mondayProfile?.email]);
  if (isCoachOrFacilitator === null) {
    return <LoadingSpinner />;
  }

  if (isCoachOrFacilitator === false) {
    return <AccessDeniedState errorMessage="This form is only accessible to coaches and facilitators. If you believe this is an error, please contact your administrator." />;
  }

  return (
    <div className="h-full w-full overflow-auto flex items-center justify-center">
      <VendorPaymentForm cfDetails={cfDetails} />
    </div>
  );
}
