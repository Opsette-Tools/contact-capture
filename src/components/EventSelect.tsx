import {
  CalendarOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Modal, Select, TimePicker } from "antd";
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
  // The modal is dual-purpose: `creating` holds a draft for a new event, while
  // `editing` holds the existing event being corrected in place. Exactly one is
  // set when the modal is open. Sharing one modal keeps the form logic in one
  // spot and lets a just-created typo'd event be fixed without a duplicate.
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form] = Form.useForm();

  const load = async () => setEvents(await getAllEvents());

  useEffect(() => {
    void load();
  }, [refreshKey]);

  // The currently-selected event (if any) — drives the inline "Edit" affordance.
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === value),
    [events, value],
  );

  const modalOpen = creating || editing !== null;

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
      // Just open the modal. The default date is applied in afterOpenChange,
      // once the modal has mounted and the Form instance is actually connected
      // to its fields — setting it here (form still unmounted) silently fails
      // and can swallow the click, so the modal never opens.
      setCreating(true);
      return;
    }
    const ev = events.find((e) => e.id === val);
    onChange?.(val);
    onEventPicked?.(ev);
  };

  const openEditSelected = () => {
    if (!selectedEvent) return;
    setEditing(selectedEvent);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const base = editing ?? newEvent();
    const ev: Event = {
      ...base,
      name: values.name,
      date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : "",
      time: values.time ? dayjs(values.time).format("h:mm A") : "",
      location: values.location ?? "",
      notes: values.notes ?? "",
      updatedAt: Date.now(),
    };
    await saveEvent(ev);
    await load();
    closeModal();
    onChange?.(ev.id);
    onEventPicked?.(ev);
  };

  return (
    <>
      <div className="cc-event-select-row">
        <Select
          value={value}
          onChange={handleSelect}
          options={options}
          placeholder="Select an event or create one"
          showSearch
          optionFilterProp="label"
          style={{ flex: 1, minWidth: 0 }}
        />
        {selectedEvent && (
          <Button
            icon={<EditOutlined />}
            onClick={openEditSelected}
            aria-label="Edit selected event"
            title="Edit this event"
          />
        )}
      </div>
      <Modal
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editing ? "Save event" : "Create event"}
        title={editing ? "Edit event" : "New event"}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (!open) return;
          // Pre-fill once the form is mounted & connected. Editing loads the
          // event's values; creating defaults the date to today.
          if (editing) {
            form.setFieldsValue({
              name: editing.name,
              date: editing.date ? dayjs(editing.date) : dayjs(),
              time: editing.time ? dayjs(editing.time, "h:mm A") : null,
              location: editing.location,
              notes: editing.notes,
            });
          } else {
            form.setFieldsValue({ date: dayjs() });
          }
        }}
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
            <DatePicker style={{ width: "100%" }} format="MMM D, YYYY" suffixIcon={<CalendarOutlined />} />
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
