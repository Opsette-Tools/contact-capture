import type { ReactNode } from "react";

interface Props {
  /** A large icon element (e.g. an antd outlined icon). */
  icon: ReactNode;
  title: string;
  /** Supporting line under the title. Optional. */
  description?: string;
  /** Primary call-to-action rendered under the copy. Optional. */
  action?: ReactNode;
}

/**
 * A purpose-built empty state — replaces bare antd <Empty> in the app's first-run
 * and zero-result moments. Centered icon + headline + subline + optional action,
 * styled via .cc-empty-* so it reads as intentional rather than unfinished.
 */
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="cc-empty">
      <div className="cc-empty-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="cc-empty-title">{title}</div>
      {description && <div className="cc-empty-desc">{description}</div>}
      {action && <div className="cc-empty-action">{action}</div>}
    </div>
  );
}
