import * as settingsDomain from "@/domain/settings/settings";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await settingsDomain.getSettings();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
