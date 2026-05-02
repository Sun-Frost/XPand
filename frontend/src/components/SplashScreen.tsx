import { useEffect } from "react";
import "../assets/css/SplashScreen.css";
import XpandLogo from "../assets/xpand.svg";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-root">
      {/* Ambient background orbs */}
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />

      {/* Hex grid overlay */}
      <div className="splash-grid" />

      {/* Center content */}
      <div className="splash-center">
        {/* Logo mark */}
        <div className="splash-logo-wrap">
          <div className="splash-logo-mark">
            <img src={XpandLogo} alt="XPand Logo" width="40" height="40" />
            {/* Corner brackets */}
            <span className="splash-corner splash-corner-tl" />
            <span className="splash-corner splash-corner-br" />
          </div>

          {/* Wordmark */}
          <div className="splash-wordmark">
            <span className="splash-word-x">X</span>
            <span className="splash-word-pand">Pand</span>
          </div>
        </div>

        {/* Tagline */}
        <p className="splash-tagline">Level Up Your Skill Set</p>

        {/* Loading bar */}
        <div className="splash-bar-track">
          <div className="splash-bar-fill" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;