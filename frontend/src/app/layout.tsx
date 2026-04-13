import type { Metadata } from "next";
import "./globals.css";
import NavWrapper from "../components/NavWrapper";
import ChatWidget from "../components/ChatWidget";
import CustomerSupportWidget from "../components/CustomerSupportWidget";

export const metadata: Metadata = {
  title: "FocusPath | AI Career Engine",
  description: "AI-powered career guidance, scheduling, and progress tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <NavWrapper>
        {children}
        <ChatWidget />
        <CustomerSupportWidget />
      </NavWrapper>
    </html>
  );
}
