"use client";
import React from "react";
import InGameModal from "./InGameModal";
import SabotageOverlay from "./SabotageOverlay";

export default function GameModalHost() {
  return (
    <>
      <InGameModal />
      <SabotageOverlay />
    </>
  );
}
