import { Loader } from "@mantine/core";

interface LoadingSpinnerProps {
  className?: string;
  message?: string;
}

export const LoadingSpinner = ({ className = "", message }: LoadingSpinnerProps) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4">
    <Loader size="xl" />
    {message && <p className="text-white text-lg">{message}</p>}
  </div>
);
