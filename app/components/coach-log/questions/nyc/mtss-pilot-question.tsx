import { Select, Text, Textarea } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import { MTSS_PRACTICE_STATEMENTS, MTSS_RESPONSE_OPTIONS } from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/**
 * MTSS Pilot Schools block — shown only for teacher/leader touchpoints at a
 * pilot school. Each of the seven practice statements is rated, with an
 * optional free-text context box at the end.
 */
export const MtssPilotQuestion = ({ form }: Props) => {
  const responsesError = form.errors.mtssPracticesResponses;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white/10 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-xl">MTSS Pilot Schools</h1>
        <Text size="sm" c="white">
          For each practice below, select how consistently it is in place at this
          school.
        </Text>
        {responsesError ? (
          <Text size="sm" c="red">
            {responsesError}
          </Text>
        ) : null}
      </div>

      {MTSS_PRACTICE_STATEMENTS.map((statement, index) => (
        <QuestionField key={index} label={`${index + 1}. ${statement}`}>
          <Select
            placeholder="Select a response"
            data={MTSS_RESPONSE_OPTIONS}
            value={form.values.mtssPracticesResponses[index] || null}
            onChange={(value) =>
              form.setFieldValue(
                `mtssPracticesResponses.${index}`,
                value ?? ""
              )
            }
          />
        </QuestionField>
      ))}

      <QuestionField label="Please share any additional context regarding this school's MTSS practices.">
        <Textarea
          placeholder="Optional"
          autosize
          minRows={3}
          {...form.getInputProps("mtssAdditionalContext")}
        />
      </QuestionField>
    </div>
  );
};
