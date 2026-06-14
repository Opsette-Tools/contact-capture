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
            Contact Capture is a fast, offline-first tool for working a room — built for
            professionals who attend networking events, conferences, and mixers. Snap a
            business card or flyer, and the connection drops straight into the event you're
            at. No account, no cloud, no lost cards at the bottom of your bag.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>1. Every contact belongs to an event</Title>
          <Paragraph>
            Contacts are organized by the event where you met them. The first time you add a
            contact at a new event, you'll name the event in a quick pop-up — just the name
            is required, and it takes a couple of seconds. After that, every contact you
            capture that night drops into the same event automatically.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>2. Add a contact</Title>
          <Paragraph>
            Tap the <Text strong>+ Add</Text> button at the bottom of the screen (or the
            "Add New" tab on desktop). Take or upload a photo of a business card or flyer and
            we'll try to read the name, company, email, and phone for you. You can also skip
            the scan and enter details manually. Set a <Text strong>relationship</Text>
            (Lead, Client, or Vendor) so you remember who's who.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>3. Switch events as your night goes</Title>
          <Paragraph>
            New booth, new conference day, new mixer? Just pick a different event (or create
            one) in the event field when you add your next contact. Your connections stay
            sorted by where you met them.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>4. Save to your phone & export</Title>
          <Paragraph>
            Open any contact and tap <Text strong>Add to phone Contacts</Text> to download a
            vCard (.vcf) — opening it on iOS or Android adds the contact to your address
            book. From the contacts list, tap the download icon to export everything as a CSV
            (for spreadsheets and CRMs) or as a single multi-vCard file.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>Inside Opsette</Title>
          <Paragraph>
            Opened on its own, Contact Capture keeps everything in your browser — nothing is
            sent to any server. When you run it <Text strong>inside Opsette</Text>, an
            <Text strong> Add to Opsette</Text> button appears on each contact, so you can
            send a connection to your Opsette review inbox to become a client. See the{" "}
            <a onClick={() => navigate("/privacy")} style={{ cursor: "pointer" }}>privacy page</a> for details.
          </Paragraph>
        </Typography>

        <OpsetteFooterLogo />
      </main>
    </div>
  );
}
