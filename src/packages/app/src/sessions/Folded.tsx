// A folded section at the foot of a session's page, split from
// SessionDetailView. It opens and closes as every fold in the windows does
// (lib/Motion.tsx); <details> alone would show and drop its body at once.
import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "@agent-hud/ui/components/card";
import { moves, useFold } from "../lib/Motion";
import { card, row, type Theme } from "./SessionTheme";

export function Folded({
  title,
  theme,
  children,
}: {
  title: string;
  theme: Theme;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const body = useFold<HTMLDivElement>(open);
  return (
    <Card style={{ ...card(theme, "0") }}>
      {/* Open until the close has played; the chevron turns with the click. */}
      <details className="session-folded" open={body.shown}>
        <summary
          onClick={(event) => {
            event.preventDefault();
            setOpen((value) => !value);
          }}
          style={{
            ...row,
            cursor: "pointer",
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            listStyle: "none",
          }}
        >
          <ChevronRight
            size={11}
            className="session-folded-chevron"
            style={{
              transform: open ? "rotate(90deg)" : "none",
              transition: moves("quick", "transform"),
            }}
          />
          {title}
        </summary>
        <div ref={body.ref}>
          <div style={{ padding: "0 14px 12px", display: "grid", gap: 8 }}>
            {children}
          </div>
        </div>
      </details>
    </Card>
  );
}
