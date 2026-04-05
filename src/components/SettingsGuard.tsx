import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DemoUserInfo from "@/components/DemoUserInfo";

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

  return <Outlet />;
}