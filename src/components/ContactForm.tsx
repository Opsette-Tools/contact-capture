import { Button, Form, Input, Select, Space } from "antd";
import { useEffect } from "react";
import type { Contact, ContactTag } from "@/lib/contactsDb";

interface Props {
  initial: Contact;
  prefill?: Partial<Contact>;
  submitLabel?: string;
  onSubmit: (values: Contact) => void | Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

export default function ContactForm({
  initial,
  prefill,
  submitLabel = "Save contact",
  onSubmit,
  onCancel,
  saving,
}: Props) {
  const [form] = Form.useForm<Partial<Contact>>();

  useEffect(() => {
    form.setFieldsValue(initial);
  }, [initial, form]);

  useEffect(() => {
    if (prefill) {
      form.setFieldsValue({ ...form.getFieldsValue(), ...prefill });
    }
  }, [prefill, form]);

  const handleFinish = async (values: Partial<Contact>) => {
    const merged: Contact = {
      ...initial,
      ...values,
      updatedAt: Date.now(),
    };
    await onSubmit(merged);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initial}
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
      <Form.Item label="Where you met" name="metAt">
        <Input placeholder="Conference, coffee shop, etc." autoComplete="off" />
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
