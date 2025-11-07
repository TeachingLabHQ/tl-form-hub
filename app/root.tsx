// root.tsx
import React, { useContext, useEffect, useState } from "react";
import { withEmotionCache } from "@emotion/react";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { MetaFunction, LinksFunction } from "@remix-run/node"; // Depends on the runtime you choose
import "@mantine/dates/styles.css";
import { ServerStyleContext, ClientStyleContext } from "./context";
import { Navbar } from "./components/navigation/navbar";
import { Footer } from "./components/navigation/footer";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "./tailwind.css";
import { SessionProvider } from "./components/auth/context/sessionContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import BackgroundImg from "./assets/background.png";

export const meta: MetaFunction = () => {
  return [
    { charSet: "utf-8" },
    { title: "TL Form Hub" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
};

export const links: LinksFunction = () => {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap",
    },
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
