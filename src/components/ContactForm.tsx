import { Button, DatePicker, Form, Input, Select, Space } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
import type { Contact, ContactTag, Event } from "@/lib/contactsDb";
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

  useEffect(() => {
    form.setFieldsValue({
      ...initial,
      metDate: initial.metDate ? dayjs(initial.metDate) : null,
    });
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
      // Auto-fill the meet date from the event date if user hasn't set one yet.
      metDate:
        ev?.date && !form.getFieldValue("metDate")
          ? dayjs(ev.date)
          : form.getFieldValue("metDate"),
      // If location is empty, suggest the event location as the "where you met" detail.
      metAt: form.getFieldValue("metAt") || ev?.location || "",
    });
  };

  const handleFinish = async (values: FormValues) => {
    const merged: Contact = {
      ...initial,
      ...values,
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

      <Form.Item label="Event" name="eventId">
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
      <Form.Item label="Follow-up action" name="followUp">
        <Input placeholder="Send portfolio, schedule call…" autoComplete="off" />
      </Form.Item>
      <Form.Item label="Tag" name="tag">
        <Select<ContactTag>
          options={[
            { value: "Hot", label: "Hot" },
            { value: "Maybe", label: "Maybe" },
            { value: "Friend", label: "Friend" },
          ]}
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
