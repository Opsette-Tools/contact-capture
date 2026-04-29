import { ArrowLeftOutlined, ContactsOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { OpsetteFooterLogo, ShareAppButton } from "@/components/opsette-share";

const { Title, Paragraph, Text } = Typography;

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="cc-app">
      <header className="cc-header">
        <div className="cc-header-inner">
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span className="cc-header-icon">
              <ContactsOutlined />
            </span>
            <h1 className="cc-header-title">Contact Capture</h1>
          </button>
          <div className="cc-header-actions">
            <ShareAppButton />
          </div>
        </div>
      </header>

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

        <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
          Privacy Policy
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Last updated: April 28, 2026
        </Text>

        <Typography style={{ marginTop: 24 }}>
          <Title level={5} style={{ marginBottom: 6 }}>No data collection</Title>
          <Paragraph>
            Contact Capture does not collect, transmit, or store any personal information on
            external servers. All contacts and events you enter stay entirely on your device
            in your browser's IndexedDB storage.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>Local storage only</Title>
          <Paragraph>
            Contact information, event records, and photos used for OCR are processed locally
            in your browser. Card images are not uploaded — text recognition runs on-device
            via tesseract.js. Clearing your browser data will remove everything.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>Exports</Title>
          <Paragraph>
            CSV and vCard exports generate files directly in your browser and download to
            your device. No data is transmitted in the process.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>No cookies or tracking</Title>
          <Paragraph>
            Contact Capture does not use cookies, analytics, or any third-party tracking
            services. There are no ads and no account creation required.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>No account required</Title>
          <Paragraph>
            You do not need to create an account or provide any credentials to use Contact
            Capture. The app works entirely offline after the initial page load.
          </Paragraph>

          <Title level={5} style={{ marginBottom: 6 }}>Contact</Title>
          <Paragraph>
            If you have questions about this privacy policy, you can reach out via the
            project's GitHub repository.
          </Paragraph>
        </Typography>

        <OpsetteFooterLogo />
      </main>
    </div>
  );
}
