import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Form,
  Input,
  List,
  Modal,
  Space,
  Tag,
  TimePicker,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { newEvent, type Event } from "@/lib/contactsDb";
import {
  countContactsForEvent,
  getAllEvents,
  saveEvent,
} from "@/lib/storage";
import EmptyState from "./EmptyState";

interface Props {
  /** When set, EventsTab opens a blank New Event modal once on mount/change.
   *  Used by the home-screen "New event" CTA. */
  pendingCreate?: boolean;
  /** Called after the create modal has been auto-opened, so the host can clear
   *  the flag. */
  onPendingConsumed?: () => void;
  /** Fires after any save so the host can re-check the active event. */
  onChange?: () => void;
}

/**
 * Events list + create. Tapping a row routes to /event/:id (the browsable event
 * page, which owns edit/delete/bulk-emit). Creating happens in a quick modal
 * here so you can spin up an event without leaving the list.
 */
export default function EventsTab({
  pendingCreate,
  onPendingConsumed,
  onChange,
}: Props) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
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

  useEffect(() => {
    if (pendingCreate) {
      setCreating(true);
      onPendingConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCreate]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    const ev: Event = {
      ...newEvent(),
      name: values.name,
      date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : "",
      time: values.time ? dayjs(values.time).format("h:mm A") : "",
      location: values.location ?? "",
      notes: values.notes ?? "",
    };
    await saveEvent(ev);
    setCreating(false);
    form.resetFields();
    await load();
    onChange?.();
    message.success("Event created");
    // Drop straight into the new event so the user can start capturing under it.
    navigate(`/event/${ev.id}`);
  };

  return (
    <div className="cc-stack">
      <Button
        type="primary"
        icon={<PlusOutlined />}
        block
        size="large"
        onClick={() => setCreating(true)}
      >
        New event
      </Button>

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarOutlined />}
          title="No events yet"
          description="Create one for your next mixer or conference, then capture every card under it."
        />
      ) : (
        <List
          dataSource={events}
          renderItem={(ev) => (
            <List.Item
              className="cc-list-item"
              onClick={() => navigate(`/event/${ev.id}`)}
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
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={handleCreate}
        okText="Create event"
        title="New event"
        destroyOnHidden
        afterOpenChange={(open) => {
          if (open) form.setFieldsValue({ date: dayjs() });
        }}
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
