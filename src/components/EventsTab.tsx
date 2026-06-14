import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tag,
  TimePicker,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { newEvent, type Event } from "@/lib/contactsDb";
import {
  countContactsForEvent,
  deleteEvent,
  getAllEvents,
  saveEvent,
} from "@/lib/storage";

interface Props {
  /** When set, EventsTab opens the matching modal once on mount/change.
   *  - { kind: "create" } opens a blank New Event modal.
   *  - { kind: "edit", eventId } opens the modal pre-loaded with that event.
   *  Each new pendingAction value triggers one open; pass a fresh object to
   *  open again. Index passes undefined when nothing should auto-open. */
  pendingAction?: { kind: "create" } | { kind: "edit"; eventId: string };
  /** Called after pendingAction has been consumed, so Index can clear it. */
  onPendingActionConsumed?: () => void;
  /** Fires after any save/delete so Index can re-check the active event. */
  onChange?: () => void;
}

export default function EventsTab({
  pendingAction,
  onPendingActionConsumed,
  onChange,
}: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Event | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const all = await getAllEvents();
    setEvents(all);
    const entries = await Promise.all(
      all.map(async (e) => [e.id, await countContactsForEvent(e.id)] as const),
    );
    setCounts(Object.fromEntries(entries));
  };

  useEffect(() => {
    void load();
  }, []);

  // Consume pendingAction once events have loaded (so edit can find the event
  // by id). Re-fires whenever pendingAction reference changes.
  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction.kind === "create") {
      setEditing(newEvent());
      form.resetFields();
      form.setFieldsValue({ date: dayjs() });
      onPendingActionConsumed?.();
      return;
    }
    if (pendingAction.kind === "edit") {
      const ev = events.find((e) => e.id === pendingAction.eventId);
      if (ev) {
        setEditing(ev);
        form.setFieldsValue({
          name: ev.name,
          date: ev.date ? dayjs(ev.date) : dayjs(),
          time: ev.time ? dayjs(ev.time, "h:mm A") : null,
          location: ev.location,
          notes: ev.notes,
        });
        onPendingActionConsumed?.();
      }
      // If event not yet loaded, leave pendingAction in place; this effect
      // re-runs when `events` updates.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, events]);

  const openCreate = () => {
    setEditing(newEvent());
    form.resetFields();
    // Default the date to today so it's never blank (it carries to "date met").
    form.setFieldsValue({ date: dayjs() });
  };

  const openEdit = (ev: Event) => {
    setEditing(ev);
    form.setFieldsValue({
      name: ev.name,
      // Date is required; default legacy blank-date events to today so editing
      // one doesn't dead-end on a validation error.
      date: ev.date ? dayjs(ev.date) : dayjs(),
      time: ev.time ? dayjs(ev.time, "h:mm A") : null,
      location: ev.location,
      notes: ev.notes,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    const updated: Event = {
      ...editing,
      name: values.name,
      date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : "",
      time: values.time ? dayjs(values.time).format("h:mm A") : "",
      location: values.location ?? "",
      notes: values.notes ?? "",
      updatedAt: Date.now(),
    };
    await saveEvent(updated);
    setEditing(null);
    await load();
    onChange?.();
    message.success("Event saved");
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    await load();
    onChange?.();
    message.success("Event deleted");
  };

  return (
    <div className="cc-stack">
      <Button type="primary" icon={<PlusOutlined />} block size="large" onClick={openCreate}>
        New event
      </Button>

      {events.length === 0 ? (
        <Empty description="No events yet. Create one before your next networking session." />
      ) : (
        <List
          dataSource={events}
          renderItem={(ev) => (
            <List.Item
              className="cc-list-item"
              onClick={() => openEdit(ev)}
              actions={[
                <Tag key="count" color="blue">
                  {counts[ev.id] ?? 0} contact{(counts[ev.id] ?? 0) === 1 ? "" : "s"}
                </Tag>,
              ]}
            >
              <List.Item.Meta
                title={ev.name || "(Untitled event)"}
                description={
                  <Space size={12} wrap>
                    {ev.date && (
                      <span>
                        <CalendarOutlined /> {dayjs(ev.date).format("MMM D, YYYY")}
                      </span>
                    )}
                    {ev.time && (
                      <span>
                        <ClockCircleOutlined /> {ev.time}
                      </span>
                    )}
                    {ev.location && (
                      <span>
                        <EnvironmentOutlined /> {ev.location}
                      </span>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        open={!!editing}
        onCancel={() => setEditing(null)}
        title={editing && events.find((e) => e.id === editing.id) ? "Edit event" : "New event"}
        footer={
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            {editing && events.find((e) => e.id === editing.id) ? (
              <Popconfirm
                title="Delete this event?"
                description="Linked contacts keep the event name as a snapshot."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => editing && handleDelete(editing.id)}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            ) : (
              <span />
            )}
            <Space>
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="primary" onClick={handleSave}>
                Save
              </Button>
            </Space>
          </Space>
        }
        destroyOnHidden
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
