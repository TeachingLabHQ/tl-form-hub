// Per-component Mantine styles instead of the full @mantine/core/styles.css
// bundle (~230 kB), which ships CSS for every Mantine component whether used or
// not. Order follows the full bundle, so specificity ties resolve the same way.
//
// Using a new Mantine component? Add its stylesheet here (plus any it builds on,
// e.g. Select needs Combobox + Input + Popover + ScrollArea); without it the
// component renders unstyled.
import "@mantine/core/styles/global.css";
import "@mantine/core/styles/ScrollArea.css";
import "@mantine/core/styles/UnstyledButton.css";
import "@mantine/core/styles/VisuallyHidden.css";
import "@mantine/core/styles/Paper.css";
import "@mantine/core/styles/Overlay.css";
import "@mantine/core/styles/Popover.css";
import "@mantine/core/styles/Loader.css";
import "@mantine/core/styles/ActionIcon.css";
import "@mantine/core/styles/CloseButton.css";
import "@mantine/core/styles/Input.css";
import "@mantine/core/styles/Accordion.css";
import "@mantine/core/styles/Alert.css";
import "@mantine/core/styles/Text.css";
import "@mantine/core/styles/Combobox.css";
import "@mantine/core/styles/Button.css";
import "@mantine/core/styles/Card.css";
import "@mantine/core/styles/Divider.css";
import "@mantine/core/styles/Pill.css";
import "@mantine/core/styles/PillsInput.css";
import "@mantine/core/styles/Notification.css";
import "@mantine/core/styles/NumberInput.css";
import "@mantine/core/styles/Tabs.css";
import "@mantine/core/styles/ThemeIcon.css";
import "@mantine/core/styles/Title.css";
