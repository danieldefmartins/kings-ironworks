import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Portfolio from "./pages/Portfolio";
import Locations from "./pages/Locations";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FireEscapeLanding from "./pages/FireEscapeLanding";
import StructuralSteelLanding from "./pages/StructuralSteelLanding";
import BuildingRestorationLanding from "./pages/BuildingRestorationLanding";
import CapeCodeLanding from "./pages/CapeCodeLanding";
import WorcesterLanding from "./pages/WorcesterLanding";
import MiamiLanding from "./pages/MiamiLanding";
import NewHampshireLanding from "./pages/NewHampshireLanding";
import MaineLanding from "./pages/MaineLanding";
import RhodeIslandLanding from "./pages/RhodeIslandLanding";
import NewYorkLanding from "./pages/NewYorkLanding";
import ConnecticutLanding from "./pages/ConnecticutLanding";
import VermontLanding from "./pages/VermontLanding";
import InteriorRailingLanding from "./pages/InteriorRailingLanding";
import ExteriorRailingLanding from "./pages/ExteriorRailingLanding";
import FenceLanding from "./pages/FenceLanding";
import BalconyLanding from "./pages/BalconyLanding";
import CableRailingLanding from "./pages/CableRailingLanding";
import DeckRailingLanding from "./pages/DeckRailingLanding";
import GateLanding from "./pages/GateLanding";
import HandrailLanding from "./pages/HandrailLanding";
import WindowLanding from "./pages/WindowLanding";
import WindowWellLanding from "./pages/WindowWellLanding";
import StickyMobileCTA from "./components/StickyMobileCTA";
import GHLChatWidget from "./components/GHLChatWidget";
import GeoRedirect from "./components/GeoRedirect";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CustomIronworkLanding from "./pages/CustomIronworkLanding";
import FacilityLanding from "./pages/FacilityLanding";

function Router() {
  const [location] = useLocation();
  
  const isFirstLoad = useRef(true);

  // Scroll to top + send gtag page_view on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    // Skip first load — gtag config already fires the initial page_view
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location,
        page_location: window.location.origin + location,
      });
    }
  }, [location]);
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/fire-escape" component={FireEscapeLanding} />
      <Route path="/structural-steel" component={StructuralSteelLanding} />
      <Route path="/building-restoration" component={BuildingRestorationLanding} />
      <Route path="/interior-railing" component={InteriorRailingLanding} />
      <Route path="/exterior-railing" component={ExteriorRailingLanding} />
      <Route path="/fence" component={FenceLanding} />
      <Route path="/balcony" component={BalconyLanding} />
      <Route path="/cable-railing" component={CableRailingLanding} />
      <Route path="/deck-railing" component={DeckRailingLanding} />
      <Route path="/gate" component={GateLanding} />
      <Route path="/handrail" component={HandrailLanding} />
      <Route path="/window" component={WindowLanding} />
      <Route path="/window-well" component={WindowWellLanding} />
      <Route path="/custom-ironwork" component={CustomIronworkLanding} />
      <Route path="/our-facility" component={FacilityLanding} />
      <Route path="/cape-cod" component={CapeCodeLanding} />
      <Route path="/worcester" component={WorcesterLanding} />
      <Route path="/miami" component={MiamiLanding} />
      <Route path="/new-hampshire" component={NewHampshireLanding} />
      <Route path="/maine" component={MaineLanding} />
      <Route path="/rhode-island" component={RhodeIslandLanding} />
      <Route path="/new-york" component={NewYorkLanding} />
      <Route path="/connecticut" component={ConnecticutLanding} />
      <Route path="/vermont" component={VermontLanding} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/blog" component={Blog} />
      <Route path="/portfolio/:category" component={Portfolio} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/locations" component={Locations} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <GeoRedirect />
          <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
            {/* Navigation */}
            <Navigation />

            {/* Main Content */}
            <main className="flex-1 pt-16 lg:pt-20">
              <Router />
              <Footer />
            </main>

            {/* Sticky Mobile CTA - Lead Generation Optimization */}
            <StickyMobileCTA />

            {/* GHL Chat Widget - Real-time SMS/Email Communication */}
            <GHLChatWidget />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
