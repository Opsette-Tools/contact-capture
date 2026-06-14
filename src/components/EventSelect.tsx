import { CalendarOutlined, EnvironmentOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Modal, Select, Space } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { newEvent, type Event } from "@/lib/contactsDb";
import { getAllEvents, saveEvent } from "@/lib/storage";

interface Props {
  value?: string; // event id (injected by Form.Item)
  onChange?: (eventId: string | undefined) => void; // injected by Form.Item
  onEventPicked?: (event: Event | undefined) => void;
  refreshKey?: number;
}

const NEW_VALUE = "__new__";

export default function EventSelect({ value, onChange, onEventPicked, refreshKey }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const load = async () => setEvents(await getAllEvents());

  useEffect(() => {
    void load();
  }, [refreshKey]);

  const options = useMemo(
    () => [
      ...events.map((e) => ({
        value: e.id,
        label: e.date ? `${e.name} · ${dayjs(e.date).format("MMM D, YYYY")}` : e.name,
      })),
      { value: NEW_VALUE, label: "+ Create new event…" },
    ],
    [events],
  );

  const handleSelect = (val: string) => {
    if (val === NEW_VALUE) {
      // Default the date to today so it's never left blank — it carries over to
      // the contact's "date met", so a blank here would strand two fields.
      form.setFieldsValue({ date: dayjs() });
      setCreating(true);
      return;
    }
    const ev = events.find((e) => e.id === val);
    onChange?.(val);
    onEventPicked?.(ev);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    const ev: Event = {
      ...newEvent(),
      name: values.name,
      date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : "",
      location: values.location ?? "",
      notes: values.notes ?? "",
    };
    await saveEvent(ev);
    await load();
    setCreating(false);
    form.resetFields();
    onChange?.(ev.id);
    onEventPicked?.(ev);
  };

  return (
    <>
      <Select
        value={value}
        onChange={handleSelect}
        options={options}
        placeholder="Select an event or create one"
        showSearch
        optionFilterProp="label"
      />
      <Modal
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={handleCreate}
        okText="Create event"
        title="New event"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="Event name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Lakeside Networking Night" prefix={<PlusOutlined />} />
          </Form.Item>
          <Form.Item
            label="Date"
            name="date"
            rules={[{ required: true, message: "Date is required" }]}
          >
            <DatePicker style={{ width: "100%" }} suffixIcon={<CalendarOutlined />} />
          </Form.Item>
          <Form.Item label="Location" name="location">
            <Input placeholder="Grill's Lakeside, Orange Blossom Trail" prefix={<EnvironmentOutlined />} />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Optional context" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
