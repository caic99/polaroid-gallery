# Weekly 8 by Polaroid

An immersive web application for exploring curated photo galleries, built with React, TypeScript, and Framer Motion, using data from Polaroid's public API. This project showcases a modern, fluid user interface with a strong focus on smooth animations and a visually pleasing experience.

![Weekly 8 by Polaroid Screenshot](https://i.imgur.com/xQf2o0T.png)

## Key Features

-   **Dynamic Gallery Loading**: Fetches and displays exhibit data from a live GROQ-based API.
-   **Immersive Detail View**: A seamless transition from the gallery list to a full-screen, scrollable photo carousel.
-   **Adaptive Background**: The application's background color dynamically adapts to the palette of the currently viewed photograph.
-   **Smooth Transitions**: Utilizes Framer Motion for beautiful, shared-layout animations between views.
-   **Responsive Design**: A clean, mobile-first design that scales elegantly to desktop screens.
-   **Intuitive Navigation**: Supports keyboard (Arrow Keys, Escape), mouse, and touch gestures for navigating galleries.
-   **Deep Linking**: The app state is synced with URL parameters, allowing for shareable links directly to specific exhibits and images.
-   **Performance Optimized**: Implements lazy loading for images and uses optimized thumbnails as placeholders to ensure a fast user experience.

## Tech Stack

-   **Frontend**: [React](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **API**: GROQ (via Polaroid's public CDN)

## Project Structure

The codebase is organized to be clean, modular, and easy to navigate.

```
/
├── public/
├── src/
│   ├── components/      # Reusable React components (ExhibitCard, GallerySlide, etc.)
│   ├── services/        # API fetching and data transformation logic (api.ts)
│   ├── types/           # TypeScript type definitions for the API data (types.ts)
│   ├── utils/           # Helper functions (color interpolation, etc.)
│   ├── App.tsx          # Main application component, routing, and state management
│   ├── index.tsx        # React application entry point
│   └── ...
├── index.html           # Main HTML file
├── package.json
└── vite.config.ts       # Vite configuration
```

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/polaroid-gallery-explorer.git
    cd polaroid-gallery-explorer
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

### Building for Production

To create a production-ready build of the application:

```sh
npm run build
```

This command bundles the application into the `dist/` directory, optimized for deployment. You can preview the production build locally with `npm run preview`.

## Architectural Decisions

-   **Data Fetching**: The application fetches data from a public, but CORS-restricted, API. To overcome this, it uses a fallback chain of CORS proxies (`corsproxy.io`, `allorigins.win`) to ensure high availability of the gallery data.

-   **State Management & Routing**: Instead of a heavy routing library, the application's view state (`selectedExhibit`, `currentIndex`) is primarily driven by URL `searchParams`. This lightweight approach enables deep linking, bookmarking, and native browser back/forward navigation while keeping the state management logic centralized in the main `App` component.

-   **Animations & User Experience**: Framer Motion's `AnimatePresence` and `LayoutGroup` are used to create seamless transitions. The app avoids jarring page reloads by animating components in and out, providing a fluid, app-like experience. The dynamic background color, which interpolates between images during scrolling, further enhances the immersive feel.

-   **Performance**: To handle potentially large galleries, images are lazy-loaded by default. Images that are immediately visible or adjacent to the current view are prioritized (`loading="eager"`). Low-resolution, blurred thumbnails are used as placeholders to prevent content layout shifts and improve perceived performance.