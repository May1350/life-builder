import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lifebuilder",
  appName: "Life Builder",
  webDir: "out",
  backgroundColor: "#ffffff",
  ios: {
    preferredContentMode: "mobile",
    scrollEnabled: false,
  },
};

export default config;
