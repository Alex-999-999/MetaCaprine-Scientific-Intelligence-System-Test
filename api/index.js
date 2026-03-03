// Vercel serverless function entry point
import expressApp from '../server/index.js';

// Export the Express app directly for Vercel
// Vercel will handle this as an ES module due to package.json "type": "module"
export default expressApp;
