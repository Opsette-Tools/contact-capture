import { EditOutlined, QrcodeOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Segmented, Space, message } from "antd";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  getSelf,
  newSelfCard,
  putSelf,
  type SelfCard,
} from "@/lib/contactsDb";
import { selfToVcard } from "@/lib/exporters";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "qr" | "edit";

export default function MyCard({ open, onClose }: Props) {
  const [form] = Form.useForm<SelfCard>();
  const [self, setSelf] = useState<SelfCard>(newSelfCard());
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const stored = await getSelf();
      const next = stored ?? newSelfCard();
      setSelf(next);
      form.setFieldsValue(next);
      // If the user hasn't entered anything yet, land them on Edit so they
      // see something useful instead of an empty QR placeholder.
      setView(stored && stored.name ? "qr" : "edit");
    })();
  }, [open, form]);

  // Re-render QR whenever the saved self-card changes. Using toDataURL +
  // <img> instead of toCanvas + ref dodges Drawer/render-cycle ref races
  // (the canvas ref was sometimes null at effect time, leaving the QR
  // blank).
  useEffect(() => {
    if (!self.name) {
      setQrDataUrl(null);
      return;
    }
    const vcard = selfToVcard(self);
    if (vcard.length > 800) {
      message.warning(
        "Your card is long — QR may be hard to scan. Try shortening one of the fields.",
      );
    }
    let cancelled = false;
    QRCode.toDataURL(vcard, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          message.error("Could not generate QR code.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [self]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const next: SelfCard = { ...self, ...values, updatedAt: Date.now() };
      await putSelf(next);
      setSelf(next);
      message.success("Saved");
      // After saving, snap to QR view so the demo flow is one-step.
      setView("qr");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleView = (next: View) => {
    if (next === "qr" && view === "edit") {
      // Persist whatever's in the form before flipping to QR — otherwise the
      // QR would still encode the previously saved data.
      void (async () => {
        try {
          const values = await form.validateFields();
          const merged: SelfCard = { ...self, ...values, updatedAt: Date.now() };
          await putSelf(merged);
          setSelf(merged);
        } catch {
          // validation failed — keep QR rendering whatever was saved before
        }
        setView("qr");
      })();
      return;
    }
    setView(next);
  };

  const hasName = !!self.name;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width="100%"
      title="My Card"
      styles={{ body: { maxWidth: 560, margin: "0 auto", width: "100%" } }}
    >
      <Segmented<View>
        block
        value={view}
        onChange={(v) => handleToggleView(v as View)}
        options={[
          { label: "Show QR", value: "qr", icon: <QrcodeOutlined /> },
          { label: "Edit info", value: "edit", icon: <EditOutlined /> },
        ]}
        style={{ marginBottom: 16 }}
      />

      {view === "qr" ? (
        <div className="cc-mycard-qr-view">
          {hasName && qrDataUrl ? (
            <>
              <div className="cc-mycard-qr-wrap">
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${self.name}`}
                  className="cc-mycard-qr-img"
                />
              </div>
              <div className="cc-mycard-qr-name">{self.name}</div>
              {self.position && (
                <div className="cc-mycard-qr-sub">
                  {self.position}
                  {self.company ? ` · ${self.company}` : ""}
                </div>
              )}
              <div className="cc-mycard-qr-help">
                Have them point their phone camera at the code — or scan it
                inside Contact Capture to save you there instead.
              </div>
            </>
          ) : (
            <div className="cc-mycard-qr-empty">
              <p style={{ marginTop: 0 }}>
                Add your name and details first — then anyone with a phone
                camera can save you in one tap.
              </p>
              <Button type="primary" size="large" onClick={() => setView("edit")}>
                Set up my card
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Form form={form} layout="vertical" requiredMark={false} initialValues={self}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Jane Doe" autoComplete="name" />
          </Form.Item>
          <Form.Item label="Position" name="position">
            <Input placeholder="Founder, Sales, VP Marketing…" autoComplete="organization-title" />
          </Form.Item>
          <Form.Item label="Company" name="company">
            <Input placeholder="Acme Inc." autoComplete="organization" />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input placeholder="jane@acme.com" type="email" autoComplete="email" />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input placeholder="+1 555 123 4567" autoComplete="tel" />
          </Form.Item>
          <Form.Item label="Website" name="website">
            <Input placeholder="acme.com" autoComplete="url" />
          </Form.Item>

          <Space style={{ width: "100%" }}>
            <Button type="primary" size="large" onClick={handleSave} loading={saving}>
              Save & show QR
            </Button>
          </Space>
        </Form>
      )}
    </Drawer>
  );
}
