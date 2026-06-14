import { Button, DatePicker, Form, Input, Select, Space } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import type { Contact, Event, VoiceMemo } from "@/lib/contactsDb";
import { CONTACT_TYPES, TAG_SUGGESTIONS } from "@/lib/contactsDb";
import EventSelect from "./EventSelect";
import VoiceMemoRecorder from "./VoiceMemoRecorder";

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
  // Voice memo holds a Blob — kept out of the antd Form values to avoid the
  // "Blob is not a plain object" warnings, and to keep the form value tree
  // strictly serializable.
  const [voiceMemo, setVoiceMemo] = useState<VoiceMemo | undefined>(
    initial.voiceMemo,
  );

  useEffect(() => {
    form.setFieldsValue({
      ...initial,
      metDate: initial.metDate ? dayjs(initial.metDate) : null,
    });
    setVoiceMemo(initial.voiceMemo);
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
      voiceMemo,
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
      requiredMark
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
      <Form.Item label="Position" name="position">
        <Input placeholder="Founder, Sales, VP Marketing…" autoComplete="off" />
      </Form.Item>
      <Form.Item
        label="Relationship"
        name="contactType"
        tooltip="How you'd categorize this contact. This is the field that carries over when you add them to Opsette."
      >
        <Select
          options={CONTACT_TYPES.map((t) => ({ value: t, label: t }))}
        />
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

      {/* Every contact belongs to an event. Required — but creating one is a
          two-second modal (the "+ Create new event…" option), so capture stays
          fast: make the event once at the booth, every later capture picks it. */}
      <Form.Item
        label="Event"
        name="eventId"
        rules={[{ required: true, message: "Pick an event or create one" }]}
      >
        <EventSelect onEventPicked={handleEventPicked} />
      </Form.Item>
      <Form.Item name="eventName" hidden>
        <Input />
      </Form.Item>

      <Form.Item label="Date met" name="metDate">
        <DatePicker style={{ width: "100%" }} format="MMM D, YYYY" />
      </Form.Item>
      <Form.Item label="Where you met (extra detail)" name="metAt">
        <Input placeholder="By the bar, after the keynote…" autoComplete="off" />
      </Form.Item>

      <Form.Item label="Memorable detail" name="memorableDetail">
        <Input.TextArea rows={3} placeholder="Something you want to remember about them" />
      </Form.Item>

      <Form.Item>
        <VoiceMemoRecorder value={voiceMemo} onChange={setVoiceMemo} />
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
