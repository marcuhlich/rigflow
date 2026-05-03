import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App } from "@capacitor/app";

export default function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const listener = App.addListener("backButton", () => {
      if (location.pathname !== "/") {
        navigate(-1);
      } else {
        App.exitApp();
      }
    });

    return () => {
        (listener as any).remove();
    };
  }, [location, navigate]);

  return null;
}