# Ridge

Ridge is a social feed application with a React/Vite frontend and an Express/MongoDB API.

## Run locally

1. Install the backend dependencies from the project root:

   ```bash
   npm install
   ```

2. Install the frontend dependencies:

   ```bash
   npm install --prefix client
   ```

3. Add the required values to the root `.env` file:

   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_long_random_secret
   EMAIL_USER=your_email_address
   EMAIL_PASS=your_email_app_password
   CLIENT_URL=http://localhost:5173
   PORT=5000
   ```

   `EMAIL_USER` and `EMAIL_PASS` are used by the forgot-password email flow.

4. From the project root, start both applications:

   ```bash
   npm run dev:all
   ```

   The frontend runs at `http://localhost:5173` and the API at `http://localhost:5000`.
   Press `Ctrl+C` once to stop both processes.

## Current functionality

- Register, sign in, request a password-reset link, and reset a password.
- Post image/video stories for friends; stories expire after 24 hours.
- Browse the feed, create posts with optional local image/video uploads, edit or delete your own posts, like, comment, save, and copy a post link.
- Search for users, send and respond to friend requests, manage blocked users, and open conversations with friends.
- Read and send direct messages, with unread counts and periodic refresh while a conversation is open.
- View and mark notifications as read, and update your profile details.

Images and videos are uploaded to the local `server/uploads` folder (maximum 30 MB per file). Social sign-in providers are not configured.
