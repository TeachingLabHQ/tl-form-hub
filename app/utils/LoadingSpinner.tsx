import { Loader } from "@mantine/core";

interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner = ({ className = "" }: LoadingSpinnerProps) => (
  <div className="flex items-center justify-center min-h-screen">
  <Loader size="xl" />
</div>
);
