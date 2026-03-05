"use client";

import { useParams, useSearchParams } from "next/navigation";
import PoseClient from "./PoseClient";
import "@tensorflow/tfjs-converter";

type TechniqueName = "jab" | "cross" | "hook" | "uppercut" | "guard";
type Stance = "orthodox" | "southpaw";

export default function TechniquePage() {
  const params = useParams<{ technique?: string }>();
  const searchParams = useSearchParams();

  const technique = ((params?.technique as string) ?? "jab") as TechniqueName;

  const stanceParam = searchParams.get("stance");
  const stance: Stance | undefined =
    stanceParam === "orthodox" || stanceParam === "southpaw"
      ? stanceParam
      : undefined;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4 capitalize">{technique}</h1>
      <PoseClient
        technique={technique}
        stance={technique === "jab" ? stance : undefined}
      />
    </div>
  );
}
