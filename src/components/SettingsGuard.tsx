import { useAuth } from "@/hooks/useAuth";
import DemoUserInfo from "@/components/DemoUserInfo";
import SettingsLayout from "@/components/layout/SettingsLayout";

export default function SettingsGuard() {
  const { user } = useAuth();
  const isDemoAccount = user?.email === "demo@rigflow.app";

  if (isDemoAccount) {
    return (
      <div className="space-y-4 pb-20 pt-6">
        <DemoUserInfo />
      </div>
    );
  }

  return <SettingsLayout />;
}