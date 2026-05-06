import {
  CalendarOutlined,
  DownloadOutlined,
  IdcardOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Empty, Input, List, Space, Tag } from "antd";
import { useMemo, useState } from "react";
import type { Contact, Event } from "@/lib/contactsDb";
import { shareContactsCsv, shareContactsVcard } from "@/lib/exporters";
import { colorForTag } from "@/lib/theme";
import TagBadge from "./TagBadge";

interface Props {
  contacts: Contact[];
  onSelect: (c: Contact) => void;
  onAddNew: () => void;
  /** Active event matching today's date (if any). Drives the pinned banner. */
  activeEvent?: Event;
  /** Edit the active event (opens EventsTab modal scoped to that event). */
  onEditActiveEvent?: (ev: Event) => void;
  /** Open the My Card drawer. */
  onOpenMyCard: () => void;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ContactList({
  contacts,
  onSelect,
  onAddNew,
  activeEvent,
  onEditActiveEvent,
  onOpenMyCard,
}: Props) {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("All");

  // Build the filter pills from whatever tags actually exist on contacts. Sorted
  // by frequency so the most common tags surface first.
  const tagOptions = useMemo<string[]>(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) {
      for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return ["All", ...Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t)];
  }, [contacts]);

  const tonightCount = useMemo(() => {
    if (!activeEvent) return 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    return contacts.filter(
      (c) => c.eventId === activeEvent.id && c.createdAt >= todayMs,
    ).length;
  }, [contacts, activeEvent]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (tagFilter !== "All" && !c.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q)
      );
    });
  }, [contacts, query, tagFilter]);

  return (
    <div className="cc-stack">
      {activeEvent && (
        <div
          className="cc-active-event"
          role="button"
          tabIndex={0}
          onClick={() => onEditActiveEvent?.(activeEvent)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEditActiveEvent?.(activeEvent);
            }
          }}
        >
          <CalendarOutlined style={{ fontSize: 22, color: "var(--cc-color-accent)" }} />
          <div className="cc-active-event-body">
            <div className="cc-active-event-eyebrow">Today's event</div>
            <div className="cc-active-event-name">{activeEvent.name || "(Untitled event)"}</div>
            <div className="cc-active-event-meta">
              {[
                activeEvent.time,
                activeEvent.location,
                `${tonightCount} captured today`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <Tag color="blue" style={{ flex: "0 0 auto" }}>
            {tonightCount}
          </Tag>
        </div>
      )}

      <div className="cc-row" style={{ gap: 8 }}>
        <Input
          size="large"
          allowClear
          placeholder="Search name, company, position, email"
          prefix={<SearchOutlined />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Space.Compact>
          <Button
            size="large"
            icon={<IdcardOutlined />}
            aria-label="My card"
            onClick={onOpenMyCard}
          />
          <Dropdown
            disabled={contacts.length === 0}
            menu={{
              items: [
                {
                  key: "csv",
                  label: "Export all as CSV",
                  onClick: () => void shareContactsCsv(contacts),
                },
                {
                  key: "vcf",
                  label: "Share all vCards (.vcf)",
                  onClick: () => void shareContactsVcard(contacts),
                },
              ],
            }}
          >
            <Button size="large" icon={<DownloadOutlined />} aria-label="Export contacts" />
          </Dropdown>
        </Space.Compact>
      </div>
      {tagOptions.length > 1 && (
        <div className="cc-filter-row">
          {tagOptions.map((t) => {
            const active = tagFilter === t;
            const color = t === "All" ? "default" : colorForTag(t);
            return (
              <Tag
                key={t}
                color={active ? color : undefined}
                className="cc-filter-tag"
                onClick={() => setTagFilter(t)}
                bordered
              >
                {t}
              </Tag>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          description={
            contacts.length === 0
              ? "No contacts yet. Add your first one."
              : "No contacts match your filters."
          }
        >
          {contacts.length === 0 && (
            <a onClick={onAddNew}>Add a contact</a>
          )}
        </Empty>
      ) : (
        <List
          dataSource={filtered}
          renderItem={(c) => (
            <List.Item
              className="cc-list-item"
              onClick={() => onSelect(c)}
            >
              <List.Item.Meta
                avatar={
                  <Avatar className="cc-avatar">
                    {c.name ? initials(c.name) : <UserOutlined />}
                  </Avatar>
                }
                title={
                  <span className="cc-list-title">
                    <span className="cc-list-title-text">{c.name || "(No name)"}</span>
                    {c.tags.length > 0 && <TagBadge tag={c.tags[0]} />}
                  </span>
                }
                description={
                  c.position
                    ? `${c.position}${c.company ? ` · ${c.company}` : ""}`
                    : c.company || c.email || c.phone || "—"
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
