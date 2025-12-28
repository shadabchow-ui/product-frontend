import React from "react";
import { ASSISTANT_NAME, useAssistant } from "./AssistantContext";
import "./assistantDrawer.css";

export function AssistantLauncher({ label = ASSISTANT_NAME }: { label?: string }) {
  const { setOpen } = useAssistant();

  const resolvedLabel =
    !label || label.trim().toLowerCase() === "ask" ? ASSISTANT_NAME : label;

  return (
    <button className="asstFabLeft" type="button" onClick={() => setOpen(true)}>
      {resolvedLabel}
    </button>
  );
}
