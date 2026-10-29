import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { RegisterCheckEmail } from "@/components/auth/RegisterCheckEmail";

export default function RegisterPage() {
  const { t } = useTranslation();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  return (
    <AuthShell back={registeredEmail ? undefined : { to: "/landing", label: t("common.back") }}>
      {registeredEmail ? (
        <RegisterCheckEmail email={registeredEmail} />
      ) : (
        <RegisterForm onRegistered={setRegisteredEmail} />
      )}
    </AuthShell>
  );
}
