import { Loader, Select, Text } from "@mantine/core";

type Props = {
  value: string;
  options: { value: string; label: string }[];
  loading: boolean;
  onChange: (value: string) => void;
};

/**
 * Coach-identity override — TESTING ONLY. Rendered just for allow-listed admins
 * (see canOverrideCoach). Picking a coach here replaces the logged-in identity
 * (name + Monday id) used for session dates, the duplicate guard, and submission,
 * so the tester can submit a log as any coach. Options come from Monday users;
 * each option's value is the coach's Monday profile id.
 */
export const CoachNameQuestion = ({
  value,
  options,
  loading,
  onChange,
}: Props) => {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">Coach (testing override)</h1>
      <Text size="sm" c="white">
        Testing only: select a coach to preview which session dates would
        populate for them. Leave blank to use your own profile.
      </Text>
      <Select
        value={value || null}
        onChange={(val) => onChange(val || "")}
        placeholder={loading ? "Loading coaches..." : "Select a coach"}
        data={options}
        searchable
        clearable
        disabled={loading}
        rightSection={loading ? <Loader size="xs" /> : undefined}
      />
    </div>
  );
};
