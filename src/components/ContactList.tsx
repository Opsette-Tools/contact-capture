import {
  DownloadOutlined,
  IdcardOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Input, List, Space, Tag } from "antd";
import { useMemo, useState } from "react";
import type { Contact } from "@/lib/contactsDb";
import { shareContactsCsv, shareContactsVcard } from "@/lib/exporters";
import { colorForTag } from "@/lib/theme";
import EmptyState from "./EmptyState";
import TagBadge from "./TagBadge";

interface Props {
  contacts: Contact[];
  onSelect: (c: Contact) => void;
  onAddNew: () => void;
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
        contacts.length === 0 ? (
          <EmptyState
            icon={<TeamOutlined />}
            title="No contacts yet"
            description="Scan a card or QR at your next event — every connection lands here."
            action={
              <Button type="primary" icon={<PlusOutlined />} onClick={onAddNew}>
                Add your first contact
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<SearchOutlined />}
            title="No matches"
            description="No contacts match your search or filter. Try clearing them."
          />
        )
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
