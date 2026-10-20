"use client";

import { Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

interface HeaderProps {
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  subtitle?: string;
}

export function Header({ onMenuClick, onSettingsClick, subtitle }: HeaderProps) {
  const { t } = useLocale();

  return (
    <header className="flex items-center justify-between px-3 py-1.5">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-5 w-5 text-gray-600" />
      </Button>
      <div className="text-center">
        <h1 className="text-sm font-bold tracking-tight">
          {t("header.life")} <span className="font-black">{t("header.builder")}</span>
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
