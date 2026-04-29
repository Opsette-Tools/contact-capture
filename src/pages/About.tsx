import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { OpsetteFooterLogo } from "@/components/opsette-share";
import { OpsetteHeader } from "@/components/opsette-header";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";

const { Title, Paragraph, Text } = Typography;

export default function About() {
  const navigate = useNavigate();
  return (
    <div className="cc-app">
      <OpsetteHeader rightExtra={<ThemeToggleButton />} />

      <main className="cc-container">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/")}
          style={{ marginBottom: 16, paddingLeft: 0 }}
        >
          Back
        </Button>

        <Title level={3} style={{ marginTop: 0 }}>
          About Contact Capture
        </Title>

        <Typography>
          <Paragraph>
            Contact Capture is a small, offline-first tool for collecting people you meet —
            at conferences, networking events, or anywhere a business card changes hands.
            Snap a photo of the card, edit what you need, and the contact's saved on your
            device. No account, no cloud.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>1. Add a contact</Title>
          <Paragraph>
            Tap the <Text strong>+ Add</Text> button at the bottom of the screen (or the
            "Add New" tab on desktop). Take or upload a photo of a business card and we'll
            try to read the name, company, email, and phone for you. You can also skip the
            scan and enter details manually.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>2. Link to an event (optional)</Title>
          <Paragraph>
            On the contact form, click <Text strong>+ Link to event</Text> to attach the
            contact to a specific event you've created. Skip it if you didn't meet them at
            an event — events are never required.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>3. Save to your phone</Title>
          <Paragraph>
            Open any contact and tap <Text strong>Save to phone</Text> to download a vCard
            (.vcf) file. Opening that file on iOS or Android prompts you to add the contact
            to your phone's address book.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>4. Export your collection</Title>
          <Paragraph>
            From the contacts list, tap the download icon to export everything as a CSV
            (for spreadsheets and CRMs) or as a single multi-vCard file.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>Your data stays local</Title>
          <Paragraph>
            Everything's stored in your browser's IndexedDB. Nothing is sent to any server.
            See the <a onClick={() => navigate("/privacy")} style={{ cursor: "pointer" }}>privacy page</a> for details.
          </Paragraph>
        </Typography>

        <OpsetteFooterLogo />
      </main>
    </div>
  );
}
