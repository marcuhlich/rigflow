import { motion } from "framer-motion";
import { ArrowRight, Lock, Sparkles, Shield, Slash, BadgeAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Ring({ size, delay = 0 }: { size: number; delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full border border-white/10"
      style={{ width: size, height: size }}
      animate={{ rotate: 360, scale: [1, 1.04, 1] }}
      transition={{ duration: 14, repeat: Infinity, ease: "linear", delay }}
    />
  );
}

export default function DemoBlockedSettings() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden text-[#F9FAFB] pt-6 pb-20">
      <div className="relative mx-auto w-full max-w-6xl px-0">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        >
          {/* Left: message */}
          <section className="rounded-2xl border border-white/10 bg-[rgba(31,41,55,0.65)] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/20 bg-[#34D399]/10 px-3 py-1 text-[12px] font-medium text-[#34D399]">
              <BadgeAlert size={14} />
              Demo-Account
            </div>

            <div className="mt-6 max-w-xl">
              <h1 className="text-3xl font-semibold tracking-tight text-[#F9FAFB] sm:text-4xl">
                Einstellungen sind im Demo-Modus nicht verfügbar.
              </h1>
              <p className="mt-4 text-[15px] leading-7 text-[#9CA3AF] sm:text-[16px]">
                Du verwendest gerade den Demo-Account. Alle Einstellungen sind deshalb
                schreibgeschützt. So bleibt die Demo für alle Nutzer stabil
                und unverändert.
              </p>
            </div>

            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                {[
                    "Profilinformationen bearbeiten",
                    "Passwort ändern",
                    "Zwei-Faktor-Authentifizierung",
                    "Benachrichtigungseinstellungen",
                    "Erscheinungsbild anpassen",
                ].map((item, index) => (
                    <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * index, duration: 0.25 }}
                    className="flex items-center gap-3 text-sm text-[#9CA3AF]"
                    >
                    <Lock size={13} className="shrink-0 text-red-400" />
                    {item}
                    </motion.div>
                ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/")}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#34D399] px-5 py-3 text-sm font-medium text-[#0B1F1A] shadow-[0_10px_30px_rgba(52,211,153,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(52,211,153,0.24)] active:translate-y-0"
              >
                Zum Dashboard
                <ArrowRight className="transition group-hover:translate-x-0.5" size={16} />
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-5 py-3 text-sm font-medium text-[#F9FAFB] transition hover:border-white/20 hover:bg-white/[0.04]"
              >
                Mit eigenem Konto anmelden
              </button>
            </div>
          </section>

          {/* Right: illustration */}
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(31,41,55,0.65)] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(52,211,153,0.12),_transparent_40%),radial-gradient(circle_at_70%_70%,_rgba(245,158,11,0.12),_transparent_35%)]" />

            <div className="relative flex min-h-[380px] items-center justify-center">
              <motion.div
                className="absolute h-56 w-56 rounded-full border border-white/10 bg-white/[0.02]"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              />
              <Ring size={220} delay={0.2} />
              <Ring size={290} delay={0.8} />

              <motion.div
                animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-full max-w-sm rounded-[28px] border border-white/10 bg-[rgba(17,24,39,0.72)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#9CA3AF]">
                    <Shield size={16} className="text-[#34D399]" />
                    Geschützter Bereich
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-full border border-[#34D399]/20 bg-[#34D399]/10 px-3 py-1 text-[12px] text-[#34D399]"
                  >
                    Gesperrt
                  </motion.div>
                </div>

                <div className="relative mt-8 flex items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: [0, -6, 0, 6, 0], scale: [1, 1.03, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex h-28 w-28 items-center justify-center rounded-[32px] border border-white/10 bg-gradient-to-br from-[#34D399]/20 via-white/[0.03] to-[#F59E0B]/12 shadow-[0_0_45px_rgba(52,211,153,0.08)]"
                  >
                    <Lock size={42} className="text-[#F9FAFB]" />
                    <motion.div
                      className="absolute -right-3 top-2 rounded-full border border-white/10 bg-[#F59E0B] p-2 text-[#1F1305] shadow-lg"
                      animate={{ y: [0, -4, 0], rotate: [0, 8, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Slash size={14} />
                    </motion.div>
                  </motion.div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#F9FAFB]">
                    <Sparkles size={15} className="text-[#F59E0B]" />
                    Kein Fehler — so gewollt.
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                    Die Einstellungen sind eingefroren, damit der Demo-Account für alle
                    Besucher gleich aussieht und niemand versehentlich etwas verändert.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}