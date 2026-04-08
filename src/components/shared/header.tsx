"use client";

import { Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  subtitle?: string;
}

export function Header({ onMenuClick, onSettingsClick, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-5 w-5 text-gray-600" />
      </Button>
      <div className="text-center">
        <h1 className="text-lg font-bold tracking-tight">
          LIFE <span className="font-black">BUILDER</span>
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={onSettingsClick}>
        <Settings className="h-5 w-5 text-gray-600" />
      </Button>
    </header>
  );
}
