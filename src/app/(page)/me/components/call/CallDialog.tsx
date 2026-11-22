"use client";

import { useCallStore } from "@/src/common/store/useCallStore";
import CallDialog1vs1 from "./CallDialog1vs1";

export default function CallDialog() {
  const status = useCallStore((s) => s.status);

  if (status === "idle") return null;

  return <CallDialog1vs1 />;
}
