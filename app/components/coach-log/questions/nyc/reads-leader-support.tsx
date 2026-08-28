import { MultiSelect, Select } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  FREQUENCY_OPTIONS,
  JES_GLOSSARY_URL,
  MAX_READS_LEADER_CAPACITY_FOCUS,
  MAX_READS_SUSTAINABILITY,
  READS_LEADER_CAPACITY_FOCUS_OPTIONS,
  READS_LEADER_FOCUS_MODELING,
  READS_LEADER_FOCUS_PL,
  READS_LEADER_FOCUS_SCHOOL_VISITS,
  READS_LEADER_MODELING_SUBCOMPONENT_OPTIONS,
  READS_LEADER_PL_SUBCOMPONENT_OPTIONS,
  READS_LEADER_SCHOOL_VISITS_SUBCOMPONENT_OPTIONS,
  READS_LEADER_VISIT_DURATION_OPTIONS,
  READS_SUSTAINABILITY_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

const GLOSSARY_NOTE = (
  <>
    See a detailed description of each capacity-building focus in the{" "}
    <a
      href={JES_GLOSSARY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold underline"
    >
      Key Concepts of the JES Manual
    </a>
    .
  </>
);

/** NYC Reads school-leader support questions ("School Leader/Leadership team support" touchpoint). */
export const ReadsLeaderSupport = ({ form }: Props) => {
  const focus = form.values.readsLeaderCapacityFocus;

  return (
    <>
      <QuestionField label="What was the duration of your visit with school leaders in hours? Please round to the nearest option.*">
        <Select
          placeholder="Select duration"
          data={READS_LEADER_VISIT_DURATION_OPTIONS}
          {...form.getInputProps("readsLeaderVisitDuration")}
        />
      </QuestionField>

      <QuestionField
        label="Please select the primary focus(es) of the capacity building for leaders in this school. Select up to 2 focus areas.*"
        note={GLOSSARY_NOTE}
      >
        <MultiSelect
          placeholder="Select up to 2 focus areas"
          data={READS_LEADER_CAPACITY_FOCUS_OPTIONS}
          maxValues={MAX_READS_LEADER_CAPACITY_FOCUS}
          {...form.getInputProps("readsLeaderCapacityFocus")}
        />
      </QuestionField>

      {focus.includes(READS_LEADER_FOCUS_SCHOOL_VISITS) && (
        <QuestionField
          label="Based on the focus area selected above, School-based learning visits and classroom visits, select 1 subcomponent that most directly applies to your support delivered today.*"
          note={GLOSSARY_NOTE}
        >
          <Select
            placeholder="Select a subcomponent"
            data={READS_LEADER_SCHOOL_VISITS_SUBCOMPONENT_OPTIONS}
            {...form.getInputProps("readsLeaderFocusSchoolVisitsSubcomponent")}
          />
        </QuestionField>
      )}

      {focus.includes(READS_LEADER_FOCUS_MODELING) && (
        <QuestionField
          label="Based on the focus area selected above, Modeling and gradual release of MTSS data team meetings, select 1 subcomponent that most directly applies to your support delivered today.*"
          note={GLOSSARY_NOTE}
        >
          <Select
            placeholder="Select a subcomponent"
            data={READS_LEADER_MODELING_SUBCOMPONENT_OPTIONS}
            {...form.getInputProps("readsLeaderFocusModelingSubcomponent")}
          />
        </QuestionField>
      )}

      {focus.includes(READS_LEADER_FOCUS_PL) && (
        <QuestionField
          label="Based on the focus area selected above, Professional learning, select 1 subcomponent that most directly applies to your support delivered today.*"
          note={GLOSSARY_NOTE}
        >
          <Select
            placeholder="Select a subcomponent"
            data={READS_LEADER_PL_SUBCOMPONENT_OPTIONS}
            {...form.getInputProps("readsLeaderFocusPLSubcomponent")}
          />
        </QuestionField>
      )}

      <QuestionField
        label="Select at most 2 conditions of sustainability that were most closely aligned to the support given today.*"
        note="See a detailed description of each sustainability factor in the Sustainability Reflection Tool."
      >
        <MultiSelect
          placeholder="Select up to 2 conditions"
          data={READS_SUSTAINABILITY_OPTIONS}
          maxValues={MAX_READS_SUSTAINABILITY}
          {...form.getInputProps("readsLeaderSustainability")}
        />
      </QuestionField>

      <QuestionField label="How often were district leaders present and engaged during your support time with school leaders?*">
        <Select
          placeholder="Select a response"
          data={FREQUENCY_OPTIONS}
          {...form.getInputProps("readsLeaderDistrictPresence")}
        />
      </QuestionField>
    </>
  );
};
