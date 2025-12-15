import { Select } from "@mantine/core";
import { compareTwoStrings } from "./utils";

export type ExecutiveAssistantMapping = {
  executiveAssistantEmail: string;
  executiveName: string;
  executiveEmail: string;
  executiveId: string;
};

type Props = {
  executiveAssistantMappings: ExecutiveAssistantMapping[];
  userEmail: string;
  onSelectExecutive: (executiveName: string | null) => void;
  isValidated: boolean | null;
  submittedForYourself: boolean | null;
};

export const ExecutiveAssistantSelector = ({
  executiveAssistantMappings,
  userEmail,
  onSelectExecutive,
  isValidated,
  submittedForYourself,
}: Props) => {
  const mapping = executiveAssistantMappings.find((m) =>
    compareTwoStrings(m.executiveAssistantEmail, userEmail)
  );

  if (!mapping) return null;

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">
        Who are you submitting this form for?
      </h1>
      <Select
        data={[
          { value: "", label: "Myself" },
          { value: mapping.executiveName, label: mapping.executiveName },
        ]}
        defaultValue={""}
        allowDeselect={false}
        onChange={onSelectExecutive}
        placeholder="Select who you're submitting for"
      />
    </div>
  );
};
