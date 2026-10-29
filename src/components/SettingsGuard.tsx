import { useAuth } from "@/hooks/useAuth";
import DemoUserInfo from "@/components/DemoUserInfo";
import SettingsLayout from "@/components/layout/SettingsLayout";

const DEMO_EMAIL = "demo@rigflow.app";

export default function SettingsGuard() {
  const { user } = useAuth();

  if (user?.email === DEMO_EMAIL) return <DemoUserInfo />;

  return <SettingsLayout />;
}
