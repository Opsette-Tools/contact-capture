import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ConfigProvider } from "antd";
import About from "./pages/About.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import EventPage from "./pages/EventPage.tsx";
import Events from "./pages/Events.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import People from "./pages/People.tsx";
import Privacy from "./pages/Privacy.tsx";
import { useTheme } from "@/hooks/use-theme";
import { buildAntTheme } from "@/lib/theme";

const queryClient = new QueryClient();

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

const App = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <ConfigProvider theme={buildAntTheme(isDark)}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/people" element={<People />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event/:id" element={<EventPage />} />
            <Route path="/contact/:id" element={<ContactPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;
