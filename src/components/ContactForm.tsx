import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Select, Space } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import type { Contact, Event } from "@/lib/contactsDb";
import { TAG_SUGGESTIONS } from "@/lib/contactsDb";
import EventSelect from "./EventSelect";

interface Props {
  initial: Contact;
  prefill?: Partial<Contact>;
  submitLabel?: string;
  onSubmit: (values: Contact) => void | Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

interface FormValues extends Omit<Partial<Contact>, "metDate"> {
  metDate?: dayjs.Dayjs | null;
}

export default function ContactForm({
  initial,
  prefill,
  submitLabel = "Save contact",
  onSubmit,
  onCancel,
  saving,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  // Show the event picker only if the contact already has one linked, or the
  // user explicitly clicks "+ Link to event". Keeps the form lean when the
  // user is just dropping in a contact they didn't meet at an event.
  const [eventOpen, setEventOpen] = useState<boolean>(!!initial.eventId);

  useEffect(() => {
    form.setFieldsValue({
      ...initial,
      metDate: initial.metDate ? dayjs(initial.metDate) : null,
    });
    setEventOpen(!!initial.eventId);
  }, [initial, form]);

  useEffect(() => {
    if (prefill) {
      form.setFieldsValue({
        ...form.getFieldsValue(),
        ...prefill,
        metDate: prefill.metDate ? dayjs(prefill.metDate) : form.getFieldValue("metDate"),
      });
    }
  }, [prefill, form]);

  const handleEventPicked = (ev: Event | undefined) => {
    form.setFieldsValue({
      eventName: ev?.name,
      metDate:
        ev?.date && !form.getFieldValue("metDate")
          ? dayjs(ev.date)
          : form.getFieldValue("metDate"),
      metAt: form.getFieldValue("metAt") || ev?.location || "",
    });
  };

  const handleClearEvent = () => {
    form.setFieldsValue({
      eventId: undefined,
      eventName: undefined,
    });
    setEventOpen(false);
  };

  const handleFinish = async (values: FormValues) => {
    const cleanedTags = Array.isArray(values.tags)
      ? Array.from(
          new Set(
            values.tags
              .map((t) => (typeof t === "string" ? t.trim() : ""))
              .filter((t) => t.length > 0),
          ),
        )
      : [];
    const merged: Contact = {
      ...initial,
      ...values,
      tags: cleanedTags,
      metDate: values.metDate ? values.metDate.format("YYYY-MM-DD") : undefined,
      eventId: values.eventId || undefined,
      eventName: values.eventName || undefined,
      updatedAt: Date.now(),
    } as Contact;
    await onSubmit(merged);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        ...initial,
        metDate: initial.metDate ? dayjs(initial.metDate) : null,
      }}
      onFinish={handleFinish}
      requiredMark={false}
    >
      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: "Name is required" }]}
      >
        <Input placeholder="Jane Doe" autoComplete="off" />
      </Form.Item>
      <Form.Item label="Company" name="company">
        <Input placeholder="Acme Inc." autoComplete="off" />
      </Form.Item>
      <Form.Item label="Email" name="email">
        <Input placeholder="jane@acme.com" type="email" autoComplete="off" />
      </Form.Item>
      <Form.Item label="Phone" name="phone">
        <Input placeholder="+1 555 123 4567" autoComplete="off" />
      </Form.Item>
      <Form.Item label="Website" name="website">
        <Input placeholder="acme.com" autoComplete="off" />
      </Form.Item>

      {/* Event is optional — hidden by default behind a link, expands inline when clicked. */}
      {eventOpen ? (
        <>
          <Form.Item
            label={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                Event
                <button
                  type="button"
                  className="cc-inline-link"
                  onClick={handleClearEvent}
                  style={{ fontSize: 12, color: "var(--cc-color-text-muted)" }}
                >
                  <CloseOutlined /> Remove
                </button>
              </span>
            }
            name="eventId"
          >
            <EventSelect onEventPicked={handleEventPicked} />
          </Form.Item>
          <Form.Item name="eventName" hidden>
            <Input />
          </Form.Item>
        </>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            className="cc-inline-link"
            onClick={() => setEventOpen(true)}
          >
            <PlusOutlined /> Link to event
          </button>
          {/* Keep eventId/eventName registered so they reset cleanly. */}
          <Form.Item name="eventId" hidden><Input /></Form.Item>
          <Form.Item name="eventName" hidden><Input /></Form.Item>
        </div>
      )}

      <Form.Item label="Date met" name="metDate">
        <DatePicker style={{ width: "100%" }} format="MMM D, YYYY" />
      </Form.Item>
      <Form.Item label="Where you met (extra detail)" name="metAt">
        <Input placeholder="By the bar, after the keynote…" autoComplete="off" />
      </Form.Item>

      <Form.Item label="Memorable detail" name="memorableDetail">
        <Input.TextArea rows={3} placeholder="Something you want to remember about them" />
      </Form.Item>
      <Form.Item label="Follow-up action" name="followUp">
        <Input placeholder="Send portfolio, schedule call…" autoComplete="off" />
      </Form.Item>
      <Form.Item label="Tags" name="tags">
        <Select<string[]>
          mode="tags"
          allowClear
          placeholder="Type a tag and press Enter"
          tokenSeparators={[","]}
          options={TAG_SUGGESTIONS.map((t) => ({ value: t, label: t }))}
        />
      </Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" loading={saving}>
          {submitLabel}
        </Button>
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      </Space>
    </Form>
  );
}
