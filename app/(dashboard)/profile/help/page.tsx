import type { Metadata } from "next";
import { HelpClient } from "./client";

export const metadata: Metadata = {
  title: "Aide",
};

export default function HelpPage() {
  return <HelpClient />;
}
