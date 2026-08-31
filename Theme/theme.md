Create a full-screen smart kiosk and family entertainment dashboard web application named "Dory - Family Hub", optimized for a 10.1-inch Raspberry Pi touchscreen (16:10 or 16:9 landscape aspect ratio).

### 🎨 Visual Theme & Style Guide:
1. **Design Concept:** 
   - Playful aquatic Frosted Glassmorphism inspired by Disney's *Finding Nemo* and *Finding Dory*.
   - Translucent frosted glass widgets floating over a vibrant, cartoon-style underwater coral reef background (turquoise ocean depths, golden sand floor, colorful coral, and soft sunlight caustics).

2. **Color Palette:**
   - **Glass Panels:** `rgba(255, 255, 255, 0.22)` to `rgba(255, 255, 255, 0.35)` with `backdrop-filter: blur(16px) saturate(180%)`.
   - **Borders:** Thin light borders (`1.5px solid rgba(255, 255, 255, 0.55)`).
   - **Card Shadows:** `box-shadow: 0 8px 32px 0 rgba(0, 31, 63, 0.25)`.
   - **Primary Text:** Crisp pure white (`#FFFFFF`) with subtle text-shadow for scannability over vibrant backgrounds.
   - **Secondary Text / Subtitles:** Soft aqua/ice blue (`#D6F4FF`).
   - **Accents & Active States:** Vivid Dory-blue (`#0D70EA`), tang yellow (`#FFD13B`), and coral orange (`#FF6B57`).
   - **Toggles / Status Indicators:** Glowing green (`#2ECC71`) for "ON" and muted slate (`#7F8C8D`) for "OFF".

3. **Typography & Layout:**
   - **Font:** Friendly, modern rounded sans-serif (e.g., `Nunito`, `Quicksand`, or `Poppins`).
   - **Touch Target Size:** Extra-large touch-friendly buttons and toggles (minimum 48px × 48px) with rounded squircle corners (`border-radius: 20px` to `24px`).
   - **Layout Grid:** 3-column dashboard arrangement:
     - **Left Column:** Room Temperature widget (`22°C` with large thermometer icon), Family Calendar / Schedule list.
     - **Center Hero Column:** Large featured framed card displaying the family cartoon portrait in front of the Galata Tower landmark with a coral border, sitting above a dynamic Media Control player (Playing: *Finding Nemo Soundtrack*).
     - **Right Column:** Smart Lights IoT control switches (Living Room, Kitchen), Quick Photo Album previews, and active User Profile tile.
     - **Bottom Navigation Dock:** Floating frosted pill bar with large icon buttons for `Settings`, `Home`, and `Media Hub`.

4. **App Branding & Assets:**
   - **App Name:** "Dory - Family Hub"
   - **App Icon:** Vibrant circular/squircle icon featuring Dory with the Galata Tower and sunlit reef in the background.
   - **Family Portrait Integration:** Use the provided family photo (rendered in an illustrated/cartoon storybook style in front of the Galata Tower) as the primary centerpiece hero image and small profile avatars.

// tailwind.config.js snippet
module.exports = {
  theme: {
    extend: {
      colors: {
        'dory-blue': '#0D70EA',
        'dory-yellow': '#FFD13B',
        'reef-coral': '#FF6B57',
        'reef-sand': '#F4D06F',
      },
      backdropBlur: {
        glass: '18px',
      },
      borderRadius: {
        'kiosk': '22px',
      }
    }
  }
}