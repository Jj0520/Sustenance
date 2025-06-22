# Sustenance - Donation Platform

A full-stack donation platform that connects donors with NGOs, built with React.js and Node.js.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Gemini API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Sustenance_Cloud_Migration
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the server directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   PORT=5001
   ```

   For local development, the client will automatically use `http://localhost:5001` as the API URL.

4. **Run the application**
   ```bash
   # From the root directory
   npm run dev
   ```

   This will start both the client (port 3002) and server (port 5001).

## 🌐 Deployment to Vercel

### Step 1: Push to GitHub

1. **Initialize Git (if not already done)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create a GitHub repository**
   - Go to GitHub and create a new repository
   - Don't initialize with README, .gitignore, or license

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with your GitHub account
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   In Vercel dashboard, go to your project settings and add these environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   NODE_ENV=production
   ```

3. **Update CORS Settings**
   After deployment, update the CORS origin in `server/server.js` to your Vercel domain:
   ```javascript
   origin: process.env.NODE_ENV === 'production' 
     ? ['https://your-actual-vercel-domain.vercel.app'] 
     : ['http://localhost:3002']
   ```

4. **Deploy**
   - Vercel will automatically deploy from your main branch
   - Future pushes to main will trigger automatic deployments

## 🔧 Configuration Files

- `vercel.json` - Vercel deployment configuration
- `client/src/config/api.js` - API URL configuration
- `.env.example` - Example environment variables

## 🗄️ Database

The application uses PostgreSQL. Make sure your database is accessible from Vercel (consider using services like Neon, Supabase, or Railway for hosted PostgreSQL).

## 📁 Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
├── vercel.json      # Vercel deployment config
└── package.json     # Root package.json with build scripts
```

## 🛠️ Technology Stack

- **Frontend**: React.js, React Router, Axios
- **Backend**: Node.js, Express.js, PostgreSQL
- **Authentication**: JWT
- **AI**: Google Gemini API
- **Blockchain**: Aptos
- **Deployment**: Vercel

## 📚 Features

- User authentication and authorization
- Donation management (monetary and goods)
- NGO recipient management
- Admin dashboard with analytics
- AI-powered chatbot
- Social feed functionality
- Certificate generation
- Transaction signing with Aptos blockchain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 