import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
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
import StickyMobileCTA from "./components/StickyMobileCTA";

function Router() {
  const [location] = useLocation();
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/fire-escape" component={FireEscapeLanding} />
      <Route path="/structural-steel" component={StructuralSteelLanding} />
      <Route path="/building-restoration" component={BuildingRestorationLanding} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/locations" component={Locations} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
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
          <div className="flex min-h-screen">
            {/* Navigation */}
            <Navigation />
            
            {/* Main Content - offset for desktop sidebar */}
            <main className="flex-1 lg:ml-20 pt-16 lg:pt-0">
              <Router />
              <Footer />
            </main>
            
            {/* Sticky Mobile CTA - Lead Generation Optimization */}
            <StickyMobileCTA />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
