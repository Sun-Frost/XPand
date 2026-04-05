import { useEffect } from "react";
import "../assets/css/SplashScreen.css";

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
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* XP icon — upward arrow + X */}
              <path
                d="M20 6 L34 20 L26 20 L26 34 L14 34 L14 20 L6 20 Z"
                fill="url(#splash-grad)"
                opacity="0.95"
              />
              <defs>
                <linearGradient
                  id="splash-grad"
                  x1="6"
                  y1="6"
                  x2="34"
                  y2="34"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
              </defs>
            </svg>
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