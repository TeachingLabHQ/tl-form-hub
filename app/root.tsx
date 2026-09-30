// root.tsx
import React, { useContext, useEffect, useState } from "react";
import { withEmotionCache } from "@emotion/react";
import "./mantine-styles";
import "@mantine/notifications/styles.css";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { MetaFunction } from "@remix-run/node"; // Depends on the runtime you choose
import "@mantine/dates/styles.css";
import { ServerStyleContext, ClientStyleContext } from "./context";
import { Navbar } from "./components/navigation/navbar";
import { Footer } from "./components/navigation/footer";
import { NavigationProgress } from "./components/navigation/navigation-progress";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "./tailwind.css";
import { SessionProvider } from "./components/auth/context/sessionContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import BackgroundImg from "./assets/background.webp";

export const meta: MetaFunction = () => {
  return [
    { charSet: "utf-8" },
    { title: "TL Form Hub" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body
        style={{
          backgroundImage: `url(${BackgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
        <MantineProvider withGlobalClasses={false}>
          <Notifications />
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <NavigationProgress />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <ProtectedRoute>
          <div className="flex-grow">
            <Outlet />
          </div>
        </ProtectedRoute>
        <Footer />
      </div>
    </SessionProvider>
  );
}
