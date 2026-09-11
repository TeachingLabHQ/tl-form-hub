import { MultiSelect, Select } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  JES_GLOSSARY_URL,
  MAX_READS_DISTRICT_CAPACITY_FOCUS,
  MAX_READS_SUSTAINABILITY,
  READS_DISTRICT_CAPACITY_FOCUS_OPTIONS,
  READS_DISTRICT_DATA_STRATEGY_SUBCOMPONENT_OPTIONS,
  READS_DISTRICT_FOCUS_DATA_STRATEGY,
  READS_DISTRICT_FOCUS_PL,
  READS_DISTRICT_FOCUS_SCHOOL_VISITS,
  READS_DISTRICT_FOCUS_STRATEGIC_PLANNING,
  READS_DISTRICT_PL_SUBCOMPONENT_OPTIONS,
  READS_DISTRICT_SCHOOL_VISITS_SUBCOMPONENT_OPTIONS,
  READS_DISTRICT_STRATEGIC_PLANNING_SUBCOMPONENT_OPTIONS,
  READS_SUSTAINABILITY_OPTIONS,
  SUSTAINABILITY_REFLECTION_TOOL_URL,
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

const SUSTAINABILITY_NOTE = (
  <>
    See a detailed description of each sustainability factor in the{" "}
    <a
      href={SUSTAINABILITY_REFLECTION_TOOL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold underline"
    >
      Sustainability Reflection Tool
    </a>
    .
  </>
);

/** NYC Reads district-support questions ("District team support" touchpoint). */
export const ReadsDistrictSupport = ({ form }: Props) => {
  const focus = form.values.readsDistrictCapacityFocus;

  // Deselecting a focus area hides its subcomponent question, so clear the
  // stale answer along with it rather than leaving it around unanswerable.
  const handleFocusChange = (value: string[]) => {
    form.setFieldValue("readsDistrictCapacityFocus", value);
    if (!value.includes(READS_DISTRICT_FOCUS_STRATEGIC_PLANNING)) {
      form.setFieldValue("readsDistrictFocusStrategicPlanningSubcomponent", "");
    }
    if (!value.includes(READS_DISTRICT_FOCUS_PL)) {
      form.setFieldValue("readsDistrictFocusPLSubcomponent", "");
    }
    if (!value.includes(READS_DISTRICT_FOCUS_DATA_STRATEGY)) {
      form.setFieldValue("readsDistrictFocusDataStrategySubcomponent", "");
    }
    if (!value.includes(READS_DISTRICT_FOCUS_SCHOOL_VISITS)) {
      form.setFieldValue("readsDistrictFocusSchoolVisitsSubcomponent", "");
    }
  };

  return (
    <>
      <QuestionField
        label="Please select the capacity building focus (up to 2) provided to district leaders.*"
        note={GLOSSARY_NOTE}
      >
        <MultiSelect
          placeholder="Select up to 2 focus areas"
          data={READS_DISTRICT_CAPACITY_FOCUS_OPTIONS}
          maxValues={MAX_READS_DISTRICT_CAPACITY_FOCUS}
          {...form.getInputProps("readsDistrictCapacityFocus")}
          onChange={handleFocusChange}
        />
      </QuestionField>

      {focus.includes(READS_DISTRICT_FOCUS_STRATEGIC_PLANNING) && (
        <QuestionField
          label="Based on the focus area selected above, Strategic planning, select 1 subcomponent that most directly applies to your support delivered today.*"
          note={GLOSSARY_NOTE}
        >
          <Select
            placeholder="Select a subcomponent"
            data={READS_DISTRICT_STRATEGIC_PLANNING_SUBCOMPONENT_OPTIONS}
            {...form.getInputProps("readsDistrictFocusStrategicPlanningSubcomponent")}
          />
        </QuestionField>
      )}

      {focus.includes(READS_DISTRICT_FOCUS_PL) && (
        <QuestionField
          label="Based on the focus area selected above, Professional learning, select 1 subcomponent that most directly applies to your support delivered today.*"
          note={GLOSSARY_NOTE}
        >
          <Select
            placeholder="Select a subcomponent"
            data={READS_DISTRICT_PL_SUBCOMPONENT_OPTIONS}
            {...form.getInputProps("readsDistrictFocusPLSubcomponent")}
          />
        </QuestionField>
      )}

      {focus.includes(READS_DISTRICT_FOCUS_DATA_STRATEGY) && (
        <QuestionField
          label="Based on the focus area selected above, Data strategy meetings, select 1 subcomponent that most directly applies to your support delivered today.*"
          note={GLOSSARY_NOTE}
        >
          <Select
            placeholder="Select a subcomponent"
            data={READS_DISTRICT_DATA_STRATEGY_SUBCOMPONENT_OPTIONS}
            {...form.getInputProps("readsDistrictFocusDataStrategySubcomponent")}
          />
        </QuestionField>
      )}

      {focus.includes(READS_DISTRICT_FOCUS_SCHOOL_VISITS) && (
        <QuestionField
          label="Based on the focus area selected above, School-based learning visits and classroom visits, select 1 subcomponent that most directly applies to your support delivered today.*"
          note={GLOSSARY_NOTE}
        >
          <Select
            placeholder="Select a subcomponent"
            data={READS_DISTRICT_SCHOOL_VISITS_SUBCOMPONENT_OPTIONS}
            {...form.getInputProps("readsDistrictFocusSchoolVisitsSubcomponent")}
          />
        </QuestionField>
      )}

      <QuestionField
        label="Select at most 2 conditions of sustainability that were most closely aligned to the support given today.*"
        note={SUSTAINABILITY_NOTE}
      >
        <MultiSelect
          placeholder="Select up to 2 conditions"
          data={READS_SUSTAINABILITY_OPTIONS}
          maxValues={MAX_READS_SUSTAINABILITY}
          {...form.getInputProps("readsDistrictSustainability")}
        />
      </QuestionField>
    </>
  );
};
