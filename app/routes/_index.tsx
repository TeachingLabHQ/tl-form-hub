import React from "react";
import BackgroundImg from "../assets/background.png";
import { ProjectLogForm } from "../components/weekly-project-log/project-log-form";
import { LoaderFunctionArgs } from "@remix-run/node";
import { projectRepository } from "~/domains/project/repository";
import { projectService } from "~/domains/project/service";
import { useSession } from "~/components/hooks/useSession";
import { useLoaderData } from "@remix-run/react";
export const headers = () => {
  return {
    "Cross-Origin-Opener-Policy": "unsafe-none",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
};
export const loader = async (args: LoaderFunctionArgs) => {
  const newProjectService = projectService(projectRepository());

  const { data: programProjectsWithBudgetedHours } =
    await newProjectService.fetchProgramProjectsWithHours();
  const { data: programProjectsStaffing } =
    await newProjectService.fetchProgramProjectsStaffing();
  return { programProjectsWithBudgetedHours, programProjectsStaffing };
};
export default function Index() {
  return (
    <div
      className="h-screen w-full bg-no-repeat bg-cover"
      style={{ backgroundImage: `url(${BackgroundImg})` }}
    >
      <ProjectLogForm />

      {/* Content goes here */}
    </div>
  );
}
