import tlLogo from "~/assets/tllogo.png";

interface LoadingSpinnerProps {
  className?: string;
  message?: string;
}

export const LoadingSpinner = ({ className = "", message }: LoadingSpinnerProps) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-6">
    <div className="animate-spin">
      <img 
        src={tlLogo} 
        alt="Loading" 
        className="w-20 h-20 object-contain"
        style={{
          filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))"
        }}
      />
    </div>
    {message && (
      <p className="text-white text-lg font-medium animate-pulse">
        {message}
      </p>
    )}
  </div>
);
