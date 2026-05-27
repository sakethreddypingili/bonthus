# Modular Functional Reference: src (root)
> Path: `/src`

This reference lists all explicitly named components and functions within the root `src/` directory, sorted alphabetically.

| Symbol Name | File Path | Type | Description |
| :--- | :--- | :--- | :--- |
| `App` | `App.js` | Component (Default) | Root application component managing global state, authentication, and routing. |
| `clearCachedProfile` | `App.js` | Function | Removes the user profile from local storage. |
| `fetchProfile` | `App.js` | Function | Retrieves the authenticated user's profile and store data from Supabase. |
| `readCachedProfile` | `App.js` | Function | Attempts to retrieve a valid user profile from local storage. |
| `setFavicon` | `index.js` | Function | Dynamically sets the browser's favicon element in the document head. |
| `themeSettings` | `theme.js` | Function | Generates the Material UI theme configuration object based on the current mode. |
| `tokens` | `theme.js` | Function | Provides a mapping of brand color tokens for light and dark modes. |
| `useMode` | `theme.js` | Custom Hook | Hook for managing the application's color mode and theme instance. |
| `writeCachedProfile` | `App.js` | Function | Persists the user profile to local storage for faster subsequent loads. |
