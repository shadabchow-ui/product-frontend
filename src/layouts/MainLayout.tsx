import React from "react";
import { Outlet } from "react-router-dom";
import { NavigationSection } from "../screens/Shop/sections/NavigationSection";
import { FooterSection } from "../screens/Shop/sections/FooterSection";

export default function MainLayout() {
  return (
    <div className="bg-white w-full min-h-screen">
      <NavigationSection />
      <Outlet />
      <FooterSection />
    </div>
  );
}
