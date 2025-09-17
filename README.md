This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# 📚 BookLever - Personal Ebook Library

**Tagline**: "Your Personal Cloud Ebook Library with Intelligent Reading & Knowledge Retention"

[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0+-38B2AC)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black)](https://vercel.com/)

## 🎯 Overview

BookLever is a free personal cloud ebook library that helps you build, organize, and access your digital book collection from anywhere. Whether you're reading on your computer or mobile device, BookLever keeps your entire library synchronized and helps you retain knowledge through intelligent highlighting and review systems.

### ✨ Key Features

- 📚 **Build Your Library**: Upload and organize thousands of EPUB and PDF books
- ☁️ **Multi-Cloud Storage**: Access your entire library from any device, anywhere (42GB free storage)
- 🎨 **Intelligent Reading**: Create color-coded highlights with notes
- 🔄 **Cross-Device Sync**: Your library and highlights sync automatically across all devices
- 🧠 **Knowledge Retention**: Daily review system for better memory
- 📊 **Library Analytics**: Track your reading progress and statistics
- 📤 **Export Everything**: Export your insights in multiple formats
- 🌐 **Smart Storage**: Automatically expand to additional cloud providers when needed

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm/yarn
- Google Cloud Console account (for Google Drive)
- Optional: Mega, Microsoft, Dropbox accounts for additional storage

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/booklever.git
cd booklever

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your OAuth credentials

# Run development server
npm run dev
```

### Environment Variables

```bash
# .env.local
# Google Drive (Primary Storage)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
DRIVE_API_KEY=your_drive_api_key

# Optional Secondary Storage
MEGA_API_KEY=your_mega_api_key
ONEDRIVE_CLIENT_ID=your_onedrive_client_id
DROPBOX_CLIENT_ID=your_dropbox_client_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🌐 Multi-Cloud Storage

### Primary Storage: Google Drive (15GB, 2000+ books)
- **Default Storage**: All books start here
- **System Files**: Library index, settings, and metadata
- **Reliability**: Most trusted and stable platform

### Optional Secondary Storage (27GB additional)
- **Mega (20GB)**: Largest additional storage
- **OneDrive (5GB)**: Microsoft ecosystem integration
- **Dropbox (2GB)**: Quick access and sharing

### Total Capacity: 42GB Free Storage

## 🏗️ Architecture

- **Frontend**: Next.js 15+ with App Router
- **Styling**: Tailwind CSS
- **Storage**: Multi-cloud with Google Drive primary
- **Authentication**: Multi-provider OAuth 2.0
- **Deployment**: Vercel (free tier)

## 📖 Documentation

- [Project Understanding](docs/PROJECT_UNDERSTANDING.md) - Core vision and architecture
- [Requirements](docs/REQUIREMENTS.md) - Detailed functional requirements
- [Technical Specification](docs/SPECIFICATION.md) - Implementation guidelines
- [Developer Documentation](docs/DEVELOPER_DOCUMENTATION.md) - Setup and development guide
- [API Documentation](docs/API_DOCUMENTATION.md) - API reference
- [User Documentation](docs/USER_DOCUMENTATION.md) - User guide
- [Architecture Decisions](docs/ARCHITECTURE_DECISIONS_RECORD.md) - ADR tracking
- [Problems & Solutions](docs/POTENTIAL_PROBLEMS_AND_SOLUTIONS.md) - Risk analysis

## 🛠️ Development

### Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + useReducer
- **Storage**: IndexedDB (local) + Multi-cloud (Google Drive, Mega, OneDrive, Dropbox)
- **Authentication**: Multi-provider OAuth 2.0
- **Deployment**: Vercel

### Project Structure

```
booklever/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Utility libraries
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript definitions
├── docs/                   # Documentation
└── public/                 # Static assets
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## 🎯 Target Audience

BookLever is perfect for:
- **Students** building personal libraries of textbooks and research papers
- **Professionals** organizing technical documentation and resources
- **Researchers** collecting and managing insights from multiple sources
- **Book Lovers** who want to build a personal cloud library
- **Knowledge Workers** building comprehensive personal knowledge bases

## 📊 Storage Strategy

### Google Drive Primary (15GB, 2000+ books)
- All books start here
- System files and metadata
- Most reliable platform

### Optional Expansion (27GB additional)
- Connect additional providers only when needed
- Automatic book distribution
- Unified library view

### Smart Features
- Progressive expansion
- Storage monitoring
- One-click provider connection
- Cross-provider migration

## 🔒 Privacy & Security

- **User Control**: You own your data
- **Local Processing**: Highlights processed locally
- **Transparent**: Clear data usage policies
- **Export**: Easy data export and deletion

## 🚀 Deployment

The app is deployed on Vercel with automatic deployments from the main branch.

**Live Demo**: [booklever.vercel.app](https://booklever.vercel.app)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Email**: [help@booklever.com](mailto:help@booklever.com)
- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/booklever/issues)

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [Vercel](https://vercel.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**BookLever** - Your Personal Cloud Ebook Library with Intelligent Reading & Knowledge Retention
