# CabChat Simulator - Changelog

## [Unreleased] - Minimap & Transamerica Pyramid Improvements

### Removed
- **Minimap Indicators**: Removed pulsing blue current-position circle and flashing red destination dot for a cleaner interface.

### Changed
- **Transamerica Pyramid Model**: Rebuilt landmark with a slender tapering pyramid body, elevator/stair wings, light quartz facade, and proportionally sized aluminum-paneled spire for improved realism.

---

## [Unreleased] - San Francisco Authenticity & Visual Polish

### Added
- **SF Environmental Details**: Authentic San Francisco elements throughout the 3D world
  - **Bay Water Areas**: Added SF Bay water around city edges (north and east)
  - **Cable Car Tracks**: Brown tracks on major streets (iconic SF transportation)
  - **SF Hills**: Subtle terrain elevation for Nob Hill, Russian Hill, and Twin Peaks areas
  - **Fire Hydrants**: Red fire hydrants scattered throughout streets
  - **SF Lamp Posts**: Period-appropriate street lighting with spherical heads
  - **Bay Windows**: Protruding bay windows on select buildings (classic SF architecture)

### Enhanced
- **Building Architecture**: SF-inspired color palette and styles
  - Victorian house colors (beige, plum for Painted Ladies)
  - Modern glass buildings (steel blue, alice blue)
  - Brownstone and tan buildings
  - Dark sea green accent color
- **Traffic Light Functionality**: Properly aligned colored lights (red, yellow, green) within traffic signal boxes
- **Atmospheric Environment**: 
  - SF-style sky color (light steel blue representing marine layer)
  - Ground changed to SF hills brown color
  - Reduced fog distance for better landmark visibility

### Fixed
- **Visual Flickering**: Eliminated ground and sky flickering by removing transparency and adjusting positioning
- **Shadow Optimization**: Significantly reduced shadow intensity and coverage
  - Increased ambient light from 0.4 to 0.7
  - Reduced directional light intensity from 1.0 to 0.6
  - Disabled shadows on ground and most buildings
  - Added shadow bias to prevent shadow acne
- **Performance**: Reduced shadow map size and processing for smoother rendering

### Improved
- **SF Recognition**: City now immediately identifiable as San Francisco through authentic elements
- **Visual Clarity**: Softer lighting provides 3D depth without being distracting
- **Landmark Visibility**: Environmental details complement rather than compete with major landmarks

## [Unreleased] - Chat Interface Cleanup & Navigation Polish

### Removed
- **Chat Status Elements**: Eliminated "🎤 Listening..." text and "You're now speaking with Stacy" status indicators for cleaner interface
- **Message Timestamps**: Removed all timestamps (14:28, 14:29, etc.) from chat messages for more compact conversation view
- **Middle Screen Hint**: Deleted floating "You're now speaking with Stacy" indicator for less UI clutter

### Enhanced
- **Minimap Navigation**: Updated GPS route to follow street grid instead of diagonal line
  - Route now follows realistic L-shaped path through city blocks
  - Maintains animated green dashed line styling
  - Looks like actual turn-by-turn navigation
- **Traffic Light Visibility**: Restored colored lights (red, yellow, green) to traffic signals
  - Green light emphasized with higher opacity (0.8) for active state
  - Red and yellow lights visible at moderate opacity (0.3)
  - Maintains simplified single traffic light per intersection

### Improved
- **Chat Compactness**: Streamlined conversation display focuses on message content
- **Navigation Realism**: Route visualization now appears followable on actual streets
- **Visual Clarity**: Reduced interface elements improve focus on core functionality

## [Unreleased] - 3D World Simplification & UI Polish

### Changed
- **Building Density**: Reduced generic buildings from 90% to 40% spawn rate for better landmark visibility
- **Traffic Lights**: Simplified from 4 lights per intersection to 1 central traffic light
- **Chat Window**: Extended to 75% of screen height for improved conversation viewing
- **Current Rider Box**: Increased size by 25% with larger avatar (60px) and enhanced typography

### Enhanced
- **Landmark Visibility**: Cleaner 3D world makes San Francisco landmarks more prominent and recognizable
- **UI Clarity**: Larger rider avatars and improved spacing for better user experience
- **Performance**: Fewer objects in scene improves rendering performance

## [Unreleased] - Demo Layout Optimization & San Francisco Integration

### Added
- **Trip Context Header**: Added "This Trip" subheader above fare information for better context
- **San Francisco Landmarks**: Integrated 5 iconic SF landmarks into the 3D world:
  - **Golden Gate Bridge**: Orange suspension bridge with towers and cables (Northwest)
  - **Transamerica Pyramid**: White pyramid-shaped skyscraper with spire (Financial District)
  - **Coit Tower**: Cylindrical beige tower with viewing platform (North Beach)  
  - **Ferry Building**: Tan building with clock tower and green dome (Waterfront)
  - **Salesforce Tower**: Modern silver tower with animated LED crown (SOMA)

### Changed
- **GPS Directions**: Moved from left side to top-center for better driver visibility
- **Current Rider Info**: Repositioned below mobile control buttons for logical grouping
- **Chat Panel**: 
  - Moved to vertically centered position (12.5vh from top)
  - Increased size by 25% (420px width, 75vh height)
  - Positioned to avoid blocking top buttons and minimap
- **Mobile Controls**: Removed chat button for cleaner interface

### Enhanced
- **3D World Geography**: Landmarks positioned with realistic spatial relationships
- **Visual Recognition**: City now identifiable as San Francisco from aerial view
- **Landmark Details**:
  - Golden Gate Bridge: International Orange color with suspension cables
  - Transamerica Pyramid: Distinctive pyramid geometry with spire
  - Coit Tower: Cream-colored cylinder with platform
  - Ferry Building: Clock face and green copper dome
  - Salesforce Tower: Animated LED crown effect

### Technical Implementation
- **Scene.js Integration**: 
  - Added `createLandmarks()` method to scene generation
  - Individual creation methods for each landmark
  - Grid-based positioning system for accurate placement
  - Custom materials and geometries for landmark recognition
- **CSS Layout Optimization**:
  - GPS panel repositioning with z-index management
  - Chat panel responsive positioning
  - Trip header styling integration

### Performance Considerations
- Optimized landmark geometry for smooth rendering
- Maintained existing shadow system limits
- Efficient landmark placement within grid system

## [Unreleased] - Enhanced UI for Demo Screenshots

### Added
- **Star Rating System**: Changed "Reputation" to "Rating" with 4.2 star display using gold star icons
- **Daily Bonus Progress**: Replaced "Active Missions" with "Daily Bonus" featuring progress bars for goal tracking
  - Complete 10 trips: 7/10 (70% progress)
  - Drive 50 miles: 32/50 (64% progress) 
  - Maintain 4.5+ rating: 4.2/4.5 (93% progress)
- **Current Rider Info Box**: Replaced bottom-left joystick with rider information panel
  - Displays current rider "Stacy" with circular avatar photo
  - Shows destination "→ Financial District"
  - Blue-themed styling with glow effects
- **GPS Route Visualization**: Added animated GPS route overlay to minimap
  - Flowing dashed green line showing route path
  - Pulsing blue current position marker
  - Blinking red destination marker
  - Drop shadow effects for visibility
- **Voice Interface**: Replaced text input with voice conversation UI
  - Animated microphone indicator with pulse effect
  - 10-bar waveform visualization with staggered animations
  - "Listening..." status display
  - Blue gradient styling matching chat theme

### Changed
- **Earnings Display**: Updated from $142.50 to $256
- **Button Labels**: 
  - "Brake" → "Drop Off Rider"
  - "Horn" → "Honk"
- **Chat Header**: Simplified to show just "Stacy" instead of full rider name
- **Chat Panel Height**: Constrained to 60% of viewport height with `.compact` class
- **Chat Content**: Based conversation on realistic dialogue from `/assets/sample-chat.md`
  - Seattle to SF conversation context
  - Business executive persona for Stacy
  - Discussion about tech scene and Inworld offices

### Enhanced
- **Visual Animations**: Added smooth CSS animations for all new components
  - GPS route flow animation (3s linear infinite)
  - Position marker pulse effect (2s ease-in-out)
  - Destination blink animation (1.5s ease-in-out)
  - Microphone pulse indicator (1.5s ease-in-out)
  - Waveform bars with staggered timing (1.2s ease-in-out)
- **Progress Bars**: Blue-to-green gradient fills with glow effects and smooth transitions
- **Star Rating**: Gold stars with text shadow and glow effects
- **Responsive Design**: All new components adapt to mobile layouts

### Technical Implementation
- **HTML Structure**: Added semantic markup for all new UI components
- **CSS Styling**: 
  - 150+ lines of new CSS for component styling
  - Gradient backgrounds with rgba transparency
  - Box shadows and backdrop filters for depth
  - Keyframe animations for dynamic effects
- **Asset Integration**: Incorporated `stacy.jpeg` avatar and `sample-chat.md` content

## [Unreleased] - Demo Layout Optimization & San Francisco Integration

### Added
- **Trip Context Header**: Added "This Trip" subheader above fare information for better context
- **San Francisco Landmarks**: Integrated 5 iconic SF landmarks into the 3D world:
  - **Golden Gate Bridge**: Orange suspension bridge with towers and cables (Northwest)
  - **Transamerica Pyramid**: White pyramid-shaped skyscraper with spire (Financial District)
  - **Coit Tower**: Cylindrical beige tower with viewing platform (North Beach)  
  - **Ferry Building**: Tan building with clock tower and green dome (Waterfront)
  - **Salesforce Tower**: Modern silver tower with animated LED crown (SOMA)

### Changed
- **GPS Directions**: Moved from left side to top-center for better driver visibility
- **Current Rider Info**: Repositioned below mobile control buttons for logical grouping
- **Chat Panel**: 
  - Moved to vertically centered position (12.5vh from top)
  - Increased size by 25% (420px width, 75vh height)
  - Positioned to avoid blocking top buttons and minimap
- **Mobile Controls**: Removed chat button for cleaner interface

### Enhanced
- **3D World Geography**: Landmarks positioned with realistic spatial relationships
- **Visual Recognition**: City now identifiable as San Francisco from aerial view
- **Landmark Details**:
  - Golden Gate Bridge: International Orange color with suspension cables
  - Transamerica Pyramid: Distinctive pyramid geometry with spire
  - Coit Tower: Cream-colored cylinder with platform
  - Ferry Building: Clock face and green copper dome
  - Salesforce Tower: Animated LED crown effect

### Technical Implementation
- **Scene.js Integration**: 
  - Added `createLandmarks()` method to scene generation
  - Individual creation methods for each landmark
  - Grid-based positioning system for accurate placement
  - Custom materials and geometries for landmark recognition
- **CSS Layout Optimization**:
  - GPS panel repositioning with z-index management
  - Chat panel responsive positioning
  - Trip header styling integration

### Performance Considerations
- Optimized landmark geometry for smooth rendering
- Maintained existing shadow system limits
- Efficient landmark placement within grid system

### Purpose
All changes are designed for static screenshot demonstration purposes, creating a professional and visually appealing interface that showcases the application's capabilities without requiring functional implementation. The San Francisco integration adds authentic geographical context that makes the simulator immediately recognizable and engaging.