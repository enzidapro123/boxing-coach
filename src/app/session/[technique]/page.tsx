"use client";

import { useParams } from "next/navigation";
import PoseClient from "./PoseClient";

type TechniqueName = "jab" | "cross" | "hook" | "uppercut";

export default function TechniquePage() {
  // In the App Router, useParams() is the safe way on the client
  const params = useParams<{ technique?: string }>();
  const technique = ((params?.technique as string) ?? "jab") as TechniqueName;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4 capitalize">{technique}</h1>
      <PoseClient technique={technique} />
    </div>
  );
}
