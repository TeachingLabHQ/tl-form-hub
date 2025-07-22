import { Text } from "@mantine/core";

export const AccessDeniedState = ({errorMessage}: {errorMessage: string}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-lg shadow-lg max-w-md w-full">
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        Access Denied
      </h2>
      <p className="text-gray-700">
        {errorMessage}
        </p>
      </div>
    </div>
  );
};
