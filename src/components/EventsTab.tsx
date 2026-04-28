import { CalendarOutlined, DeleteOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Empty, Form, Input, List, Modal, Popconfirm, Space, Tag, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  countContactsForEvent,
  deleteEvent,
  getAllEvents,
  newEvent,
  putEvent,
  type Event,
} from "@/lib/contactsDb";

export default function EventsTab() {
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

  const openCreate = () => {
    setEditing(newEvent());
    form.resetFields();
  };

  const openEdit = (ev: Event) => {
    setEditing(ev);
    form.setFieldsValue({
      name: ev.name,
      date: ev.date ? dayjs(ev.date) : null,
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
      location: values.location ?? "",
      notes: values.notes ?? "",
      updatedAt: Date.now(),
    };
    await putEvent(updated);
    setEditing(null);
    await load();
    message.success("Event saved");
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    await load();
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
                <Tag key="count" color="orange">
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
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="Event name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Lakeside Networking Night" />
          </Form.Item>
          <Form.Item label="Date" name="date">
            <DatePicker style={{ width: "100%" }} format="MMM D, YYYY" />
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
