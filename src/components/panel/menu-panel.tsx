"use client";

import { useLocale } from "@/providers/locale-provider";
import { usePanel } from "./panel-host";
import { useRouter } from "next/navigation";
import { Settings, Heart, Network } from "lucide-react";

export function MenuPanel() {
  const { t } = useLocale();
  const { openPanel, closePanel } = usePanel();
  const router = useRouter();

  const items = [
    { icon: Network, label: "Goal Tree", action: () => { closePanel(); router.push("/tree"); } },
    { icon: Heart, label: t("healthReview.menuItem"), action: () => openPanel("review") },
    { icon: Settings, label: t("settings.title"), action: () => openPanel("settings") },
  ];

  return (
    <div className="px-5 pt-5 min-h-dvh" style={{ paddingTop: "calc(env(safe-area-inset-top) + 20px)" }}>
      <h2 className="text-lg font-bold mb-6">Menu</h2>
      <nav className="space-y-1">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/60 transition-colors"
          >
            <item.icon className="h-5 w-5 text-gray-400" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
