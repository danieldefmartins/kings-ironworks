import { Button } from "@/components/ui/button";
import { useState } from "react";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Portfolio Gallery - Real project photos organized by category
 */

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "ALL PROJECTS" },
    { id: "fire-escape", label: "FIRE ESCAPES" },
    { id: "gates", label: "GATES" },
    { id: "railings", label: "RAILINGS" },
    { id: "restoration", label: "RESTORATION" }
  ];

  const projects = [
    // Fire Escapes
    { category: "fire-escape", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/VrmKyMuovdgoFRfz.JPG", title: "Fire Escape Installation", description: "Multi-story fire escape system" },
    { category: "fire-escape", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/PmBUKqXwdDkeqflj.JPG", title: "Fire Escape Repair", description: "Structural reinforcement and certification" },
    { category: "fire-escape", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/LIIMwNaIvkbuwmQE.JPG", title: "Commercial Fire Escape", description: "Code-compliant installation" },
    { category: "fire-escape", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/YgqFSongHOumLnae.JPG", title: "Fire Escape System", description: "Complete installation with landing" },
    { category: "fire-escape", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/aqPLHeShxXujREPn.JPG", title: "Fire Escape Detail", description: "Precision welding and fabrication" },
    { category: "fire-escape", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/jypAuoqruUncOLCs.JPG", title: "Fire Escape Platform", description: "Safety-rated platform installation" },
    
    // Gates
    { category: "gates", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/ldKpYAFGAsEGkCVX.JPG", title: "Ornamental Gate", description: "Custom wrought iron design" },
    { category: "gates", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/aoFXjvosIbfREama.JPG", title: "Estate Gate", description: "Hand-forged decorative ironwork" },
    { category: "gates", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/AzTrmVJOTgNkaNYM.JPG", title: "Security Gate", description: "Functional and elegant design" },
    { category: "gates", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/ydWQkwicmrXamlMe.JPG", title: "Garden Gate", description: "Traditional ironwork craftsmanship" },
    { category: "gates", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/JjzdorsfDKYfzhbn.JPG", title: "Driveway Gate", description: "Heavy-duty automated gate system" },
    { category: "gates", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/eXGgruXrInmeQsTe.JPG", title: "Pedestrian Gate", description: "Decorative entry gate" },
    
    // Interior Railings
    { category: "railings", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/apLcldtAeVXzDTCh.JPG", title: "Interior Staircase", description: "Custom iron railing system" },
    { category: "railings", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/YrJVPkpgGfMkWRdT.JPG", title: "Spiral Staircase", description: "Elegant curved railing" },
    { category: "railings", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/qOPbckSMBFnciBif.JPG", title: "Modern Railing", description: "Contemporary design with traditional craft" },
    { category: "railings", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/jSJklBUsKvwOXBaZ.JPG", title: "Handrail System", description: "Code-compliant residential railing" },
    
    // Exterior Railings
    { category: "railings", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/KVrQsNoDvGzMAnwj.JPG", title: "Exterior Railing", description: "Weather-resistant outdoor system" },
    { category: "railings", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/BtcNBKAOOIKUZnLV.JPG", title: "Deck Railing", description: "Durable powder-coated finish" },
    { category: "railings", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/gujHFKlEnadUYTxL.JPG", title: "Porch Railing", description: "Classic New England style" },
    { category: "railings", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/IrppZGXOKBxchPDP.JPG", title: "Balcony Railing", description: "Ornamental exterior ironwork" },
    
    // Restoration
    { category: "restoration", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/FXhStnQxPmvbQEEX.JPG", title: "Historic Restoration", description: "Period-accurate ironwork replication" },
    { category: "restoration", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/yxcuIXYueJOkJGhy.JPG", title: "Brownstone Restoration", description: "Boston South End project" },
    { category: "restoration", src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/kwzQFqZjMRfztVnH.jpg", title: "Beacon Hill Restoration", description: "Custom historic replication" }
  ];

  const filteredProjects = activeCategory === "all" 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center bg-sidebar text-sidebar-foreground">
        <div className="container">
          <h1 className="text-display text-5xl md:text-7xl mb-6">OUR PORTFOLIO</h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            20+ years of exceptional ironwork across Boston and beyond. Over 500 projects completed.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-8">
        <div className="container">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-3 font-display font-bold text-sm tracking-wider thick-border transition-all ${
                  activeCategory === cat.id
                    ? "bg-accent-foreground text-accent"
                    : "bg-transparent border-2 border-accent-foreground hover:bg-accent-foreground/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <div key={index} className="group relative overflow-hidden">
                <img
                  src={project.src}
                  alt={project.title}
                  className="w-full h-[400px] object-cover border-8 border-border group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sidebar/95 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 border-8 border-transparent group-hover:border-accent">
                  <div>
                    <h3 className="text-heading text-xl text-sidebar-foreground mb-2">
                      {project.title}
                    </h3>
                    <p className="text-sidebar-foreground/80 text-sm">
                      {project.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-20">
              <p className="text-2xl text-muted-foreground">No projects found in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container text-center">
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            READY TO START YOUR PROJECT?
          </h2>
          <p className="text-xl text-sidebar-foreground/80 mb-8 max-w-2xl mx-auto">
            From fire escapes to custom ornamental ironwork, we bring 20+ years of expertise to every project.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contact">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 thick-border">
                GET FREE QUOTE
              </Button>
            </a>
            <a href="tel:8578881468">
              <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                CALL (857) 888-1468
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
