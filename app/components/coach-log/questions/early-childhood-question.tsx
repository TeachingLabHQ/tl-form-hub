import { MultiSelect, Select, Text } from "@mantine/core";
import {
  EC_TOUCHPOINT_OPTIONS,
  LEADER_CAPACITY_FOCUS_OPTIONS,
  MAX_TEACHER_STRATEGIES,
  TEACHER_STRATEGY_OPTIONS,
  ecShowsLeaderCapacity,
  ecShowsTeacherStrategies,
} from "../constants";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

const JES_GLOSSARY_URL =
  "https://docs.google.com/document/d/1WiGwohRHYmXeJztoUI0cplQ3g5inr8LjjyDChNQrDpY/edit?tab=t.0#heading=h.cslg194210x2";

type Props = {
  form: CoachLogForm;
};

/**
 * ELA Early Childhood Coach question set. The touchpoint type drives which
 * follow-ups appear: teacher-team support reveals the teacher-strategies
 * multi-select (capped at 5), and leader support reveals the leader
 * capacity-focus multi-select.
 */
export const EarlyChildhoodQuestion = ({ form }: Props) => {
  const touchpoint = form.values.ecTouchpoint;

  // Clear the now-hidden sub-questions when the touchpoint changes so stale
  // selections can't be submitted.
  const handleTouchpointChange = (value: string | null) => {
    const next = value ?? "";
    form.setFieldValue("ecTouchpoint", next);
    if (!ecShowsTeacherStrategies(next)) {
      form.setFieldValue("ecTeacherStrategies", []);
    }
    if (!ecShowsLeaderCapacity(next)) {
      form.setFieldValue("ecLeaderCapacityFocus", []);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          What type of touchpoint are you recording?*
        </h1>
        <Text size="sm" c="white">
          Please only select an option that includes school leader/school
          leadership team if your support included specific support for the
          school leader/school leadership team. If support was primarily for
          teacher teams, please select teacher team support only.
        </Text>
        <Select
          placeholder="Select a touchpoint type"
          data={EC_TOUCHPOINT_OPTIONS}
          value={touchpoint || null}
          onChange={handleTouchpointChange}
          error={form.errors.ecTouchpoint}
        />
      </div>

      {ecShowsTeacherStrategies(touchpoint) && (
        <div className="flex flex-col gap-1">
          <h1 className="font-medium text-lg">
            Please select the 1–5 strategies you used to build capacity with
            teacher teams today.*
          </h1>
          <MultiSelect
            placeholder="Select up to 5 strategies"
            data={TEACHER_STRATEGY_OPTIONS}
            maxValues={MAX_TEACHER_STRATEGIES}
            searchable
            {...form.getInputProps("ecTeacherStrategies")}
          />
        </div>
      )}

      {ecShowsLeaderCapacity(touchpoint) && (
        <div className="flex flex-col gap-1">
          <h1 className="font-medium text-lg">
            Please select the primary focus of the capacity building provided to
            leaders in this school.*
          </h1>
          <Text size="sm" c="white">
            See a detailed description of each capacity building focus in the{" "}
            <a
              href={JES_GLOSSARY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              Glossary of the JES Manual
            </a>
            .
          </Text>
          <MultiSelect
            placeholder="Select all that apply"
            data={LEADER_CAPACITY_FOCUS_OPTIONS}
            searchable
            {...form.getInputProps("ecLeaderCapacityFocus")}
          />
        </div>
      )}
    </>
  );
};
