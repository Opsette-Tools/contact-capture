import { DownloadOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Empty, Input, List, Tag } from "antd";
import { useMemo, useState } from "react";
import type { Contact, ContactTag } from "@/lib/contactsDb";
import { exportContactsCsv, exportContactsVcard } from "@/lib/exporters";
import { tagColors } from "@/lib/theme";
import TagBadge from "./TagBadge";

interface Props {
  contacts: Contact[];
  onSelect: (c: Contact) => void;
  onAddNew: () => void;
}

const TAG_OPTIONS: ("All" | ContactTag)[] = ["All", "Hot", "Maybe", "Friend"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ContactList({ contacts, onSelect, onAddNew }: Props) {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<"All" | ContactTag>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (tagFilter !== "All" && c.tag !== tagFilter) return false;
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
              { key: "csv", label: "Export as CSV", onClick: () => exportContactsCsv(contacts) },
              { key: "vcf", label: "Export as vCard (.vcf)", onClick: () => exportContactsVcard(contacts) },
            ],
          }}
        >
          <Button size="large" icon={<DownloadOutlined />} aria-label="Export contacts" />
        </Dropdown>
      </div>
      <div className="cc-filter-row">
        {TAG_OPTIONS.map((t) => {
          const active = tagFilter === t;
          const color = t === "All" ? "default" : tagColors[t];
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
              actions={[<TagBadge key="tag" tag={c.tag} />]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ backgroundColor: "#F59E0B" }}>
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
