import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  TimePicker,
  message,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { OpsetteHeader } from "@/components/opsette-header";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import EmptyState from "@/components/EmptyState";
import TagBadge from "@/components/TagBadge";
import type { Contact, Event } from "@/lib/contactsDb";
import {
  deleteEvent,
  emitContactsToOpsette,
  getContactsForEvent,
  getEvent,
  isEmbedded,
  saveEvent,
} from "@/lib/storage";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [embedded, setEmbedded] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emitting, setEmitting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ev, list] = await Promise.all([
        getEvent(id),
        getContactsForEvent(id),
      ]);
      setEvent(ev ?? null);
      setContacts(list);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void isEmbedded().then((v) => {
      if (!cancelled) setEmbedded(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const unsent = useMemo(() => contacts.filter((c) => !c.emittedAt), [contacts]);

  const selectedUnsentCount = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.id) && !c.emittedAt).length,
    [contacts, selectedIds],
  );

  const toggleSelected = (cid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  const announceEmit = (sent: number, skipped: number, failed: number) => {
    if (failed > 0) {
      message.warning(
        `${sent} added to Opsette, ${failed} failed${
          skipped ? `, ${skipped} already in Opsette` : ""
        }.`,
      );
    } else if (sent > 0) {
      message.success(
        `${sent} added to your Opsette inbox${
          skipped ? ` (${skipped} already there)` : ""
        }.`,
      );
    } else if (skipped > 0) {
      message.info("Everyone here is already in your Opsette inbox.");
    } else {
      message.info("No contacts to add.");
    }
  };

  const runEmit = async (targets: Contact[]) => {
    setEmitting(true);
    try {
      const res = await emitContactsToOpsette(targets);
      announceEmit(res.sent.length, res.skipped.length, res.failed.length);
      await load();
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Couldn't add to Opsette.",
      );
    } finally {
      setEmitting(false);
    }
  };

  const handleRowClick = (c: Contact) => {
    if (selectMode) {
      toggleSelected(c.id);
      return;
    }
    navigate(`/contact/${c.id}`);
  };

  const openEdit = () => {
    if (!event) return;
    setEditing(true);
  };

  const handleSaveEvent = async () => {
    if (!event) return;
    const values = await form.validateFields();
    const updated: Event = {
      ...event,
      name: values.name,
      date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : "",
      time: values.time ? dayjs(values.time).format("h:mm A") : "",
      location: values.location ?? "",
      notes: values.notes ?? "",
      updatedAt: Date.now(),
    };
    await saveEvent(updated);
    setEvent(updated);
    setEditing(false);
    message.success("Event saved");
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    await deleteEvent(event.id);
    message.success("Event deleted");
    navigate("/events");
  };

  const metaBits = event
    ? [
        event.date && (
          <span key="d">
            <CalendarOutlined /> {dayjs(event.date).format("MMM D, YYYY")}
          </span>
        ),
        event.time && (
          <span key="t">
            <ClockCircleOutlined /> {event.time}
          </span>
        ),
        event.location && (
          <span key="l">
            <EnvironmentOutlined /> {event.location}
          </span>
        ),
      ].filter(Boolean)
    : [];

  return (
    <div className="cc-app">
      <OpsetteHeader rightExtra={<ThemeToggleButton />} />
      <main className="cc-container">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16, paddingLeft: 0 }}
        >
          Back
        </Button>

        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : !event ? (
          <EmptyState
            icon={<CalendarOutlined />}
            title="Event not found"
            description="This event may have been deleted."
            action={<Button onClick={() => navigate("/events")}>All events</Button>}
          />
        ) : (
          <div className="cc-stack">
            <div className="cc-row-between">
              <h2 className="cc-page-title" style={{ margin: 0 }}>
                {event.name || "Event"}
              </h2>
              <Button icon={<EditOutlined />} onClick={openEdit}>
                Edit
              </Button>
            </div>

            <div className="cc-event-detail-head">
              {metaBits.length > 0 && (
                <Space size={14} wrap className="cc-event-detail-meta">
                  {metaBits}
                </Space>
              )}
              {event.notes && <p className="cc-event-detail-notes">{event.notes}</p>}
              <div className="cc-event-detail-count">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"}
                {embedded && unsent.length > 0 && (
                  <span className="cc-event-detail-count-sub">
                    {" · "}
                    {unsent.length} not yet in Opsette
                  </span>
                )}
              </div>
            </div>

            {embedded && contacts.length > 0 && (
              <div className="cc-bulk-bar">
                {selectMode ? (
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Button
                      type="text"
                      onClick={() => {
                        setSelectMode(false);
                        setSelectedIds(new Set());
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      loading={emitting}
                      disabled={selectedUnsentCount === 0}
                      onClick={() =>
                        void runEmit(contacts.filter((c) => selectedIds.has(c.id)))
                      }
                    >
                      {selectedUnsentCount > 0
                        ? `Add ${selectedUnsentCount} to Opsette`
                        : "Add to Opsette"}
                    </Button>
                  </Space>
                ) : (
                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      loading={emitting}
                      disabled={unsent.length === 0}
                      onClick={() => void runEmit(unsent)}
                    >
                      {unsent.length > 0
                        ? `Add all ${unsent.length} to Opsette`
                        : "All added to Opsette"}
                    </Button>
                    <Button onClick={() => setSelectMode(true)}>Select…</Button>
                  </Space>
                )}
              </div>
            )}

            {contacts.length === 0 ? (
              <EmptyState
                icon={<UserOutlined />}
                title="No contacts yet"
                description="Nothing captured at this event so far. Capture a card and pick this event to add the first one."
              />
            ) : (
              <List
                dataSource={contacts}
                renderItem={(c) => (
                  <List.Item className="cc-list-item" onClick={() => handleRowClick(c)}>
                    <List.Item.Meta
                      avatar={
                        selectMode ? (
                          <Checkbox
                            checked={selectedIds.has(c.id)}
                            disabled={!!c.emittedAt}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelected(c.id)}
                          />
                        ) : (
                          <Avatar className="cc-avatar">
                            {c.name ? initials(c.name) : <UserOutlined />}
                          </Avatar>
                        )
                      }
                      title={
                        <span className="cc-list-title">
                          <span className="cc-list-title-text">
                            {c.name || "(No name)"}
                          </span>
                          {c.emittedAt && (
                            <Tag
                              color="success"
                              icon={<CheckCircleFilled />}
                              className="cc-emitted-tag"
                            >
                              In Opsette
                            </Tag>
                          )}
                          {!c.emittedAt && c.tags.length > 0 && (
                            <TagBadge tag={c.tags[0]} />
                          )}
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
        )}
      </main>

      <Modal
        open={editing}
        onCancel={() => setEditing(false)}
        title="Edit event"
        destroyOnHidden
        afterOpenChange={(open) => {
          if (open && event) {
            form.setFieldsValue({
              name: event.name,
              date: event.date ? dayjs(event.date) : dayjs(),
              time: event.time ? dayjs(event.time, "h:mm A") : null,
              location: event.location,
              notes: event.notes,
            });
          }
        }}
        footer={
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Popconfirm
              title="Delete this event?"
              description="Linked contacts keep the event name as a snapshot."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={handleDeleteEvent}
            >
              <Button danger>Delete</Button>
            </Popconfirm>
            <Space>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="primary" onClick={handleSaveEvent}>
                Save
              </Button>
            </Space>
          </Space>
        }
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="Event name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Lakeside Networking Night" />
          </Form.Item>
          <Form.Item
            label="Date"
            name="date"
            rules={[{ required: true, message: "Date is required" }]}
          >
            <DatePicker style={{ width: "100%" }} format="MMM D, YYYY" />
          </Form.Item>
          <Form.Item label="Time" name="time">
            <TimePicker
              style={{ width: "100%" }}
              format="h:mm A"
              minuteStep={5}
              use12Hours
              suffixIcon={<ClockCircleOutlined />}
            />
          </Form.Item>
          <Form.Item label="Location" name="location">
            <Input placeholder="Grill's Lakeside, Orange Blossom Trail" />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Goals, dress code, hopes…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
