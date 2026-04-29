import { DownloadOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Empty, Input, List, Tag } from "antd";
import { useMemo, useState } from "react";
import type { Contact } from "@/lib/contactsDb";
import { exportContactsCsv, exportContactsVcard } from "@/lib/exporters";
import { colorForTag, colors } from "@/lib/theme";
import TagBadge from "./TagBadge";

interface Props {
  contacts: Contact[];
  onSelect: (c: Contact) => void;
  onAddNew: () => void;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ContactList({ contacts, onSelect, onAddNew }: Props) {
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
        c.email.toLowerCase().includes(q)
      );
    });
  }, [contacts, query, tagFilter]);

  return (
    <div className="cc-stack">
      <div className="cc-row" style={{ gap: 8 }}>
        <Input
          size="large"
          allowClear
          placeholder="Search name, company, email"
          prefix={<SearchOutlined />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Dropdown
          disabled={contacts.length === 0}
          menu={{
            items: [
              { key: "csv", label: "Export all as CSV", onClick: () => exportContactsCsv(contacts) },
              { key: "vcf", label: "Download all vCards (.vcf)", onClick: () => exportContactsVcard(contacts) },
            ],
          }}
        >
          <Button size="large" icon={<DownloadOutlined />} aria-label="Export contacts" />
        </Dropdown>
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
              actions={
                c.tags.length > 0
                  ? [<TagBadge key="tag" tag={c.tags[0]} />]
                  : []
              }
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ backgroundColor: colors.avatarBg }}>
                    {c.name ? initials(c.name) : <UserOutlined />}
                  </Avatar>
                }
                title={c.name || "(No name)"}
                description={c.company || c.email || c.phone || "—"}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
