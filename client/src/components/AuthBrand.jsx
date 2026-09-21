import { Dumbbell, CheckCircle2, ShieldCheck, CalendarCheck, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: CalendarCheck,
    text: "Track memberships, attendance and check-ins in one place.",
  },
  {
    icon: TrendingUp,
    text: "Follow your workouts and progress with your personal trainer.",
  },
  {
    icon: ShieldCheck,
    text: "Secure staff portal with role-based access control.",
  },
];

function AuthBrand({ subtitle }) {
  return (
    <div className="auth-brand">
      <div className="auth-brand-top">
        <span className="logo-mark">
          <Dumbbell />
        </span>
        GymPro
      </div>

      <div className="auth-brand-copy">
        <h1>
          Your fitness, <em>managed smarter.</em>
        </h1>
        <p>{subtitle}</p>

        <div className="auth-brand-features">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <div className="auth-brand-feature" key={feature.text}>
                <Icon />
                {feature.text}
              </div>
            );
          })}
        </div>
      </div>

      <div className="auth-brand-bottom">
        <CheckCircle2 style={{ width: 13, height: 13, marginRight: 5, verticalAlign: -2 }} />
        GymPro Management Platform
      </div>
    </div>
  );
}

export default AuthBrand;