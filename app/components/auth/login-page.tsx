import {
  Button,
  Card,
  Container,
  Divider,
  Flex,
  Text,
  Title,
  Alert,
} from "@mantine/core";
import TLLogo from "../../assets/tllogo.png";
import BackgroundImg from "../../assets/background.png";
import { useEffect } from "react";
import { useSession } from "./hooks/useSession";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import GoogleLogo from "../../assets/google.svg";
import { supabase } from "../../../supabase/supabase.client";
import { IconAlertCircle } from "@tabler/icons-react";

export const LoginPage = ({ errorMessage }: { errorMessage: string }) => {
  // Session initialization happens in SessionProvider; no need to fetch session here.

  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      console.error("Login error:", error);
      alert(`Login failed: ${error.message}`);
    } else {
      console.log("Login successful:", data);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl" radius="lg">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo */}
          <img
            src={TLLogo}
            alt="Teaching Lab Logo"
            className="h-16 w-auto mb-2"
          />

          <Title
            order={1}
            className="text-center font-poppins text-2xl md:text-3xl font-bold"
          >
            Welcome Back
          </Title>

          <Text className="text-center text-gray-600 mb-6">
            Sign in to access your Teaching Lab account
          </Text>

          {/* Error Message */}
          {errorMessage && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Authentication Error"
              color="red"
              variant="filled"
              className="w-full mb-4"
            >
              {errorMessage}
            </Alert>
          )}

          <Button
            fullWidth
            className="h-12 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors duration-200 shadow-sm"
            onClick={handleGoogleLogin}
          >
            <div className="flex items-center justify-center space-x-3">
              <img src={GoogleLogo} alt="Google Logo" className="h-5 w-5" />
              <span className="font-poppins font-medium text-gray-700">
                Sign in with Google
              </span>
            </div>
          </Button>

          <Text size="sm" className="text-center text-gray-500 mt-4">
            Only Teaching Lab email addresses are permitted
          </Text>
        </div>
      </Card>
    </div>
  );
};
