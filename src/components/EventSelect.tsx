import { CalendarOutlined, EnvironmentOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Modal, Select, Space } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  getAllEvents,
  newEvent,
  putEvent,
  type Event,
} from "@/lib/contactsDb";

interface Props {
  value?: string; // event id
  onChange: (eventId: string | undefined, event: Event | undefined) => void;
  refreshKey?: number;
}

const NEW_VALUE = "__new__";
const NONE_VALUE = "__none__";

export default function EventSelect({ value, onChange, refreshKey }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const load = async () => setEvents(await getAllEvents());

  useEffect(() => {
    void load();
  }, [refreshKey]);

  const options = useMemo(
    () => [
      { value: NONE_VALUE, label: "— None —" },
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
      setCreating(true);
      return;
    }
    if (val === NONE_VALUE) {
      onChange(undefined, undefined);
      return;
    }
    const ev = events.find((e) => e.id === val);
    onChange(val, ev);
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
    await putEvent(ev);
    await load();
    setCreating(false);
    form.resetFields();
    onChange(ev.id, ev);
  };

  return (
    <>
      <Select
        value={value ?? NONE_VALUE}
        onChange={handleSelect}
        options={options}
        placeholder="Select an event"
        showSearch
        optionFilterProp="label"
      />
      <Modal
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={handleCreate}
        okText="Create event"
        title="New event"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="Event name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Lakeside Networking Night" prefix={<PlusOutlined />} />
          </Form.Item>
          <Form.Item label="Date" name="date">
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
